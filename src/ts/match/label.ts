import { Branded }	from "bale/util/branded";

export type Label	= Branded<string, "Label">;

export namespace Label {
	export const brand	= Branded.brand<Label>;

	export const is	= (raw:string):raw is Label	=>
		raw !== ""		&&
		raw !== "."		&&
		raw !== ".."	&&
		!raw.includes("/");
}
