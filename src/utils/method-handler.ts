import { from, isObservable, Observable, of, throwError } from "rxjs";
import MethodNotFoundException from "../exceptions/method-not-found.exception";
import { IMethodList } from "../types";
import MethodProxy from "./method-proxy";

export default abstract class MethodHandler<M extends IMethodList> extends MethodProxy<M> {
    protected constructor(
        protected readonly methodList: IMethodList,
    ) {
        super();
    }

    /**
     * Call the proper handler
     */
    protected callMethod(method: string, args: any[]): Observable<any> {
        if (!this.methodList.hasOwnProperty(method)) {
            return throwError(new MethodNotFoundException(method));
        }

        try {
            const fnReturn = this.methodList[method](...args);

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
