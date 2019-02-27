import { BehaviorSubject, fromEventPattern, Observable } from "rxjs";
import { filter, finalize, map, switchMap, take, takeUntil, tap } from "rxjs/operators";
import { v4 } from "uuid";
import ConnectionStatus from "./connection-status.enum";
import MethodHandler from "./method-handler";
import { IBroadcast, isBroadcast } from "./model/broadcast.interface";
import { isMessage } from "./model/message.interface";
import MessageTypes from "./model/messate-types.enum";
import IMethodAdvertisement from "./model/method-advertisement.interface";
import IMethodCall from "./model/method-call.interface";
import IMethodReturn, { isMethodReturn } from "./model/method-return.interface";
import { IMethodList } from "./types";

// TODO Separate broadcaster?
export default class Connection<M extends IMethodList> extends MethodHandler<M> {
    public get status$(): Observable<ConnectionStatus> {
        return this.statusSub.asObservable();
    }

    public get broadcast$(): Observable<any> {
        return this.message$.pipe(
            filter((msg) => isBroadcast(msg)),
            map(({ data }: IBroadcast) => data),
        );
    }

    protected readonly id: string;

    protected port?: browser.runtime.Port;

    protected statusSub = new BehaviorSubject(ConnectionStatus.Connecting);

    protected readonly message$: Observable<any> = this.status$.pipe(
        tap(console.log),
        filter((status) => status === ConnectionStatus.Connected),
        take(1),
        tap(console.log.bind(void 0, "before switch")),

        switchMap(() => fromEventPattern<[any, any]>(
            (handler) => this.port!.onMessage.addListener(handler),
            (handler) => this.port!.onMessage.removeListener(handler),
        )),

        map(([msg]) => msg),
        filter((msg) => isMessage(msg)),
    );

    public constructor(prefix?: string, methods?: M) {
        super(methods);

        this.id = `${(prefix) ? `${prefix}:` : ""}${v4()}`;
    }

    /**
     * Send broadcast message to all clients that match the given filter
     */
    public broadcast(data: any, clientFilter = /.*/) {
        if (this.statusSub.getValue() !== ConnectionStatus.Connected) {
            throw new Error("Connection not ready");
        }

        const broadcast: IBroadcast = {
            type: MessageTypes.Broadcast,
            data,
            filter: clientFilter.source,
        };

        console.debug("Sending broadcast", broadcast);

        this.port!.postMessage(broadcast);
    }

    /**
     * Open runtime connection
     */
    public connect() {
        try {
            this.port = browser.runtime.connect(void 0, { name: this.id });
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

        const disconnect$ = fromEventPattern(
            (listener) => this.port!.onDisconnect.addListener(listener),
            (listener) => this.port!.onDisconnect.removeListener(listener),
        ).pipe(take(1));

        disconnect$.subscribe(() => this.statusSub.next(ConnectionStatus.Closed));

        fromEventPattern<any>(
            (listener) => this.port!.onMessage.addListener(listener),
            (listener) => this.port!.onMessage.removeListener(listener),
        ).pipe(
            map(([message]) => message),
            filter((msg) => isMessage(msg)),

            takeUntil(disconnect$),
        );

        this.statusSub.next(ConnectionStatus.Connected);
    }

    /**
     * Send method call to router
     */
    protected callMethod(method: string, args: any[]): Observable<any> {
        if (this.methodList.hasOwnProperty(method)) {
            // Can be handled locally
            console.debug("Calling local method", { method, args });
            return super.callMethod(method, args);
        }

        const id = v4();
        console.debug("Calling remote method", { id, method, args });

        const methodCall: IMethodCall = {
            type: MessageTypes.MethodCall,
            id,
            method,
            args,
        };

        this.port!.postMessage(methodCall);

        const return$: Observable<IMethodReturn> = this.message$.pipe(
            filter((msg) => isMethodReturn(msg) && msg.id === id),
        );

        const complete$ = return$.pipe(
            filter(({ complete }) => complete),
        );

        return return$.pipe(
            map((msg: IMethodReturn) => {
                console.debug("Received method call return", {
                    id,
                    method,
                    return: msg.value,
                });

                return msg.value;
            }),

            // Return values until completion
            takeUntil(complete$),
            finalize(() => console.debug("Return stream closed", { id, method })),
        );
    }
}
