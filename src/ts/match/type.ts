import { Nea }	from "bale/util/nea";

// 0-n items in sequence
export type Seq0<T>	= ReadonlyArray<T>;

// 0-n unordered alternatives
export type Alt0<T>	= ReadonlyArray<T>;

// 1-n items in sequence
export type Seq1<T>	= Nea<T>;

// 1-n unordered alternatives
export type Alt1<T>	= Nea<T>;
