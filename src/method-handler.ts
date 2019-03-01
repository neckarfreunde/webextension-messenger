import { from, isObservable, Observable, of, throwError } from "rxjs";
import MethodNotFoundException from "./exceptions/method-not-found.exception";
import { IMethodList, ObservableMethodList } from "./types";

export default abstract class MethodHandler<M extends IMethodList> {
    public readonly methods: ObservableMethodList<M> = this.initMethodsProxy();

    protected constructor(
        protected readonly methodList: IMethodList = {},
    ) { }

    /**
     * Initializes the proxy used for method calling
     */
    protected initMethodsProxy() {
        const proxyObj: any = {};
        Object.preventExtensions(proxyObj);
        Object.seal(proxyObj);

        return new Proxy(proxyObj, {
            get: (target, property: string) => (...args: any[]) => this.callMethod(property, args),
        });
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
