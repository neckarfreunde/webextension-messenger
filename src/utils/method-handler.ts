import { from, isObservable, Observable, of, throwError } from "rxjs";
import MethodNotFoundException from "../exceptions/method-not-found.exception";
import MethodProxy from "./method-proxy";

/**
 * @internal
 */
export default abstract class MethodHandler<T> extends MethodProxy<T> {
    protected constructor(
        protected readonly methodList: T,
    ) {
        super();
    }

    /**
     * Call the proper handler
     */
    protected callMethod(method: keyof T, args: any[]): Observable<any> {
        const func = this.methodList[method];

        if (typeof func !== "function") {
            return throwError(new MethodNotFoundException(`${method}`));
        }

        try {
            const fnReturn = func.apply(this.methodList, args);

            let obs$: Observable<any>;
            if (isObservable(fnReturn)) {
                obs$ = fnReturn;
            } else if (fnReturn instanceof Promise) {
                obs$ = from(fnReturn);
            } else {
                obs$ = of(fnReturn);
            }

            return obs$;
        } catch (e) {
            return throwError(e);
        }
    }
}
