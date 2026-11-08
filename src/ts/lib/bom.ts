import os				from "node:os";
import fs				from "node:fs";
import fsPromises		from "node:fs/promises";

import { Nullable }		from "bale/util/nullable";
import { Arrays }		from "bale/util/arrays";
import { MessageError }	from "bale/util/messageError";

import { FsDirent }		from "bale/node/fsDirent";
import { FsPath }		from "bale/node/fsPath";
import { FsLabel }		from "bale/node/fsLabel";
import { Io }			from "bale/node/io";

import { Matcher }				from "bale/match/matcher";
import { Path as MatchPath }	from "bale/match/path";
import { Label as MatchLabel }	from "bale/match/label";

import { ContentDir }	from "bale/lib/contentDir";
import { ContentFile }	from "bale/lib/contentFile";
import { Origin }		from "bale/lib/origin";

export type Bom	= ReadonlyArray<Bom.Part>;

export namespace Bom {
	export type Part	= Readonly<{
		source:	FsPath,
		target:	ContentFile,
	}>;

	//-----------------------------------------------------------------------------
	//## operations

	export const concatMany	= (boms:ReadonlyArray<Bom>):Bom	=>
		boms.flat();

	export const empty:Bom	= [];

	export const concat	= (a:Bom, b:Bom):Bom	=>
		a.concat(b);

	//-----------------------------------------------------------------------------
	//## input/output

	export const slurp	= async ():Promise<Bom> =>
		parse("<stdin>",	await Io.slurp());

	export const print	= async (bom:Bom):Promise<void>	=>
		Io.print(render(bom));

	export const load	= async (bomFile:FsPath):Promise<Bom>	=>
		parse(bomFile,	await Io.load(bomFile));

	export const save	= async (bomFile:FsPath, bom:Bom):Promise<void>	=>
		Io.save(bomFile, render(bom));

	//-----------------------------------------------------------------------------
	//## textual format

	// NOTE must not contain directories
	// format: (target TAB source LF)*
	export const parse	= (originPath:Origin.Path, text:string):Bom	=>
		text
		.split("\n")
		.map((line, lineNumber) =>
			line === "" ? null :
			parsePart(
				`${originPath}:${lineNumber+1}`,
				line
			)
		)
		.filter(Nullable.isNotNull);

	const parsePart		= (originPosition:Origin.Position, line:string):Part	=> {
		const paths	= line.split("\t");
		if (paths.length !== 2)	throw new MessageError(`${originPosition}: expected two paths separated by a tab, but found ${paths.length}`);
		const [ target, source ]	= paths;
		return {
			source:	parseSourcePath(originPosition, source),
			target:	parseTargetPath(originPosition, target),
		};
	};

	// TODO the FsPath returned here really is a file and must not end in a slash
	const parseSourcePath	= (originPosition:Origin.Position, path:string):FsPath	=> {
		if (path === "")		throw new MessageError(`${originPosition}: source path must not be empty`);
		if (path.endsWith("/"))	throw new MessageError(`${originPosition}: source path must not end in a path separator`);
		return FsPath.brand(path);
	};

	// TODO normalize target paths and then reject if they are path.isAbsolute(path) or start with a ..
	const parseTargetPath	= (originPosition:Origin.Position, path:string):ContentFile	=> {
		const names	= path.split("/");
		const bad	= names.some(it => it === "." || it === ".." || it === "");
		if (bad)	throw new MessageError(`${originPosition} target path must not contain found a ".", ".." or "" path part`);
		return ContentFile.brand(path);
	};

	export const render	= (bom:Bom):string	=> {
		const string	= bom.map(renderPart).join("\n");
		return string !== "" ? string + "\n" : string;
	};

	const renderPart	= (part:Part):string	=>
		`${part.target}\t${part.source}`;

	//-----------------------------------------------------------------------------
	//## search

	export const search	= async (sourcePath:FsPath, matcher:Matcher):Promise<Bom>	=> {
		// maximum number of threads
		// NOTE this is a lot more than expected, but with a lower number we are quite a bit slower
		const limit	= os.availableParallelism() * 2048;

		// current number of threads
		let running	= 0;

		// tasks not done yet
		const tasks:Array<SearchTask>	= [
			searchTask(sourcePath, ContentDir.current, matcher),
		];

		// files found already
		const bom:Array<Bom.Part>	= [];

		// keep the number of running threads at the limit
		const start	= async ():Promise<void>	=> {
			const wanted	= limit - running;
			if (wanted === 0)		return;

			const taken		= tasks.slice(0, wanted);
			if (taken.length === 0)	return;

			tasks.splice(0, wanted);

			await Arrays.parTraversePromise(taken)(run);
		};

		// run a thread, extend the bom and add new tasks for subdirectories
		const run	= async (task:SearchTask):Promise<void>	=> {
			running	+= 1;
			const result	= await task();
			running	-= 1;
			Arrays.pushAll(bom,		result.bom);
			Arrays.pushAll(tasks,	result.tasks);
			await start();
		};

		await start();

		return bom;
	};

