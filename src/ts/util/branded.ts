export type Branded<T, B>	= T & Branding<T, B>;

export type Unbranded<T extends Branded<unknown, unknown>>	= T[typeof __BASE__];

type Branding<T, B>	= {
	readonly [__BASE__]:	T,
	readonly [__BRAND__]:	B,
};

declare const __BASE__:		unique symbol;
declare const __BRAND__:	unique symbol;

/** this is unsafe casting, do not call unless proven to be correct */
const brand		= <T extends Branded<unknown, unknown>>(it:Unbranded<T>):T	=> it as T;

const unbrand	= <T>(it:Branded<T, unknown>):T	=> it;

export const Branded	= {
	brand,
	unbrand,
};
