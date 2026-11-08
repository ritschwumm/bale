import { Nea }		from "bale/util/nea";
import { Nullable }	from "bale/util/nullable";

import { Path }		from "bale/match/path";
import { Label }	from "bale/match/label";
import { Fast }		from "bale/match/fast";

/*
# glob syntax
\\		escapes a character, useful for metacharacters
?		matches any character except a path separator
*		matches any number of characters except a path separator, possibly zero
**		matches any number of subdirectories, possibly zero;
		can only be used at the beginning, at the end, or between path separators
{}		enclose alternatives
,		separates alternatives
		any other character matches itself

# deviations from other glob implementations
- files whose name begins with a DOT (.) are treated just like every other file
- BRACE ({,}) expansion is supported and can be nested
- GLOBSTAR (**) are only valid between pattern start, pattern end, or a SLASH (/)
- two STAR (*) in a row in other places are treated as a syntax error
- selecting directories with a SLASH (/) at the end is not supported
- absolute paths are not supported

# missing features
- BRACKET classes

# links
- https://semantic-domain.blogspot.com/2013/11/antimirov-derivatives-for-regular.html
- types	https://skalt.github.io/projects/brzozowski_ts/
*/
export type Matcher = Readonly<{
	type:		"everything"|"nothing"|"unknown",
	branch:		(label:Label)	=> Matcher,
	leaf:		(label:Label)	=> boolean,
	matches:	(path:Path)		=> boolean,
}>;

export namespace Matcher {
	export const nothing:Matcher	= {
		type:		"nothing",
		branch:		(_label)	=> nothing,
		leaf:		(_label)	=> false,
		matches:	(_path)		=> false,
	};

	export const everything:Matcher	= {
		type:		"everything",
		branch:		(_label)	=> everything,
		leaf:		(_label)	=> true,
		matches:	(_path)		=> true,
	};

	export const andNot	= (include:Matcher, exclude:Matcher):Matcher	=>
		and(include, not(exclude));

	export const not	= (base:Matcher):Matcher	=> {
		if (base.type === "everything")	return nothing;
		if (base.type === "nothing")	return everything;

		return {
			type:		"unknown",
			branch:		(label:Label):Matcher	=> not(base.branch(label)),
			leaf:		(label:Label):boolean	=> !base.leaf(label),
			matches:	(path:Path):boolean		=> !base.matches(path),
		};
	};

	export const and	= (base1:Matcher, base2:Matcher):Matcher	=> {
		if (base1.type === "nothing")		return nothing;
		if (base2.type === "nothing")		return nothing;
		if (base1.type === "everything")	return base2;
		if (base2.type === "everything")	return base1;

		return {
			type:		"unknown",
			branch:		(label:Label):Matcher	=> and(base1.branch(label), base2.branch(label)),
			leaf:		(label:Label):boolean	=> base1.leaf(label)	&& base2.leaf(label),
			matches:	(path:Path):boolean		=> base1.matches(path)	&& base2.matches(path),
		};
	};

	export const or	= (base1:Matcher, base2:Matcher):Matcher	=> {
		if (base1.type === "everything")	return everything;
		if (base2.type === "everything")	return everything;
		if (base1.type === "nothing")		return base2;
		if (base2.type === "nothing")		return base1;

		return {
			type:		"unknown",
			branch:		(label:Label):Matcher	=> or(base1.branch(label), base2.branch(label)),
			leaf:		(label:Label):boolean	=> base1.leaf(label)	|| base2.leaf(label),
			matches:	(path:Path):boolean		=> base1.matches(path)	|| base2.matches(path),
		};
	};

	//-----------------------------------------------------------------------------

	export type RawGlob	= string;

	// multiple globs passed here are treated as alternatives
	// returns null for invalid glob syntax
	export const compile	= (patterns:ReadonlyArray<RawGlob>):Matcher|null	=>
		Nullable.map(Fast.compileGlob(patterns), buildMatcher);

	//-----------------------------------------------------------------------------

	// NOTE here we never deal with empty alternatives
	type Glob	= Fast.Glob;
	// type Alternative	= Fast.Alternative;
	// type Segment		= Fast.Segment;

	// TODO glob think about caching here again
	const buildMatcher	= (glob:Glob):Matcher	=> {
		if (Fast.isNothing(glob))		return nothing;
		if (Fast.isEverything(glob))	return everything;

		/*
		NOTE these are equivalent

		const regexp	= Fast.globToRegexp(glob);
		const matches	= (path:Path):boolean	=>
			regexp.test(path.join("/"));

		const matches	= (path:Path):boolean	=>
			Fast.testLeaf(
				Nea.init(path).reduce(Fast.deriveBranch, glob),
			)(
				Nea.last(path),
			);
		*/

		const branch	= (label:Label):Matcher	=>
			buildMatcher(Fast.deriveBranch(glob, label));

		const leaf	=
			Fast.testLeaf(glob);

		const matches	= (path:Path):boolean	=> {
			const [ head, ...tail ]	= path;
			return (
				Nea.is(tail)
				?	branch(head).matches(tail)
				:	leaf(head)
			);
		};
		return {
			type:		"unknown",
			branch:		branch,
			leaf:		leaf,
			matches:	matches,
		};
	};
};
