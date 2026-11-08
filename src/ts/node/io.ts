import path				from "node:path";
import process			from "node:process";
import fsPromises		from "node:fs/promises";

import { MessageError }	from "bale/util/messageError";

import { FsPath }		from "bale/node/fsPath";

export namespace Io {
	export const slurp	= async ():Promise<string>	=> {
		try {
			// 0 aka stdin only works when async or throws
			// EAGAIN: resource temporarily unavailable, read
			return await fsPromises.readFile("/dev/stdin", { encoding: "utf-8" });
		}
		catch (e) {
			throw new MessageError(`cannot slurp stdin: ${messageOf(e)}`);
		}
	};

	export const print	= async (text:string):Promise<void>	=>
		new Promise((resolve, reject) => {
			process.stdout.write(text, (err) => {
				if (err === null || err === undefined) {
					resolve();
				}
				else {
					reject(
						new MessageError(`cannot write stdout: ${messageOf(err)}`)
					);
				}
			});
		});

	export const load	= async (file:FsPath):Promise<string>	=> {
		try {
			return await fsPromises.readFile(file, { encoding: "utf-8" });
		}
		catch (e) {
			throw new MessageError(`cannot load file ${file}: ${messageOf(e)}`);
		}
	};

	export const save	= async (file:FsPath, text:string):Promise<void> => {
		try {
			await fsPromises.mkdir(path.dirname(file), { recursive: true });

			await fsPromises.writeFile(file, text, { encoding: "utf-8" });
		}
		catch (e) {
			throw new MessageError(`cannot save file: ${messageOf(e)}`);
		}
	};

	const messageOf	= (e:unknown):string	=>
		e instanceof Error ? e.message : "<unknown>";
}
