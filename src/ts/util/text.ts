export namespace Text {
	/** expands tabs and removes leading whitespace */
	export const block	= (text:string):string	=> {
		const clean	=
			// ensure we only have spaces, but never tabs
			expandTabs(4, text)
			// remove whitespace if there is nothing else in a line
			.replaceAll(/^\s+$/mg, "")
			// remove whitespace at the end of lines
			.replaceAll(/\s+$/g, "")
			// remove empty lines at the start
			.replace(/^\n+/, "")
			// remove empty lines at the end
			.replace(/\n+$/, "");

		const lines	= clean.split("\n");

		const indent	=
			lines
			.map(it => /^ */.exec(it)?.[0].length ?? 0)
			.filter(it => it !== 0)
			.reduce((a, b) => Math.min(a, b), Infinity);

		const slice	=
			indent !== Infinity ? indent : 0;

		return lines.map(it => it.slice(slice)).join("\n");
	};

	/** treats all combinations of CR and LF as line endings */
	export const expandTabs	= (width:number, text:string):string => {
		let out	= "";
		let col	= 0;
		let i	= 0;
		while (i < text.length) {
			const c	= text.charAt(i);
			switch (c) {
				case "\r":
					out	+= "\r";
					col	= 0;
					break;
				case "\n":
					out	+= "\n";
					col	= 0;
					break;
				case "\t":
					for (;;) {
						out	+= " ";
						col	+= 1;
						if (col % width === 0)	break;
					}
					break;
				default:
					out	+= c;
					col	+= 1;
					break;
			}
			i	+= 1;
		}
		return out;
	};
}
