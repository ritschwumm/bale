import os				from "node:os";
import fs				from "node:fs";
import fsPromises		from "node:fs/promises";

import { Arrays }		from "bale/util/arrays";
import { MessageError }	from "bale/util/messageError";

import { FsUtil }		from "bale/node/fsUtil";
import { FsDirent }		from "bale/node/fsDirent";
import { FsPath }		from "bale/node/fsPath";
import { FsLabel }		from "bale/node/fsLabel";

import { Bom }			from "bale/lib/bom";
import { ContentFile }	from "bale/lib/contentFile";
import { ContentDir }	from "bale/lib/contentDir";
import { Logger }		from "bale/lib/logger";

// permissions for target directories
const directoryMode	= 0o755;

export namespace Synchronization {
	export const synchronize	= async (sourceBasePath:FsPath, targetBasePath:FsPath, bom:Bom, verbose:boolean, precise:boolean):Promise<void>	=> {
		const outputDirs	= compileOutputDirs(sourceBasePath, targetBasePath, bom);
		await fsPromises.mkdir(targetBasePath, { recursive: true, mode: directoryMode });
		const logger	= verbose ? Logger.debug : Logger.silent;
		await syncOutputDirs(outputDirs, precise, logger);
	};
};

//-----------------------------------------------------------------------------
//## sync

// maps a target directory to its contents
type OutputDirs	= Map<FsPath, OutputDir>;

// contents of an OutputDir:
// each name can either represent a subdirectory (null) or a source file (not null)
type OutputDir	= Map<FsLabel, FsPath|null>;

const compileOutputDirs	= (sourceBasePath:FsPath, targetBasePath:FsPath, bom:Bom):OutputDirs	=> {
	// the target shall be empty
	if (bom.length === 0)	return new Map([ [ targetBasePath, new Map() ] ]);

	// parent dirs always come before child dirs
	const outputDirs:OutputDirs	= new Map();

	// mutates outputDirs
	const provideOutputDir	= (outputBasePath:ContentDir):OutputDir	=> {
		const targetFullPath	= FsPath.join(targetBasePath, ContentDir.toFsPath(outputBasePath));
		const found	= outputDirs.get(targetFullPath);
		if (found !== undefined)	return found;

		// insert our name into the parent OutputDir
		// has to be done before adding ourselves to outputDirs to ensure correct ordering
		if (outputBasePath !== ContentDir.current) {
			const targetDirName		= ContentDir.dirname(outputBasePath);
			const targetBaseName	= ContentDir.basename(outputBasePath);

			const parentOutputDir	= provideOutputDir(targetDirName);
			const previous			= parentOutputDir.get(targetBaseName);
			if (previous !== undefined && previous !== null)	throw new MessageError(`target path ${outputBasePath} cannot be used as both a file and a directory`);
			parentOutputDir.set(targetBaseName, null);
		}

		const created:OutputDir	= new Map();
		outputDirs.set(targetFullPath, created);
		return created;
	};

	for (const { source, target } of bom) {
		// this resolves because we want to allow absolute source paths
		const sourceFullPath	= FsPath.resolve(sourceBasePath, source);

		const dirName	= ContentFile.dirname(target);
		const baseName	= ContentFile.basename(target);

		const outputDir	= provideOutputDir(dirName);
		const previous	= outputDir.get(baseName);
		if (previous !== undefined) {
			if (previous === null)	throw new MessageError(`target path ${target} cannot be used as both a file and a directory`);
			else					throw new MessageError(`target file ${target} cannot be written twice`);
		}
		outputDir.set(baseName, sourceFullPath);
	}

	return outputDirs;
};

const syncOutputDirs	= async (outputDirs:OutputDirs, precise:boolean, logger:Logger):Promise<void> => {
	// never deletes or overwrites into symlinked directories because we go from top to bottom in the tree
	for (const [ targetFullPath, outputDir ] of outputDirs) {
		// NOTE must not run in parallel
		await syncOutputDir(targetFullPath, outputDir, precise, logger);
	}
};

// TODO targetFullPath designates a directory and _not_ a file: it can only be joined with an FsLabel to form a TargetFullPath
// must be called for parent directories before child directories!
const syncOutputDir	= async (targetFullPath:FsPath, outputDir:OutputDir, precise:boolean, logger:Logger):Promise<void>	=> {
	// NOTE we could reuse info from readdir called on the parent outputDir to decide here
	// if we included the information that we deleted something for being a symlink
	const dirStat	= await FsUtil.stat(targetFullPath, "nofollow");
	if (dirStat === FsUtil.ENOENT) {
		logger.directoryCreate(targetFullPath);
		await fsPromises.mkdir(targetFullPath, { recursive: false, mode: directoryMode });
	}
	else if (!dirStat.isDirectory()) {
		logger.directoryRecreate(targetFullPath);
		await fsPromises.rm(targetFullPath, { force: false, maxRetries: 0, recursive: true, retryDelay: 100 });
		await fsPromises.mkdir(targetFullPath, { recursive: false, mode: directoryMode });
	}
	else {
		logger.directoryKeep(targetFullPath);
	}

	// fs.Dirent[] because we have withFileTypes:true and the names in there are probably a string because we did not pass encoding:"buffer"
	const fsEntries	= await fsPromises.readdir(targetFullPath, { encoding: "utf-8", withFileTypes: true, recursive: false });
	for (const fsEntry of fsEntries) {
		const fsEntryName	= FsDirent.name(fsEntry);

		// output files and directories are dealt with later
		if (outputDir.has(fsEntryName))	continue;

		// TODO could be done in parallel
		// everything not wanted has to go
		const fsFullPath	= FsPath.join(targetFullPath, fsEntryName);
		logger.fileOrDirectoryRemove(fsFullPath);
		await fsPromises.rm(fsFullPath, { force: false, maxRetries: 0, recursive: true, retryDelay: 100 });
	}

	const chunks	= Arrays.chunks(Array.from(outputDir))(os.availableParallelism());
	for (const chunk of chunks) {
		await Arrays.parTraversePromise(chunk)(async ([ targetName, sourceFileFullPath ]) => {
			// output directories are dealt with later
			if (sourceFileFullPath === null)	return;

			const targetFileFullPath	= FsPath.join(targetFullPath, targetName);

			await syncOutputFile(sourceFileFullPath, targetFileFullPath, precise, logger);
		});
	}
};

