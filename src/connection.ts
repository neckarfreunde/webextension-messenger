import { BehaviorSubject, Observable, of, throwError } from "rxjs";
import { catchError, finalize } from "rxjs/operators";
import { v4 } from "uuid";
import ConnectionStatus from "./connection-status.enum";
import MessengerException from "./exceptions/messenger.exception";
import IBroadcaster from "./interfaces/broadcaster.interface";
import MethodHandler from "./method-handler";
import { IBroadcast } from "./models/broadcast.interface";
import IError from "./models/error.interface";
import MessageTypes from "./models/messate-types.enum";
import IMethodAdvertisement from "./models/method-advertisement.interface";
import IMethodCompletion from "./models/method-completion.interface";
import IMethodReturn from "./models/method-return.interface";
import PortWrapper from "./port-wrapper";
import { IMethodList } from "./types";

export default class Connection<M extends IMethodList> extends MethodHandler<M> implements IBroadcaster {
    public get status$(): Observable<ConnectionStatus> {
        return this.statusSub.asObservable();
    }

    public get broadcast$(): Observable<any> {
        if (!this.port) {
            return throwError(new MessengerException("Port not ready"));
        }

        return this.port.broadcast$;
    }

    protected readonly id: string;

    protected port?: PortWrapper;

    protected statusSub = new BehaviorSubject(ConnectionStatus.Connecting);

    public constructor(prefix?: string, methods?: IMethodList) {
        super(methods);

        this.id = `${(prefix) ? `${prefix}:` : ""}${v4()}`;
    }

    /**
     * Open runtime connection
     */
    public connect() {
        try {
            this.port = new PortWrapper(
                browser.runtime.connect(void 0, { name: this.id }),
            );
        } catch (e) {
            this.statusSub.next(ConnectionStatus.Failed);
            return;
        }

        // Register methods with router
        const methods: IMethodAdvertisement = {
            type: MessageTypes.MethodAdvertisement,
            methods: Object.keys(this.methodList),
        };
        this.port!.postMessage(methods);

        this.port.methodCall$.subscribe(({ id, method, args }) => this.handleMethodCall(id, method, args));
        this.port.disconnect$.subscribe(() => this.statusSub.next(ConnectionStatus.Closed));

        this.statusSub.next(ConnectionStatus.Connected);
    }

    /**
     * @inheritDoc
     */
    public sendBroadcast(data: any, clientFilter = /.*/) {
        if (this.statusSub.getValue() !== ConnectionStatus.Connected) {
            throw new Error("Connection not ready");
        }

        const broadcast: IBroadcast = {
            type: MessageTypes.Broadcast,
            data,
            filter: {
                source: clientFilter.source,
                flags: clientFilter.flags,
            },
        };

        console.debug("Sending broadcast", broadcast);

        this.port!.postMessage(broadcast);
    }

    /**
     * @inheritDoc
     */
    protected callMethod(method: string, args: any[]): Observable<any> {
        if (this.methodList.hasOwnProperty(method)) {
            // Can be handled locally
            console.debug("Calling local method", { method, args });
            return super.callMethod(method, args);
        }

        console.debug("Calling remote method", { method, args });
        return this.port!.callMethod(method, args);
    }

    /**
     * Handle incoming method calls
     *
     * @param {string} id
     * @param {string} method
     * @param {Array} args
     */
    protected handleMethodCall(id: string, method: string, args: any[]) {
        super.callMethod(method, args)
            .pipe(
                catchError((e: Error) => of({
                    type: MessageTypes.Error,
                    id,
                    message: e.message,
                    stack: e.stack,
                } as IError)),

                finalize(() => this.port!.postMessage({
                    type: MessageTypes.MethodCompletion,
                    id,
                } as IMethodCompletion)),
            ).subscribe((value) => this.port!.postMessage({
                type: MessageTypes.MethodReturn,
                id,
                value,
            } as IMethodReturn),
        );
    }
}
