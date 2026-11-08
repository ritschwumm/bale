import { MessageError }	from "bale/util/messageError";
import { FsPath }		from "bale/node/fsPath";

import { Matcher }		from "bale/match/matcher";

import { ContentDir }	from "bale/lib/contentDir";

export type Action	= Readonly<{
	target:		ContentDir,
	source:		FsPath,
	matcher:	Matcher,
}>;

export namespace Action {
	export const parse	= (text:string):Action	=> {
		const tokens	= text.split(/:/);
		const action	= parseTokens(tokens);
		if (typeof action === "string")	throw new MessageError(`${action} in action ${text}`);
		return action;
	};

	// may return an error description instead of an Action
	export const parseTokens	= (tokens:ReadonlyArray<string>):Action|string	=> {
		const [ target, source, include, exclude, more ]	= tokens;

		if (target === undefined)		return "missing target";
		if (source === undefined)		return "missing source";
		// an undefined include/exclude glob are legal here

		if (target === "")				return "empty target";
		if (source === "")				return "empty source";
		if (include === "")				return "empty include glob";
		if (exclude === "")				return "empty exclude glob";

		if (more !== undefined)			return `unexpected token ${more}`;

		const includeMatcher	= buildMatcher(include, Matcher.everything);
		if (includeMatcher === null)	return `invalid include glob ${include}`;

		const excludeMatcher	= buildMatcher(exclude, Matcher.nothing);
		if (excludeMatcher === null)	return `invalid exclude glob ${exclude}`;

		const matcher	= Matcher.andNot(includeMatcher, excludeMatcher);

		return {
			target:		ContentDir.parse(target),
			source:		FsPath.brand(source),
			matcher:	matcher,
		};
	};

	const buildMatcher = (glob:string|undefined, fallback:Matcher):Matcher|null	=>
		glob !== undefined ? Matcher.compile([ glob ]) : fallback;
}
