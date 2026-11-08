import console			from "node:console";

import { FsPath }		from "bale/node/fsPath";

export type Logger	= {
	directoryCreate:		(targetFullPath:FsPath)	=> void,
	directoryRecreate:		(targetFullPath:FsPath)	=> void,
	directoryKeep:			(targetFullPath:FsPath)	=> void,

	fileOrDirectoryRemove:	(fsFullPath:FsPath)	=> void,

	fileCreate:				(sourceFileFullPath:FsPath, targetFileFullPath:FsPath)	=> void,
	fileRecreate:			(sourceFileFullPath:FsPath, targetFileFullPath:FsPath)	=> void,
	fileDecouple:			(sourceFileFullPath:FsPath, targetFileFullPath:FsPath)	=> void,
	fileUpdate:				(sourceFileFullPath:FsPath, targetFileFullPath:FsPath)	=> void,
	fileChmod:				(sourceFileFullPath:FsPath, targetFileFullPath:FsPath)	=> void,
	fileKeep:				(sourceFileFullPath:FsPath, targetFileFullPath:FsPath)	=> void,
};

export namespace Logger {
	export const debug:Logger	= {
		directoryCreate:		(targetFullPath:FsPath):void	=> console.log("creating directory",	targetFullPath),
		directoryRecreate:		(targetFullPath:FsPath):void	=> console.log("recreating directory",	targetFullPath),
		directoryKeep:			(targetFullPath:FsPath):void	=> console.log("keeping directory",		targetFullPath),

		fileOrDirectoryRemove:	(fsFullPath:FsPath):void		=> console.log("removing file or directory", fsFullPath),

		fileCreate:				(sourceFileFullPath:FsPath, targetFileFullPath:FsPath):void	=> console.log("creating file",		targetFileFullPath,	sourceFileFullPath),
		fileRecreate:			(sourceFileFullPath:FsPath, targetFileFullPath:FsPath):void	=> console.log("recreating file",	targetFileFullPath,	sourceFileFullPath),
		fileDecouple:			(sourceFileFullPath:FsPath, targetFileFullPath:FsPath):void	=> console.log("decoupling file",	targetFileFullPath,	sourceFileFullPath),
		fileUpdate:				(sourceFileFullPath:FsPath, targetFileFullPath:FsPath):void	=> console.log("updating file",		targetFileFullPath,	sourceFileFullPath),
		fileChmod:				(sourceFileFullPath:FsPath, targetFileFullPath:FsPath):void	=> console.log("chmoding file",		targetFileFullPath,	sourceFileFullPath),
		fileKeep:				(sourceFileFullPath:FsPath, targetFileFullPath:FsPath):void	=> console.log("keeping file",		targetFileFullPath,	sourceFileFullPath),
	};

	export const silent:Logger	= {
		directoryCreate:		(_targetFullPath:FsPath):void	=> {},
		directoryRecreate:		(_targetFullPath:FsPath):void	=> {},
		directoryKeep:			(_targetFullPath:FsPath):void	=> {},

		fileOrDirectoryRemove:	(_fsFullPath:FsPath):void		=> {},

		fileCreate:				(_sourceFileFullPath:FsPath, _targetFileFullPath:FsPath):void	=> {},
		fileRecreate:			(_sourceFileFullPath:FsPath, _targetFileFullPath:FsPath):void	=> {},
		fileDecouple:			(_sourceFileFullPath:FsPath, _targetFileFullPath:FsPath):void	=> {},
		fileUpdate:				(_sourceFileFullPath:FsPath, _targetFileFullPath:FsPath):void	=> {},
		fileChmod:				(_sourceFileFullPath:FsPath, _targetFileFullPath:FsPath):void	=> {},
		fileKeep:				(_sourceFileFullPath:FsPath, _targetFileFullPath:FsPath):void	=> {},
	};
}
