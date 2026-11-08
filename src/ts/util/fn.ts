export type Fn0<T>			= () => T;
export type Fn<S, T>		= (s:S) => T;
export type Fn2<S1, S2, T>	= (s1:S1, s2:S2) => T;

export namespace Fn {
	export const identity	= <T>(value:T):T				=> value;
	export const constant	= <S>(value:S) => <T>(_:T):S	=> value;
	export const never		= ():never => { throw new Error("up"); };
	export const impossible	= (it:never):never	=> it;

	export const andThen	= <S, T, U>(st:Fn<S, T>, tu:Fn<T, U>):Fn<S, U>	=> s => tu(st(s));
}
