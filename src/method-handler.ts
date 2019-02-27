import { from, isObservable, Observable, of } from "rxjs";
import MethodNotFoundException from "./exceptions/method-not-found.exception";
import { IMethodList, ObservableMethodList } from "./types";

export default abstract class MethodHandler<M extends IMethodList> {
    public readonly methods: ObservableMethodList<M> = this.initMethodsProxy();

    protected constructor(
        protected readonly methodList: M = {} as any,
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
            throw new MethodNotFoundException(method);
        }

        const fnReturn = this.methodList[method](...args);

        if (isObservable(fnReturn)) {
            return fnReturn;
        }

        // noinspection SuspiciousTypeOfGuard
        return (fnReturn instanceof Promise)
            ? from(fnReturn)
            : of(fnReturn);
    }
}
