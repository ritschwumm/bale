import { Branded }	from "bale/util/branded";

// a single name part without path separators
export type FsLabel	= Branded<string, "FsLabel">;

export namespace FsLabel {
	export const brand	= Branded.brand<FsLabel>;

	/*
	export const isPure	= (self:FsLabel):boolean	=>
		self !== ""		&&
		self !== "."	&&
		self !== "..";
	*/
};
