import { FsPath }	from "bale/node/fsPath";

export namespace Origin {
	export type Position	= `${Path}:${Line}`;
	export type Path		= FsPath | "<stdin>";
	export type Line		= number;
}
