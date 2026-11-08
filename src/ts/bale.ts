#!/usr/bin/env -S node --enable-source-maps

/* eslint-disable @typescript-eslint/no-confusing-void-expression */

import util					from "node:util";
import path					from "node:path";
import console				from "node:console";
import process				from "node:process";

import { Arrays }			from "bale/util/arrays";
import { Nea }				from "bale/util/nea";
import { Text }				from "bale/util/text";
import { MessageError }		from "bale/util/messageError";

import { CodeError }		from "bale/node/codeError";
import { FsPath }			from "bale/node/fsPath";

import { Matcher }			from "bale/match/matcher";

import { Script }			from "bale/lib/script";
import { Action }			from "bale/lib/action";
import { Bom }				from "bale/lib/bom";
import { Synchronization }	from "bale/lib/synchronization";
import { ContentDir }		from "bale/lib/contentDir";

const main	= async (args:ReadonlyArray<string>):Promise<void>	=> {
	const params	= parseParams(args);
	if		(params === "help")				return console.log(usage);
	else if	(params === "invalid_args")		return badArgs();
	else if	(params === "unknown_option")	return badArgs();

	try {
		await run(params);
	}
	catch (e) {
		if (e instanceof MessageError) {
			console.error(`error: ${e.message}`);
			process.exitCode	= 1;
		}
		else {
			throw e;
		}
	}
};

const badArgs	= ():void => {
	console.log(usage);
	process.exitCode	= 1;
};

//-----------------------------------------------------------------------------
//## processing

const run	= async (params:Params):Promise<void>	=> {
	//-----------------------------------------------------------------------------
	//## input

	// for every --find <directory>, the directory is scanned and pre-filtered for the matcher
	const findBomPromises:Promise<ReadonlyArray<Bom>>	=
		Arrays.parTraversePromise(params.findPaths)(it => Bom.search(it, params.matcher));

	// for every --script <file>, the script is loaded and each line is treated just like an action (see below)
	const scriptBomPromises:Promise<ReadonlyArray<Bom>>	=
		Arrays.parTraversePromise(params.scriptPaths)(it => loadScript(it)).then(it => it.flat());

	// for every --action <target:source:include:exclude>, the source is scanned, filtered with the matcher, and then prefixed with the target
	const actionBomPromises:Promise<ReadonlyArray<Bom>>	=
		Arrays.parTraversePromise(params.actions)(it => searchAction(params.basePath, it));

	// for every --load <file> the bom file is simply loaded
	const loadBomPromises:Promise<ReadonlyArray<Bom>>	=
		Arrays.parTraversePromise(params.loadPaths)(it => loadBom(params.basePath, it));

	// if --slurp is given, a bom is read from stdin
	const slurpBomPromise:Promise<ReadonlyArray<Bom>>	=
		params.slurpFlag ? slurpBom(params.basePath).then(it => [ it ]) : Promise.resolve([]);

	//-----------------------------------------------------------------------------
	//## processing

	const filterBoms	= (boms:ReadonlyArray<Bom>):ReadonlyArray<Bom>	=>
		boms.map(it => Bom.filter(it, params.matcher));

	// when everything is loaded, filter by globs and combine it into a big all-encompassing bom
	const filteredBoms:ReadonlyArray<ReadonlyArray<Bom>>	=
		await Promise.all([
			// these are already globbed with the matcher in Bom.search
			findBomPromises,
			scriptBomPromises.then(filterBoms),
			actionBomPromises.then(filterBoms),
			loadBomPromises.then(filterBoms),
			slurpBomPromise.then(filterBoms),
		]);
	const combinedBom	= Bom.concatMany(filteredBoms.flat());

	// if --prefix is given, apply it
	const prefixedBom	= params.prefixTargets.reduce(Bom.prefix, combinedBom);

	//-----------------------------------------------------------------------------
	//## output

	// NOTE sequential to avoid mixing with error output
	if (params.printFlag) {
		await Bom.print(prefixedBom);
	}
	// NOTE sequential to avoid overwriting the same file twice
	for (const savePath of params.savePaths) {
		await Bom.save(savePath, prefixedBom);
	}
	// NOTE sequential to avoid overwriting the same directory twice
	for (const syncPath of params.syncPaths) {
		await Synchronization.synchronize(FsPath.current, syncPath, prefixedBom, params.verboseFlag, params.preciseFlag);
	}
};

