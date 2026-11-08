import fs				from "node:fs";
import fsPromises		from "node:fs/promises";

import { Fn }			from "bale/util/fn";

import { CodeError }	from "bale/node/codeError";
import { FsPath }		from "bale/node/fsPath";

export namespace FsUtil {
	export type ENOENT					= typeof ENOENT;
	export const ENOENT:unique symbol	= Symbol("ENOENT");

	export type Symlink	= "follow"|"nofollow";

	export const stat	= async (path:FsPath, symlink:Symlink):Promise<fs.Stats|ENOENT> => {
		try {
			return await (
				symlink === "follow"	?	fsPromises.stat(path, { bigint: false })	:
				symlink === "nofollow"	?	fsPromises.lstat(path, { bigint: false })	:
				Fn.impossible(symlink)
			);
		}
		catch (e) {
			if (isEnoEnt(e))	return ENOENT;
			throw e;
		}
	};

	// NOTE there is NodeJS.ErrnoException, but that's just an interface
	export const isEnoEnt	= (e:unknown):boolean	=>
		CodeError.is(e) &&
		e.code === "ENOENT";
}
