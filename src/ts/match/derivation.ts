import {
	Alt0,
	Seq0,
}	from "bale/match/type";
import { Path }		from "bale/match/path";
import { Label }	from "bale/match/label";
import { Compiler }	from "bale/match/compiler";

// generic derivation for both branches(directories) and leaves (files)
export namespace Derivation {
	// NOTE this requires zero-length Alternatives to signify a match, we do not need this in the optimized variant
	export type Glob		= Alt0<Alternative>;
	export type Alternative	= Seq0<Segment>;
	export type Segment		= Compiler.Segment;

	//-----------------------------------------------------------------------------

	// after deriving a path having an empty alternative means the path matched
	export const isMatch	= (glob:Glob):boolean	=>
		glob.some(it => it.length === 0);

	// after deriving a path having a non-empty glob means further descendants may be matching
	export const canHaveDescendants	= (glob:Glob):boolean	=>
		glob.some(it => it.length !== 0);

	/*
	remove all glob alternatives which will never match a descendant
	this is not necessary, but faster when deriving multiple child branches:
	each call to deriveAlternative would remove them again
	*/
	export const filterForDescendants	= (glob:Glob):Glob	=>
		glob.filter(it => it.length !== 0);

	/*
	applies a path to the glob to calculates a new glob for possible children.

	if the applied path was a direct match, there is at least one empty Alternative in the Glob now

	if the resulting glob contains at least one non-empty Alternative, it may match on a descendant path
	*/
	export const derive	= (glob:Glob, path:Path):Glob	=>
		path.reduce(deriveGlob, glob);

	const deriveGlob	= (glob:Glob, label:Label):Glob	=>
		glob.flatMap((alternative) =>
			deriveAlternative(alternative, label)
		);

	// this leaves empty paths in the Glob when the label matched
	const deriveAlternative	= (alternative:Alternative, label:Label):Glob	=> {
		const [ head, ...tail ]	= alternative;
		const alternatives	=
			// empty paths can be removed, they will never match a child
			head === undefined		? []												:
			head.type === "Literal"	? (head.characters === label	? [ tail ]	: [])	:
			head.type === "Regex"	? (head.regexp.test(label)		? [ tail ]	: [])	:
			head.type === "One"		? [ tail ]											:
			head.type === "Many"	? [ tail, alternative ]								:
			[];
		return alternatives;
	};
};