// load a Bom from a File, assume sources to be in basePath
const loadBom	= async (basePath:FsPath, bomPath:FsPath):Promise<Bom>	=> {
	const bom	= await Bom.load(bomPath);
	return Bom.base(bom, basePath);
};

// load a Bom from stdin, assume sources to be in basePath
const slurpBom	= async (basePath:FsPath):Promise<Bom>	=> {
	const bom	= await Bom.slurp();
	return Bom.base(bom, basePath);
};

// load a Script from a file, use searchAction to create Boms
// assumes source to be in the same directory as the script
const loadScript	= async (scriptPath:FsPath):Promise<ReadonlyArray<Bom>>	=> {
	const script	= await Script.load(scriptPath);
	const basePath	= FsPath.dirname(scriptPath);
	const boms		= await searchScript(basePath, script);
	return boms;
};

const searchScript	= (basePath:FsPath, script:Script):Promise<ReadonlyArray<Bom>>	=>
	Arrays.parTraversePromise(script)(it => searchAction(basePath, it));

// load, filter and prefix files into a Bom, either by a command line action or from a Script
const searchAction	= async (basePath:FsPath, command:Action):Promise<Bom>	=> {
	const source	= FsPath.resolve(basePath, command.source);
	const filtered	= await Bom.search(source, command.matcher);
	const prefixed	= Bom.prefix(filtered, command.target);
	return prefixed;
};

//-----------------------------------------------------------------------------
//## parameter parsing

type Params	= Readonly<{
	// other
	verboseFlag:	boolean,
	preciseFlag:	boolean,

	// input
	findPaths:		ReadonlyArray<FsPath>,
	scriptPaths:	ReadonlyArray<FsPath>,
	actions:		ReadonlyArray<Action>,
	loadPaths:		ReadonlyArray<FsPath>,
	slurpFlag:		boolean,
	basePath:		FsPath,

	// manipulation
	prefixTargets:	ReadonlyArray<ContentDir>,

	// output
	syncPaths:		ReadonlyArray<FsPath>,
	savePaths:		ReadonlyArray<FsPath>,
	printFlag:		boolean,

	// filter
	matcher:		Matcher,
}>;

const usage	=
	Text.block(`
		usage: ${path.basename(process.argv[1])} options [ -- ]

		standard options
			--help						display this help
			--verbose					print some debug output
			--precise					consider files the same when their contents match in addition to size and mtime

		input options
			--find		<directory>		find files in a source directory
			--script	<file>			find files by interpreting a bale script, sources are found relative to the script's directory
			--action	<action>		find files in a source directory, filter them by a glob and move them into a subdirectory
			--load		<file>			load an existing bom file
			--slurp						include a bom coming from stdin, must not occur more than once
			--base		<directory>		path to resolve relative source paths in, must occur at most once, not used for scripts

		filter options
			--include	<glob>			include files matching this glob, relative to their origin
			--exclude	<glob>			exclude files matching this glob, relative to their origin

		manipulation options
			--prefix	<target>		move all files into a subdirectory

		output options
			--sync		<directory>		synchronize a target directory with the current files
			--save		<file>			write a bom into a file
			--print						write a bom to stdout, must not occur more than once

		glob syntax
			\\		escapes the following character, including metacharacters
			?		matches any character except a path separator
			*		matches any number of characters except a path separator, possibly zero
			**		matches any number of path segments, possibly zero;
					can only be used at the beginning, at the end, or between path separators
			{}		enclose alternatives
			,		separates alternatives
					any other character matches itself

		bale script syntax
			empty lines are ignored and lines starting with a # are ignored

			all other lines consist of two to four items separated by an arbitrary number of tabs or spaces:
			a target directory, a source directory, one glob to include files and one glob to exclude files.
			if the include glob is left out, everything is included as if it were '**'.
			if the exclude glob is left out, nothing is excluded as if it were ''.

		action syntax
			and actions consist of two to four items separated by a colon:
			a target directory, a source directory, one glob to include files and one glob to exclude files.
			if the include glob is left out, everything is included as if it were '**'.
			if the exclude glob is left out, nothing is excluded as if it were ''.
	`);