	type SearchTask	= () => Promise<SearchResult>;

	type SearchResult	= Readonly<{
		bom:	Bom,
		tasks:	ReadonlyArray<SearchTask>,
	}>;

	// NOTE this does not traverse into symlinks
	const searchTask	= (sourcePath:FsPath, parentRelative:ContentDir, matcher:Matcher):SearchTask =>
		async ():Promise<SearchResult>	=> {
			const fsEntries	=
				await fsPromises.readdir(sourcePath, { encoding: "utf-8", withFileTypes: true, recursive: false });

			const bom	=
				fsEntries
				.filter(it => it.isFile())
				.map((fsEntry) => {
					const fsEntryName	= safeFileName(fsEntry);

					const label	= toMatchLabel(fsEntryName);

					if (!matcher.leaf(label))	return null;

					const absolute	= FsPath.resolve(sourcePath, fsEntryName);
					const relative	= ContentDir.join(parentRelative, fsEntryName);

					return { source: absolute, target: relative };
				})
				.filter(it => it !== null);

			const tasks	=
				fsEntries
				.filter(it => it.isDirectory())
				.map((fsEntry) => {
					const fsEntryName	= safeFileName(fsEntry);
					const label			= toMatchLabel(fsEntryName);

					const branch		= matcher.branch(label);
					if (branch.type === "nothing")		return null;

					const absolute	= FsPath.resolve(sourcePath, fsEntryName);
					const relative	= ContentDir.extend(parentRelative, fsEntryName);

					return searchTask(absolute, relative, branch);
				})
				.filter(it => it !== null);

			return {
				bom,
				tasks,
			};
		};

	/*
	// NOTE this is much slower than the recursive variant

	export const search	= async (sourcePath:FsPath):Promise<Bom>	=> {
		// NOTE this does not traverse into symlinks
		const fsEntries	= await fsPromises.readdir(sourcePath, { encoding: "utf-8", withFileTypes: true, recursive: true });

		const list	=
			fsEntries
			.filter(it => it.isFile())
			.map((fsEntry) => {
				const fsEntryName	= safeFileName(fsEntry);

				const parentPath		= FsDirent.parentPath(fsEntry);
				const absolute			= FsPath.resolve(parentPath, fsEntryName);

				// NOTE this cast is safe because parentPath is guaranteed to be a child of sourcePath
				const parentRelative	= ContentDir.brand(FsPath.relative(sourcePath, parentPath));
				// never adds a ./ at the start
				const relative			= ContentDir.join(parentRelative, fsEntryName);

				return { source: absolute, target: relative };
			});

		return list;
	};
	*/

	const safeFileName	= (fsEntry:fs.Dirent):FsLabel	=> {
		const label	= FsDirent.name(fsEntry);

		// TAB and LF would destroy our file format
		if (badFile.test(label))	throw new MessageError("file names containing TAB or LF are not supported");

		return label;
	};

	/** forbidden characters in file paths */
	const badFile	= /[\t\n]/;

	//-----------------------------------------------------------------------------
	//## manipulation

	export const base	= (bom:Bom, basePath:FsPath):Bom	=>
		bom.map(({ source, target }) => ({
			source:	FsPath.resolve(basePath, source),
			target:	target,
		}));

	export const prefix	= (bom:Bom, prefixDir:ContentDir):Bom	=>
		// optimize the case of a neutral prefix
		prefixDir === ContentDir.current ? bom :
		bom.map(({ source, target }) => ({
			source:	source,
			target:	ContentDir.join(prefixDir, target),
		}));

	export const filter	= (self:Bom, matcher:Matcher):Bom	=>
		self.filter((part) =>
			matcher.matches(toMatchPath(part.target))
		);

	//-----------------------------------------------------------------------------
	//## matching

	const toMatchPath	= (raw:ContentFile):MatchPath	=> {
		const labels	= raw.split("/");

		if (!MatchPath.is(labels))	throw new MessageError("invalid path: labels must not be empty, dot or dotdot");
		return labels;
	};

	// TODO glob in some contexts, FsLabel can be illegal for this, but not here.. we should split the path name.
	const toMatchLabel	= (raw:FsLabel):MatchLabel	=> {
		if (!MatchLabel.is(raw))	throw new MessageError("invalid path: labels must not be empty, dot or dotdot");
		return raw;
	};
};
