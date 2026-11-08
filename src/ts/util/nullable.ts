import { Fn } from "bale/util/fn";

export namespace Nullable {
	export const isNotNull	= <T>(it:T|null):it is T	=> it !== null;

	export const map	= <S, T>(value:S|null, func:Fn<S, T>):T|null	=>
		value !== null ? func(value) : null;
};
