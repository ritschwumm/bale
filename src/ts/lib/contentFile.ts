
import path				from "node:path";

import { Branded }		from "bale/util/branded";

import { FsPath }		from "bale/node/fsPath";
import { FsLabel }		from "bale/node/fsLabel";

import { ContentDir }	from "bale/lib/contentDir";

/*
virtual path of a file in the output:
relative and normalized, does not contain dot or dotdot, cannot be empty
*/
export type ContentFile	= Branded<string, "ContentFile">;

export namespace ContentFile {
	export const brand	= Branded.brand<ContentFile>;

	export const dirname	= (self:ContentFile):ContentDir	=>
		ContentDir.brand(
			path.dirname(self)
		);

	export const basename	= (self:ContentFile):FsLabel	=>
		FsLabel.brand(
			path.basename(self)
		);

	export const toFsPath	= (self:ContentDir):FsPath	=>
		FsPath.brand(self);
}