const syncOutputFile	= async (sourceFileFullPath:FsPath, targetFileFullPath:FsPath, precise:boolean, logger:Logger):Promise<void>	=> {
	// uses stat, not lstat - in the source, symlinks are ok
	const sourceFileStat	= await FsUtil.stat(sourceFileFullPath, "follow");
	if (sourceFileStat === FsUtil.ENOENT)	throw new MessageError(`source ${sourceFileFullPath} does not exist`);
	if (!sourceFileStat.isFile())			throw new MessageError(`source ${sourceFileFullPath} is not a file`);

	// NOTE we could reuse info from readdir to decide here (or does that follow symlinks somehow so we do need the lstat?)
	const targetFileStat	= await FsUtil.stat(targetFileFullPath, "nofollow");

	// target does not exist
	if (targetFileStat === FsUtil.ENOENT) {
		logger.fileCreate(sourceFileFullPath, targetFileFullPath);
		// fails if file exists now after stat says it does not
		await fsPromises.copyFile(sourceFileFullPath, targetFileFullPath, fs.constants.COPYFILE_EXCL);
		await fsPromises.utimes(targetFileFullPath, sourceFileStat.atime, sourceFileStat.mtime);
		return;
	}

	// target has the wrong kind
	if (!targetFileStat.isFile()) {
		logger.fileRecreate(sourceFileFullPath, targetFileFullPath);
		await fsPromises.rm(targetFileFullPath, { force: false, maxRetries: 0, recursive: true, retryDelay: 100 });
		// fails if file exists now after we should have deleted it
		await fsPromises.copyFile(sourceFileFullPath, targetFileFullPath, fs.constants.COPYFILE_EXCL);
		await fsPromises.utimes(targetFileFullPath, sourceFileStat.atime, sourceFileStat.mtime);
		return;
	}

	const same	=
		sourceFileStat.size				=== targetFileStat.size				&&
		sourceFileStat.mtime.getTime()	=== targetFileStat.mtime.getTime()	&&
		(!precise || await sameContent(sourceFileFullPath, targetFileFullPath));

	// target is different but hardlinked
	if (!same && targetFileStat.nlink > 1) {
		// hardlinked files must not be changed
		logger.fileDecouple(sourceFileFullPath, targetFileFullPath);
		await fsPromises.rm(targetFileFullPath, { force: false, maxRetries: 0, recursive: true, retryDelay: 100 });
		// fails if file exists now after we should have deleted it
		await fsPromises.copyFile(sourceFileFullPath, targetFileFullPath, fs.constants.COPYFILE_EXCL);
		await fsPromises.utimes(targetFileFullPath, sourceFileStat.atime, sourceFileStat.mtime);
		return;
	}

	// target is different
	if (!same) {
		logger.fileUpdate(sourceFileFullPath, targetFileFullPath);
		// overwrites an existing file
		await fsPromises.copyFile(sourceFileFullPath, targetFileFullPath, 0);
		await fsPromises.utimes(targetFileFullPath, sourceFileStat.atime, sourceFileStat.mtime);
		return;
	}

	const sourceFileMode	= sourceFileStat.mode & 0o777;
	const targetFileMode	= targetFileStat.mode & 0o777;

	// target has a different mode
	if (sourceFileMode !== targetFileMode) {
		logger.fileChmod(sourceFileFullPath, targetFileFullPath);
		await fsPromises.chmod(targetFileFullPath, sourceFileMode);
		return;
	}

	// nothing to do
	logger.fileKeep(sourceFileFullPath, targetFileFullPath);
};

// NOTE if we read the content anyway, we could just write instead of using copyFile
const sameContent	= async (sourceFilePath:FsPath, targetFilePath:FsPath):Promise<boolean>	=> {
	const [ sourceBuffer, targetBuffer ]	=
		await Promise.all([
			fsPromises.readFile(sourceFilePath, { encoding: null }),
			fsPromises.readFile(targetFilePath, { encoding: null }),
		]);
	return sourceBuffer.equals(targetBuffer);
};
