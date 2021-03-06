import { Observable } from "rxjs";

type AnyFunction = (...args: any[]) => any;

/**
 * Infer return type of given function, extract from Promise and Observable
 */
type InferredReturnType<F extends AnyFunction> = ReturnType<F> extends Promise<infer P>
    ? P
    : ReturnType<F> extends Observable<infer O> ? O
        : ReturnType<F>;

type MethodList<T = any> = {
    [K in keyof T]: AnyFunction;
};

/**
 * Make all methods in an IMethodList observable
 *
 * @internal
 */
export type ObservableMethodList<T, H extends MethodList<T> = MethodList<T>> = {
    [K in keyof H]: (...args: Parameters<H[K]>) => Observable<InferredReturnType<H[K]>>;
};
