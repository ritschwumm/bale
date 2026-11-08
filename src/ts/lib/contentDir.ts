
import path				from "node:path";

import { Branded }		from "bale/util/branded";
import { MessageError }	from "bale/util/messageError";

import { FsPath }		from "bale/node/fsPath";
import { FsLabel }		from "bale/node/fsLabel";

import { ContentFile }	from "bale/lib/contentFile";

/*
virtual path of a directory in the output:
relative and normalized, does not contain dot or dotdot, but a single "." is legal for "no change"
*/
export type ContentDir	= Branded<string, "ContentDir">;

export namespace ContentDir {
	export const brand	= Branded.brand<ContentDir>;

	export const current	= brand(".");

	export const parse	= (path:string):ContentDir	=> {
		if (path === ".")	return brand(path);

		const names	= path.split("/");
		const bad	= names.some(it => it === "." || it === ".." || it === "");
		if (bad)	throw new MessageError('the rebase path must not contain parts consisting of ".", ".." or ""');
		return brand(path);
	};

	export const dirname	= (self:ContentDir):ContentDir	=>
		ContentDir.brand(
			path.dirname(self)
		);

	export const basename	= (self:ContentDir):FsLabel	=>
		FsLabel.brand(
			path.basename(self)
		);

	export const join	= (self:ContentDir, child:ContentFile|FsLabel):ContentFile	=>
		ContentFile.brand(
			path.join(self, child)
		);

	export const extend	= (self:ContentDir, child:FsLabel):ContentDir	=>
		ContentDir.brand(
			path.join(self, child)
		);

	export const toFsPath	= (self:ContentDir):FsPath	=>
		FsPath.brand(self);
}
