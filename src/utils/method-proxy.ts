import { Observable } from "rxjs";
import { IMethodList, ObservableMethodList } from "../types";

export default abstract class MethodProxy<M extends IMethodList> {
    public readonly methods: ObservableMethodList<M> = this.initMethodsProxy();

    protected abstract callMethod(method: string, args: any[]): Observable<any>;

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
}
