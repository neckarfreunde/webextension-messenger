import { fromEventPattern, NEVER, Observable, of, race, Subject, throwError, TimeoutError } from "rxjs";
import {
    catchError,
    filter,
    finalize,
    map,
    switchMap,
    switchMapTo,
    take,
    takeUntil,
    tap,
    timeout,
    toArray,
} from "rxjs/operators";
import MethodNotFoundException from "./exceptions/method-not-found.exception";
import MethodHandler from "./method-handler";
import { IBroadcast, isBroadcast } from "./model/broadcast.interface";
import IError from "./model/error.interface";
import IMessage, { isMessage } from "./model/message.interface";
import MessageTypes from "./model/messate-types.enum";
import IMethodAdvertisement, { isMethodAdvertisement } from "./model/method-advertisement.interface";
import IMethodCall, { isMethodCall } from "./model/method-call.interface";
import IMethodCompletion, { isMethodCompletion } from "./model/method-completion.interface";
import IMethodReturn, { isMethodReturn } from "./model/method-return.interface";
import { isMethodUnsubscribe } from "./model/method-unsubscribe.interface";
import { IMethodList } from "./types";
import Port = browser.runtime.Port;

interface IClientList {
    [id: string]: Port;
}

interface IMethodMapping {
    [method: string]: string;
}

interface IPortMessage<M = any> {
    readonly client: string;
    readonly message: M;
}

export default class Router<M extends IMethodList> extends MethodHandler<M> {
    /**
     * Mapping between client names and Ports
     */
    protected readonly clients: IClientList = {};

    /**
     * Mapping between method names and port ids
     */
    protected methodMapping: IMethodMapping = {};

    protected readonly message$ = new Subject<IPortMessage>();

    public constructor(methods?: IMethodList) {
        super(methods);

        this.initBroadcastHandling();
        this.initMethodCallHandling();

        fromEventPattern<Port>(
            (listener) => browser.runtime.onConnect.addListener(listener),
            (listener) => browser.runtime.onConnect.removeListener(listener),
        ).subscribe((port) => this.onClientConnect(port));
    }

    protected onClientConnect(port: Port) {
        console.debug(`New client connecting: ${port.name || "no-name"}`, port);

        if (!port.name || port.name.length === 0) {
            console.warn(`Connection ignored as it has no name`, port);
            return;
        }

        if (this.clients.hasOwnProperty(port.name)) {
            console.warn(`Connection from client with duplicate id '${port.name}' ignored`);
            return;
        }

        const disconnect$ = this.listenPortDisconnect(port);
        const message$ = this.listenPortMessages(port).pipe(
            takeUntil(disconnect$),
        );

        // Wait for method advertisement, then forward all message to this.message$ subject
        this.awaitMethodAdvertisement(message$, port).pipe(
            switchMapTo(message$),

            // When port disconnects do cleanup
            finalize(() => {
                console.debug(`Client '${port.name}' disconnected`);
                delete this.clients[port.name];

                // Remove client methods from method mapping
                this.methodMapping = Object.keys(this.methodMapping)
                    .filter((method) => this.methodMapping[method] !== port.name)
                    .reduce((mapping: IMethodMapping, method) => {
                        mapping[method] = this.methodMapping[method];
                        return mapping;
                    }, {});
            }),
        ).subscribe(
            (message) => this.message$.next({
                message,
                client: port.name,
            }),
            (e: TimeoutError | Error) => {
                if (e instanceof TimeoutError) {
                    console.warn(`Client '${port.name}' did not advertise it's methods in time, disconnected`);
                } else {
                    console.error(`Unknown error for client '${port.name}'`, e);
                }

                port.disconnect();
            },
        );
    }

    /**
     * Start listening for broadcast events
     */
    protected initBroadcastHandling() {
        this.message$.pipe(
            filter(({ message }) => isBroadcast(message)),

            map(({ message, client }: IPortMessage<IBroadcast>) => {
                const regExp = new RegExp(message.filter);

                const clients = Object.keys(this.clients)
                    .filter((name) => name !== client && regExp.test(name));

                return { clients, message };
            }),

            catchError((e: Error) => {
                console.error("Failed to emit broadcast message due to exception", e);

                return NEVER;
            }),
        ).subscribe(({ clients, message }) => clients.forEach((client: string) => {
            console.debug(`Emitting broadcast to client '${client}'`, message);

            const port = this.clients[client];
            port.postMessage(message);
        }));
    }

