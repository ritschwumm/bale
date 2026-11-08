import { MessageError }	from "bale/util/messageError";

import { Io }			from "bale/node/io";
import { FsPath }		from "bale/node/fsPath";

import { Origin }		from "bale/lib/origin";
import { Action }		from "bale/lib/action";

export type Script	= ReadonlyArray<Action>;

export namespace Script {
	export const load	= async (bomFile:FsPath):Promise<Script>	=>
		parse(bomFile,		await Io.load(bomFile));

	export const slurp	= async ():Promise<Script> =>
		parse("<stdin>",	await Io.slurp());

	//-----------------------------------------------------------------------------

	export const parse	= (originPath:Origin.Path, text:string):Script	=>
		text
		.split("\n")
		.map((line, lineNumber) => ({
			origin:	`${originPath}:${lineNumber+1}` as const,
			line:	line,

		}))
		.filter(({ line }) =>
			line !== "" && !line.startsWith("#")
		)
		.map(({ origin, line }) =>
			parseAction(origin, line)
		);

	const parseAction	= (originPosition:Origin.Position, line:string):Action	=> {
		const tokens	= line.split(/[\t ]+/);
		const action	= Action.parseTokens(tokens);
		if (typeof action === "string")	throw new MessageError(`${originPosition} ${action}`);
		return action;
	};
}
