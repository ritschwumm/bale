export type CodeError	=
	Error &
	Readonly<{ code: string }>;

export namespace CodeError {
	export const is	= (it:unknown):it is CodeError	=>
		it instanceof Error	&&
		"code" in it		&&
		typeof it.code === "string";
};
