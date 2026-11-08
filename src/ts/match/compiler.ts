import { Fn }		from "bale/util/fn";
import { Nea }		from "bale/util/nea";

import {
	Alt0,
	Alt1,
	Seq0,
	Seq1,
}	from "bale/match/type";
import { Parser }	from "bale/match/parser";

// normalized to an ALT of SEQ form
// segments are unified into a single object: a *, a literal, or a regex
// alternatives never contain consecutive ** or *
export namespace Compiler {
	export type Glob		= Alt0<Alternative>;
	export type Alternative	= Seq0<Segment>;

	// TODO glob should we have StartsWith nodes from Literal plus Star?
	export type Segment	= Many | One | Literal | Regex;
	export type Many	= { type: "Many"							};
	export type One		= { type: "One"								};
	export type Literal	= { type: "Literal",	characters: string	};
	export type Regex	= { type: "Regex",		regexp:		RegExp	};

	export const Many:Segment	= { type: "Many" };
	export const One:Segment	= { type: "One" };

	export const compile	= (input:Parser.Glob):Glob	=>
		normalizeGlob(input);

	// Glob is a semigroup
	export const concat		= (a:Glob, b:Glob):Glob	=>
		a.concat(b);

	//-----------------------------------------------------------------------------

	const normalizeGlob	= (input:Parser.Glob):Glob	=>
		input.pathAlts
		.flatMap(normalizePath)
		.map(deduplicateStarStar);

	//-----------------------------------------------------------------------------

	const normalizePath	= (input:Parser.Path):Glob	=>
		normalizePathParts(input.partSeq);

	const normalizePathParts	= (input:Seq1<Parser.PathPart>):Alt0<Seq1<Segment>>	=> {
		const [ head, ...tail ]	= input;

		const headAlts	= normalizePathPart(head);
		if (!Nea.is(tail))	return headAlts;

		const tailAlts	= normalizePathParts(tail);

		return (
			headAlts.flatMap((headAlt) =>
				tailAlts.map((tailAlt) => [
					...headAlt,
					...tailAlt,
				])
			)
		);
	};

	const normalizePathPart	= (input:Parser.PathPart):Alt0<Seq1<Segment>>	=>
		input.type === "PathBrace"	?
			input.pathAlts.flatMap((path) =>
				normalizePathParts(path.partSeq)
			)
			:
		input.type === "StarStar"	?
			[ [ Many ] ]
			:
		input.type === "Name"	?
			normalizeName(input).map((flatName) => [
				flatName,
			])
			:
		Fn.impossible(input);

	//-----------------------------------------------------------------------------

	const normalizeName	= (input:Parser.Name):Alt0<Segment>	=>
		normalizeNameParts(input.partSeq)
		.map(tightenName)
		.filter(it => it !== null);

	const normalizeNameParts	= (input:Seq0<Parser.NamePart>):Alt1<Seq0<Parser.Atom>>	=> {
		if (input.length === 0)	return [ [ ] ];

		const [ head, ...tail ]	= input;

		const headAlts	= normalizeNamePart(head);
		const tailAlts	= normalizeNameParts(tail);

		return (
			Nea.flatMap(headAlts, (headAlt) =>
				Nea.map(tailAlts, (tailAlt) => [
					...headAlt,
					...tailAlt,
				])
			)
		);
	};

	const normalizeNamePart	= (input:Parser.NamePart):Alt1<Seq0<Parser.Atom>>	=>
		input.type === "NameBrace"
		?	Nea.flatMap(input.nameAlts, (name) =>
				normalizeNameParts(name.partSeq)
			)
		:	[ [ input ] ];

	//-----------------------------------------------------------------------------

	// combines multiple name parts into a single segment
	// returns null for an empty name segment
	const tightenName	= (parts:Seq0<Parser.Atom>):Segment|null	=>
		// empty names are ignored completely, so e.g. foo/{}/bar matches foo/bar
		!Nea.is(parts)	?
			null
			:
		parts.length === 1 && parts[0].type === "Star"	?
			One
			:
		Nea.everyIs(parts, it => it.type === "Char")	?
			{ type: "Literal", characters: parts.map(it => it.character).join("") }
			:
		// else
			{ type: "Regex", regexp: buildRegex(parts) };

	const buildRegex	= (parts:Seq1<Parser.Atom>):RegExp	=>
		new RegExp(
			"^" +
			parts
			.map((part) =>
				part.type === "Char"	? escapeRegexp(part.character)	:
				part.type === "Quest"	? "[^/]"						:
				part.type === "Star"	? "[^/]*"						:
				Fn.impossible(part)
			)
			.join("") +
			"$"
		);

	const escapeRegexp	= (it:string):string	=>
		it.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	//-----------------------------------------------------------------------------

	// ** / ** is just a more complicated ** so we can replace it
	const deduplicateStarStar	= (input:Alternative):Alternative	=> {
		const out:Array<Segment>	= [];
		let last	= null;
		for (const segment of input) {
			if (last !== null && last.type === "Many" && segment.type === "Many")	continue;
			out.push(segment);
			last	= segment;
		}
		return Nea.unsafeFromArray(out);
	};
}
