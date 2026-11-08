import { Nea }		from "bale/util/nea";

import {
	Alt1,
	Seq0,
	Seq1,
}	from "bale/match/type";
import { Scanner }	from "bale/match/scanner";

export namespace Parser {
	// Path *( "," Path )
	export type Glob			= { type: "Glob",		pathAlts:	Alt1<Path>		};

	// Part *( "/" Part )
	export type Path			= { type: "Path",		partSeq:	Seq1<PathPart>	};

	// PartBrace | StarStar | Name
	export type PathPart		= PathBrace | StarStar | Name;
	// "{" Path *( "," Path ) "}" # followed by a slash or the end, if that's not the case we try a NameBrace later
	export type PathBrace		= { type: "PathBrace",	pathAlts:	Alt1<Path>		};

	// "**"
	export type StarStar		= { type: "StarStar"	};
	// *NamePart
	export type Name			= { type: "Name",		partSeq:	Seq0<NamePart> };

	// NameBrace | Atom
	export type NamePart		= NameBrace | Atom;
	// "{" Name *( "," Name ) "}"
	export type NameBrace		= { type: "NameBrace",	nameAlts:	Alt1<Name>		};

	// Star | QuestionMark | Char
	export type Atom			= Star | Quest | Char;
	// "*"
	export type Star			= { type: "Star"		};
	// "?"
	export type Quest			= { type: "Quest"		};
	// non-metacharacter or "\\" followed by any character at all
	export type Char			= { type: "Char",		character: string			};

	// returns null for an invalid pattern
	export const parse	= (input:string):Glob|null	=> {
		const s	= Scanner.of(input);

		return parseAndFinish(s);
	};

	//-----------------------------------------------------------------------------

	const parseAndFinish	= (s:Scanner):Glob|null => {
		const rollback	= s.savepoint();

		const glob	= parseGlob(s);
		if (glob === null)	return rollback();
		if (s.avail())		return rollback();

		return glob;
	};

	const parseGlob	= (s:Scanner):Glob|null => {
		const rollback	= s.savepoint();

		const paths	= parsePathList(s);
		if (paths === null)	return rollback();

		return { type: "Glob", pathAlts: paths };
	};

	const parsePathList	= (s:Scanner):Alt1<Path>|null => {
		const rollback	= s.savepoint();

		const out:Array<Path>	= [];
		for (;;) {
			const path	= parsePath(s);
			if (path === null)	return rollback();

			out.push(path);

			if (!s.is(","))		break;
		}

		return Nea.unsafeFromArray(out);
	};

	const parsePath	= (s:Scanner):Path|null	=> {
		const rollback	= s.savepoint();

		const parts	= parsePartList(s);
		if (parts === null)	return rollback();

		return { type: "Path", partSeq: parts };
	};

	const parsePartList	= (s:Scanner):Seq1<PathPart>|null	=> {
		const rollback	= s.savepoint();

		const out:Array<PathPart>	= [];
		for (;;) {
			const part	= parsePathPart(s);
			if (part === null)	return rollback();

			out.push(part);

			if (!s.is("/"))		break;
		}

		return Nea.unsafeFromArray(out);
	};

	const parsePathPart	= (s:Scanner):PathPart|null	=>
		parsePathBrace(s) ?? parseStarStar(s) ?? parseName(s);

	const parsePathBrace	= (s:Scanner):PathBrace|null	=> {
		const rollback	= s.savepoint();

		if (!s.is("{"))		return rollback();

		const paths	= parsePathList(s);
		if (paths === null)	return rollback();

		if (!s.is("}"))		return rollback();

		// can only be followed by slash or end, right?
		const ahead	= s.peek();
		if (ahead !== null && ahead !== "/")	return rollback();

		return { type: "PathBrace", pathAlts: paths };
	};

	const parseStarStar	= (s:Scanner):StarStar|null	=> {
		const rollback	= s.savepoint();

		if (!s.is("*"))	return rollback();
		if (!s.is("*"))	return rollback();

		return { type: "StarStar" };
	};

	const parseName	= (s:Scanner):Name|null	=> {
		// const rollback	= s.savepoint();

		const out:Array<NamePart>	= [];
		for (;;) {
			const namePart	= parseNamePart(s);
			if (namePart === null)	break;

			out.push(namePart);
		}
		return { type: "Name", partSeq: out };
	};

	const parseNamePart	= (s:Scanner):NamePart|null	=>
		parseNameBrace(s) ?? parseAtom(s);

	const parseNameBrace	= (s:Scanner):NameBrace|null	=> {
		const rollback	= s.savepoint();

		if (!s.is("{"))		return rollback();

		const names	= parseNameList(s);
		if (names === null)	return rollback();

		if (!s.is("}"))		return rollback();

		return { type: "NameBrace", nameAlts: names };
	};

	const parseNameList	= (s:Scanner):Alt1<Name>|null => {
		const rollback	= s.savepoint();

		const out:Array<Name>	= [];
		for (;;) {
			const name	= parseName(s);
			if (name === null)	return rollback();

			out.push(name);

			if (!s.is(","))		break;
		}

		return Nea.unsafeFromArray(out);
	};

	const parseAtom	= (s:Scanner):Atom|null	=>
		parseStar(s) ?? parseQuest(s) ?? parseChar(s);

	const parseStar	= (s:Scanner):Star|null	=> {
		const rollback	= s.savepoint();

		if (!s.is("*"))			return rollback();

		// TODO glob do we need this to disallow ** in the wrong place?
		if (s.peek() === "*")	return rollback();

		return { type: "Star" };
	};

	const parseQuest	= (s:Scanner):Quest|null	=> {
		const rollback	= s.savepoint();

		if (!s.is("?"))	return rollback();

		return { type: "Quest" };
	};

	const parseChar	= (s:Scanner):Char|null	=> {
		const rollback	= s.savepoint();

		// allow escapes
		s.is("\\");

		const current	= s.peek();
		if (current === null)		return rollback();
		if (metaChars.has(current))	return rollback();
		s.eat();

		return { type: "Char",	character: current };
	};

	const metaChars	= new Set([ ",", "{", "}", "*", "?", "/" ]);
}
