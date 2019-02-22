import { Observable } from "rxjs";

type AnyFunction = (...args: any[]) => any;

export interface IMethodList {
    [method: string]: AnyFunction;
}

/**
 * Infer return type of given function, extract from Promise and Observable
 */
type InferredReturnType<F extends AnyFunction> = ReturnType<F> extends Promise<infer P>
    ? P
    : ReturnType<F> extends Observable<infer O> ? O
        : ReturnType<F>;

/**
 * Make all methods in an IMethodList observable
 */
export type ObservableMethodList<H extends IMethodList> = {
    [K in keyof H]: (...args: Parameters<H[K]>) => Observable<InferredReturnType<H[K]>>;
};
