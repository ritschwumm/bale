import fs			from "node:fs";

import { FsPath }	from "bale/node/fsPath";
import { FsLabel }	from "bale/node/fsLabel";

export namespace FsDirent {
	// Dirent.path is deprecated
	export const parentPath	= (self:fs.Dirent):FsPath	=>
		FsPath.brand(self.parentPath);

	export const name	= (self:fs.Dirent):FsLabel	=>
		FsLabel.brand(self.name);
};
