import { Nea }		from "bale/util/nea";

import { Label }	from "bale/match/label";

export type Path	= Nea<Label>;

export namespace Path {
	export const is	= (raw:ReadonlyArray<string>):raw is Path	=>
		Nea.is(raw)	&&
		Nea.everyIs(raw, Label.is);
}
