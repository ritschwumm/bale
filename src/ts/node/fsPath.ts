import path			from "node:path";

import { Branded }	from "bale/util/branded";

import { FsLabel }	from "bale/node/fsLabel";

// absolute or relative, accessible from the current directory, used for list files and content
export type FsPath	= Branded<string, "FsPath">;

export namespace FsPath {
	export const brand	= Branded.brand<FsPath>;

	export const current	= brand(".");

	export const dirname	= (self:FsPath):FsPath	=>
		brand(
			path.dirname(self)
		);

	export const relative	= (parent:FsPath, child:FsPath):FsPath	=>
		brand(
			path.relative(parent, child)
		);

	export const resolve	= (self:FsPath, child:FsPath|FsLabel):FsPath	=>
		brand(
			path.resolve(self, child)
		);

	export const join		= (self:FsPath, child:FsPath|FsLabel):FsPath	=>
		brand(
			path.join(self, child)
		);
};