const parseParams	= (args:ReadonlyArray<string>):Params|"help"|"unknown_option"|"invalid_args"	=> {
	// NOTE does support "--" as a tokens: [ { kind: 'option-terminator', index: 0 } ]
	try {
		const parameters	=
			util.parseArgs({
				// process.argv.slice(2) is the default anyway
				args:	Array.from(args),
				options: {
					// other
					help:	{
						type:		"boolean",
						multiple:	false,
						short:		"h",
						default:	false,
					},
					verbose:	{
						type:		"boolean",
						multiple:	false,
						// short:		"v",
						default:	false,
					},
					precise:	{
						type:		"boolean",
						multiple:	false,
						// short:		"p",
						default:	false,
					},

					// input
					find:	{
						type:		"string",
						multiple:	true,
						// short:		"f",
						default:	[],
					},
					script:	{
						type:		"string",
						multiple:	true,
						// short:		"a",
						default:	[],
					},
					action:	{
						type:		"string",
						multiple:	true,
						// short:		"f",
						default:	[],
					},
					load:	{
						type:		"string",
						multiple:	true,
						// short:		"l",
						default:	[],
					},
					slurp:	{
						type:		"boolean",
						multiple:	false,
						// short:		"s",
						default:	false,
					},
					base:	{
						type:		"string",
						multiple:	false,
						// short:		"s",
						default:	".",
					},

					// filter
					include:	{
						type:		"string",
						multiple:	true,
						// short:		"i",
						default:	[],
					},
					exclude:	{
						type:		"string",
						multiple:	true,
						// short:		"i",
						default:	[],
					},

					// manipulation
					prefix:	{
						type:		"string",
						multiple:	true,
						// short:		"p",
						default:	[],
					},

					// output
					sync:	{
						type:		"string",
						multiple:	true,
						// short:		"s",
						default:	[],
					},
					save:	{
						type:		"string",
						multiple:	true,
						// short:		"l",
						default:	[],
					},
					print:	{
						type:		"boolean",
						multiple:	false,
						// short:		"s",
						default:	false,
					},
				},
				strict:				true,
				allowPositionals:	true,
				tokens:				true,
			});

		const values	= parameters.values;

		if (values.help)	return "help";

		if (parameters.positionals.length !== 0)	return "invalid_args";

		const include	= Nea.is(values.include) ? Matcher.compile(values.include) : Matcher.everything;
		const exclude	= Nea.is(values.exclude) ? Matcher.compile(values.exclude) : Matcher.nothing;
		if (include === null)	return "invalid_args";
		if (exclude === null)	return "invalid_args";
		const matcher	= Matcher.andNot(include, exclude);

		return {
			verboseFlag:	values.verbose,
			preciseFlag:	values.precise,
			findPaths:		values.find.map(FsPath.brand),
			scriptPaths:	values.script.map(FsPath.brand),
			loadPaths:		values.load.map(FsPath.brand),
			actions:		values.action.map(Action.parse),
			slurpFlag:		values.slurp,
			basePath:		FsPath.brand(values.base),
			prefixTargets:	values.prefix.map(ContentDir.parse),
			syncPaths:		values.sync.map(FsPath.brand),
			savePaths:		values.save.map(FsPath.brand),
			printFlag:		values.print,
			matcher:		matcher,
		};
	}
	catch (e) {
		if (CodeError.is(e) && e.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION") {
			return "unknown_option";
		}
		throw e;
	}
};

//-----------------------------------------------------------------------------

void main(process.argv.slice(2));
