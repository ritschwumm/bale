import { Fn, Fn2 }	from "bale/util/fn";

export type Nea<T>	= readonly [ T, ...ReadonlyArray<T> ];

export namespace Nea {
	export const fromArray	= <T>(items:ReadonlyArray<T>):Nea<T>|null	=>
		items.length !== 0 ? unsafeFromArray(items) : null;

	export const unsafeFromArray	= <T>(items:ReadonlyArray<T>):Nea<T>	=>
		items as Nea<T>;

	export const is	= <T>(it:ReadonlyArray<T>):it is Nea<T>	=> it.length !== 0;

	//-----------------------------------------------------------------------------

	export const head	= <T>(items:Nea<T>):T					=> items[0];
	export const tail	= <T>(items:Nea<T>):ReadonlyArray<T>	=> items.slice(1);
	export const init	= <T>(items:Nea<T>):ReadonlyArray<T>	=> items.slice(0, items.length-1);
	export const last	= <T>(items:Nea<T>):T					=> items[items.length-1];

	//-----------------------------------------------------------------------------

	export const map	= <S, T>(items:Nea<S>, func:Fn<S, T>):Nea<T>	=>
		unsafeFromArray(items.map(func));

	export const flatMap	= <S, T>(items:Nea<S>, func:Fn<S, Nea<T>>):Nea<T>	=>
		unsafeFromArray(items.flatMap(func));

	export const flatten	= <T>(items:Nea<Nea<T>>):Nea<T>	=>
		unsafeFromArray(items.flat());

	//-----------------------------------------------------------------------------

	export const concat	= <T>(a:Nea<T>, b:Nea<T>):Nea<T>	=>
		unsafeFromArray(a.concat(b));

	export const fold1	= <T>(items:Nea<T>, concat:Fn2<T, T, T>):T =>
		tail(items).reduce(concat, head(items));

	export const foldMap1	= <S, T>(self:Nea<S>, func:Fn<S, T>, concat:Fn2<T, T, T>):T	=>
		fold1(map(self, func), concat);

	//-----------------------------------------------------------------------------

	// ReadonlyArray.every messes with the Nea-ness of an array
	export const everyIs	=
		<S, T extends S>(
			self:		Nea<S>,
			predicate:	(value:S, index:number, array:Nea<S>) => value is T,
			thisArg?:	unknown
		):self is Nea<T>	=>
			self.every(
				predicate as ((value:S, index:number, array:ReadonlyArray<S>) => value is T),
				thisArg
			);

	// ReadonlyArray.every messes with the Nea-ness of an array
	export const everyTest	=
		<S>(
			self:		Nea<S>,
			predicate:	(value:S, index:number, array:Nea<S>) => boolean,
			thisArg?:	unknown
		):boolean	=>
			self.every(
				predicate as ((value:S, index:number, array:ReadonlyArray<S>) => boolean),
				thisArg
			);
}
