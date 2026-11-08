import { Fn }		from "bale/util/fn";
import { Nea }		from "bale/util/nea";

import {
	Alt0,
	Seq1,
}	from "bale/match/type";
import { Label }	from "bale/match/label";
import { Parser }	from "bale/match/parser";
import { Compiler }	from "bale/match/compiler";

export namespace Fast {
	// NOTE here we never deal with empty alternatives
	export type Glob		= Alt0<Alternative>;
	export type Alternative	= Seq1<Segment>;
	export type Segment		= Compiler.Segment;

	export namespace Glob {
		// Glob is a monoid
		export const empty:Glob	= [];
		export const concat		= (a:Glob, b:Glob):Glob	=> a.concat(b);

		export const nothing:Glob		= [];
		export const everything:Glob	= [ [ Compiler.Many ] ];
	}

	//-----------------------------------------------------------------------------

	// returns null for invalid glob syntax
	export const compileGlob	= (patterns:Alt0<string>):Glob|null	=> {
		const parsed	= patterns.map(Parser.parse);
		if (!parsed.every(it => it !== null))	return null;

		const compiled	= parsed.map(Compiler.compile).map(fromCompilerGlob);
		const merged	= compiled.reduce(Glob.concat, Glob.empty);

		return optimizeGlob(merged);
	};

	/*
	// returns null for invalid glob syntax
	export const compileGlob	= (pattern:string):Glob|null	=> {
		const parsed	= Parser.parse(pattern);
		if (parsed === null)	return null;

		const compiled	= Compiler.compile(parsed);
		const prepared	= fromCompilerGlob(compiled);

		return optimizeGlob(prepared);
	};
	*/

	// we do not deal in empty Alternatives, direct matches are done otherwise
	const fromCompilerGlob	= (raw:Compiler.Glob):Glob	=>
		raw.filter(Nea.is);

	const optimizeGlob	= (glob:Glob):Glob	=> {
		// shortcut: Many includes everything else
		const everything	= isEverything(glob);
		if (everything)	return Glob.everything;

		// TODO glob more optimization:
		// for length one, we only need One and nothing else
		// we do not need duplicates
		// NOTE the same optimizations may make sense after every derivation...

		return glob;
	};

	//-----------------------------------------------------------------------------
	//## fast derivation when we know beforehand whether we will examine a branch (directory) or a leaf (file)

	/*
	whether a glob will ever match any labels
	this works because here we never have empty alternatives to signify a direct match

	equivalent to (Derivation) glob.filter(Nea.is).length !== 0
	*/
	export const isNothing	= (glob:Glob):boolean	=>
		glob.length === 0;

	/*
	whether a glob will match every possible label
	*/
	export const isEverything	= (glob:Glob):boolean	=>
		glob.some(it => it.length === 1 && it[0].type === "Many");

	/*
	this does not leave empty paths in the Glob when the label matched,
	so it can only be used to examine branches but not to test whether a leaf matched
	it is assumed the user either calls testLeaf or deriveBranch, but not both

	equivalent to Derivation.derive(glob, label).filter(Nea.is)
	*/
	export const deriveBranch	= (glob:Glob, label:Label):Glob	=> {
		// TODO glob optimize more here? see #optimizeGlob

		// if (glob.length === 0)	return Glob.nothing

		const out:Array<Alternative>	= [];
		for (const alternative of glob) {
			const [ head, ...tail ]	= alternative;

			// many stays alive for all inputs
			if (head.type === "Many") {
				// shortcut: Many includes everything else
				if (tail.length === 0)	return Glob.everything;

				out.push(alternative);
			}

			// no need to push the tail if it is empty:
			// empty tails mean a direct match, but these are dealt with in testLeaf
			if (Nea.is(tail) && matchLabel(head, label)) {
				out.push(tail);
			}
		}
		return out;
	};

	/*
	export const testLeaf	= (glob:Glob, label:Label):boolean	=>
		// NOTE filtering alternatives with more than one segment again and again is slow
		glob.some((alternative) => {
			// longer alternatives require more than a single Label to match
			if (alternative.length !== 1)	return false;

			return matchLabel(Nea.head(alternative), label);
		});
	*/

	/*
	just tests a file without subdirectory checks

	equivalent to Derivation.derive(glob, label).some((alternative) => alternative.length === 0)
	*/
	export const testLeaf	= (glob:Glob):Fn<Label, boolean>	=> {
		// after stripping a leading Many, only alternatives of exactly 1 segment
		// will ever match, and only the single first segment is interesting
		const relevant	=
			glob
			.map(it =>
				it.length === 1								? it[0]	:
				it.length === 2 && it[0].type === "Many"	? it[1] :
				null
			)
			.filter(it => it !== null);

		// shortcut: without any alternative, nothing will ever match
		// this is just a productive check
		const nothing		= relevant.length === 0;
		if (nothing)	return Fn.constant(false);

		// shortcut: One and Many encompass everything else
		const everything	= relevant.some(it => it.type === "Many" || it.type === "One");
		if (everything)	return Fn.constant(true);

		return ((label:Label):boolean	=>
			// NOTE matchLabel will never be passed a One or Many here and waste time that way
			relevant.some((segment) => matchLabel(segment, label))
		);
	};

	const matchLabel	= (segment:Segment, label:Label):boolean	=>
		segment.type === "Literal"	&& segment.characters === label	||
		segment.type === "Regex"	&& segment.regexp.test(label)	||
		segment.type === "One"										||
		segment.type === "Many";

	//-----------------------------------------------------------------------------

	export const globToRegexp	= (glob:Glob):RegExp	=>
		isNothing(glob)		? /[]/		:
		isEverything(glob)	? /^.*$/	:
		new RegExp(
			"^("									+
			glob.map(alternativeToRegexp).join("|")	+
			")$",
			// dot should match linefeeds
			"s"
		);

	const alternativeToRegexp	= (alternative:Alternative):string	=>
		alternative
		.map((segment, index):string => {
			// const first	= index === 0;
			const last	= index === alternative.length-1;
			return (
				segment.type === "Regex" ? (
					last
					?	segment.regexp.source
					:	segment.regexp.source + "/"
				) :
				segment.type === "Literal" ? (
					last
					?	literalToRegexp(segment.characters)
					:	literalToRegexp(segment.characters) + "/"
				) :
				segment.type === "One" ? (
					last
					?	"[^/]+"
					:	"[^/]+" + "/"
				) :
				segment.type === "Many"	? (
					last
					?	".+"
					:	"(([^/]+)/)*"
				) :
				Fn.impossible(segment)
			);
		})
		.join("");

	// escape string metacharacters
	// @see https://github.com/tc39/proposal-regex-escaping
	// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape
	const literalToRegexp	= (it:string):string	=>
		it.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