    /**
     * Listen for method
     */
    protected initMethodCallHandling() {
        this.message$.pipe(
            filter(({ message }) => isMethodCall(message)),
        ).subscribe(({ client, message }) => this.handleMethodCall(client, message));
    }

    // TODO Logging
    /**
     * Route method call to correct handler
     */
    protected handleMethodCall(clientName: string, call: IMethodCall) {
        console.debug(`Handling method call from client '${clientName}'`, { ...call });

        const { method, args, id } = call;

        let out$: Observable<IMessage<any>>;
        if (this.methodList.hasOwnProperty(method)) {
            console.debug(`Handling client call locally`, { ...call });
            out$ = super.callMethod(method, args);
        } else if (this.methodMapping.hasOwnProperty(method)) {
            const handler = this.clients[this.methodMapping[method]];
            handler.postMessage(handler);

            const complete$: Observable<any> = this.message$.pipe(
                filter(({ message }) => isMethodCompletion(message) && message.id === id),
                take(1),
            );

            out$ = this.message$.pipe(
                map(({ message }) => message as IMethodReturn),
                filter((message) => isMethodReturn(message) && message.id === id),

                takeUntil(complete$),
            );
        } else {
            console.warn(`Call to unknown method '${method}'`, { name: method, args });
            out$ = throwError(new MethodNotFoundException(method));
        }

        const client = this.clients[clientName];

        const disconnect$ = fromEventPattern(
            (handler) => client.onDisconnect.addListener(handler),
            (handler) => client.onDisconnect.removeListener(handler),
        ).pipe(take(1));

        const unsubscribe$ = this.message$.pipe(
            filter(({ message }) => isMethodUnsubscribe(message) && message.id === id),
            take(1),
            tap(() => console.debug(`Client ${clientName} unsubscribed from method call`, { id, method })),
        );

        out$.pipe(
            map((value): IMethodReturn => ({
                type: MessageTypes.MethodReturn,
                id,
                value,
            })),

            tap((ret) => console.debug("Sending method return", ret)),

            catchError((e: Error) => of({
                type: MessageTypes.Error,
                id,
                message: e.message,
                stack: e.stack,
            } as IError)),

            takeUntil(race(disconnect$, unsubscribe$)),
            finalize(() => client.postMessage({
                type: MessageTypes.MethodCompletion,
                id,
            } as IMethodCompletion)),
        ).subscribe((msg) => client.postMessage(msg));
    }

    /**
     * Listen for the port disconnect event, returns an observable that emits once on disconnect
     */
    protected listenPortDisconnect(port: Port): Observable<Port> {
        return fromEventPattern<Port>(
            (listener) => port.onDisconnect.addListener(listener),
            (listener) => port.onDisconnect.removeListener(listener),
        ).pipe(
            take(1),
        );
    }

    /**
     * Listen to all messages received on the port
     */
    protected listenPortMessages(port: Port): Observable<any> {
        return fromEventPattern<[any, any]>(
            (listener) => port.onMessage.addListener(listener),
            (listener) => port.onMessage.removeListener(listener),
        ).pipe(
            map(([msg]) => msg),
            filter((msg) => isMessage(msg)),
        );
    }

    /**
     * Wait for the client to advertise it's methods and register them
     */
    protected awaitMethodAdvertisement(message$: Observable<any>, port: Port): Observable<void> {
        return message$.pipe(
            // Wait for method advertisement
            filter((msg) => isMethodAdvertisement(msg)),
            take(1),

            // Register client
            tap(() => { this.clients[port.name] = port; }),

            // Register client methods
            switchMap(({ methods }: IMethodAdvertisement) => methods),
            filter((method) => {
                if (this.methodMapping.hasOwnProperty(method)) {
                    console.warn(`Client '${port.name}' tried to re-register method '${method}'`);
                    return false;
                }

                return true;
            }),
            toArray(),

            // Register methods
            map((methods) => {
                console.debug(`Client: '${port.name}' advertised methods`, methods);
                methods.forEach((method) => { this.methodMapping[method] = port.name; });
            }),

            timeout(5000),
        );
    }
}
