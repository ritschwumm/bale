export namespace Scanner {
	export const of	= (input:string):Scanner	=> {
		let	pos	= 0;

		const is		= (char:string):boolean	=> {
			const found	= peek() === char;
			if (found)	eat();
			return found;
		};

		const peek	= ():string|null	=>
			avail() ? input[pos] : null;

		const eat	= ():boolean	=> {
			pos++;
			return avail();
		};

		const avail	= ():boolean	=>
			pos < input.length;

		const savepoint	= () => {
			const old	= pos;
			return ():null	=> {
				pos	= old;
				return null;
			};
		};

		return { is, peek, eat, avail, savepoint };
	};
}

export type Scanner	= Readonly<{
	is:			(char:string)	=> boolean,
	peek:		()				=> string|null,
	eat:		()				=> boolean,
	avail:		()				=> boolean,
	savepoint:	()				=> () => null,
}>;
