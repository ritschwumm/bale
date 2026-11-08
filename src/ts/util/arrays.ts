import { Fn }	from "bale/util/fn";

export namespace Arrays {
	export const parFlatTraversePromise	= <S>(self:ReadonlyArray<S>) => <T>(func:Fn<S, Promise<ReadonlyArray<T>>>):Promise<ReadonlyArray<T>>	=>
		parSequencePromise(self.map(func)).then(it => it.flat());

	export const parTraversePromise	= <S>(self:ReadonlyArray<S>) => <T>(func:Fn<S, Promise<T>>):Promise<ReadonlyArray<T>>	=>
		parSequencePromise(self.map(func));

	export const parSequencePromise	= <T>(self:ReadonlyArray<Promise<T>>):Promise<ReadonlyArray<T>>	=>
		Promise.all(self);

	export const chunks	= <T>(self:ReadonlyArray<T>) => (size:number):Array<Array<T>>	=> {
		if (size <= 0)	throw new Error("chunk size must be at least 1");

		const out:Array<Array<T>>	= [];
		for (let i=0; i<self.length; i+=size) {
			out.push(self.slice(i, i+size));
		}
		return out;
	};

	// Array.push(...items) can lead to stack overflows for large arrays, this does not
	export const pushAll	= <T>(target:Array<T>, values:ReadonlyArray<T>):void	=> {
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i=0; i<values.length; i++) {
			target.push(values[i]);
		}
	};
}
