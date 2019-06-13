import { Observable } from "rxjs";
import { ObservableMethodList } from "../types";

/**
 * @internal
 */
export default abstract class MethodProxy<T> {
    public readonly methods: ObservableMethodList<T> = this.initMethodsProxy();

    protected abstract callMethod(method: keyof T, args: any[]): Observable<any>;

    /**
     * Initializes the proxy used for method calling
     */
    protected initMethodsProxy() {
        const proxyObj: any = {};
        Object.preventExtensions(proxyObj);
        Object.seal(proxyObj);

        return new Proxy(proxyObj, {
            get: (target, property: keyof T) => (...args: any[]) => this.callMethod(property, args),
        });
    }
}
