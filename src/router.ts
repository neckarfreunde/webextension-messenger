import { fromEventPattern, Observable, of, race, throwError, TimeoutError } from "rxjs";
import { catchError, filter as rxFilter, map, switchMap, takeUntil, tap, timeout, toArray } from "rxjs/operators";
import MethodNotFoundException from "./exceptions/method-not-found.exception";
import IBroadcaster from "./interfaces/broadcaster.interface";
import MethodHandler from "./method-handler";
import { IBroadcast } from "./models/broadcast.interface";
import IError from "./models/error.interface";
import IMessage from "./models/message.interface";
import MessageTypes from "./models/messate-types.enum";
import IMethodCall from "./models/method-call.interface";
import IMethodReturn from "./models/method-return.interface";
import PortWrapper from "./port-wrapper";
import { IMethodList } from "./types";

interface IClientList {
    [id: string]: PortWrapper;
}

interface IMethodMapping {
    [method: string]: string;
}

export default class Router<M extends IMethodList> extends MethodHandler<M> implements IBroadcaster {
    /**
     * Mapping between client names and Ports
     */
    protected readonly clients: IClientList = {};

    /**
     * Mapping between method names and port ids
     */
    protected methodMapping: IMethodMapping = {};

    public constructor(methods?: IMethodList) {
        super(methods);

        fromEventPattern<browser.runtime.Port>(
            (listener) => browser.runtime.onConnect.addListener(listener),
            (listener) => browser.runtime.onConnect.removeListener(listener),
        ).subscribe((port) => this.onClientConnect(new PortWrapper(port)));
    }

    /**
     * @inheritDoc
     */
    public sendBroadcast(data: any, clientFilter = /.*/): void {
        const clients = Object.keys(this.clients)
            .filter((client) => clientFilter.test(client));

        if (clients.length === 0) {
            return;
        }

        const message: IBroadcast = {
            type: MessageTypes.Broadcast,
            data,
            filter: {
                source: clientFilter.source,
                flags: clientFilter.flags,
            },
        };

        clients.forEach((client) => {
            try {
                console.debug(`Emitting broadcast to client '${client}'`, message);
                this.clients[client].postMessage(message);
            } catch {
                // Failure, ignore for now
            }
        });
    }

    /**
     * @inheritDoc
     */
    public callMethod(method: string, args: any[]): Observable<any> {
        if (this.methodList.hasOwnProperty(method)) {
            console.debug("Handle method call locally", { method, args });
            return super.callMethod(method, args);
        } else if (!this.methodMapping.hasOwnProperty(method)) {
            return throwError(new MethodNotFoundException(method));
        }

        console.debug("Handling call remotely", { method, args });
        const handler = this.clients[this.methodMapping[method]];

        return handler.callMethod(method, args);
    }

    protected onClientConnect(port: PortWrapper) {
        console.debug(`New client connecting: ${port.name || "no-name"}`, port);

        if (!port.name || port.name.length === 0) {
            console.warn(`Connection ignored as it has no name`, port);
            return;
        }

        if (this.clients.hasOwnProperty(port.name)) {
            console.warn(`Connection from client with duplicate id '${port.name}' ignored`);
            return;
        }

        this.awaitMethodAdvertisement(port).subscribe(() => {
                port.disconnect$.subscribe(() => this.handlePortDisconnect(port));
                port.methodCall$.subscribe((call) => this.handleMethodCall(port, call));
                port.broadcast$.subscribe(({ data, filter }) => this.sendBroadcast(
                    data,
                    new RegExp(filter.source, filter.flags),
                ));
            }, (e: TimeoutError | Error) => {
                port.disconnect();

                if (e instanceof TimeoutError) {
                    console.warn(`Client '${port.name}' did not advertise it's methods in time, disconnected`);
                } else {
                    console.error(`Unknown error for client '${port.name}', disconnected`, e);
                }
            },
        );
    }

    /**
     * Cleans up after port disconnect
     *
     * @param {PortWrapper} port
     */
    protected handlePortDisconnect(port: PortWrapper) {
        console.debug(`Client '${port.name}' disconnected`);

        delete this.clients[port.name];

        // Remove client methods from method mapping
        this.methodMapping = Object.keys(this.methodMapping)
            .filter((method) => this.methodMapping[method] !== port.name)
            .reduce((mapping: IMethodMapping, method) => {
                mapping[method] = this.methodMapping[method];
                return mapping;
            }, {});
    }

    /**
     * Handle incoming method calls from ports
     *
     * @param {PortWrapper} port
     * @param {IMethodCall} call
     */
    protected handleMethodCall(port: PortWrapper, call: IMethodCall) {
        console.debug(`Handling method call from client '${port.name}'`, { ...call });

        const { method, args, id } = call;

        let out$: Observable<IMessage<any>>;
        if (this.methodList.hasOwnProperty(method)) {
            console.debug("Handling client call locally", { ...call });
            out$ = super.callMethod(method, args).pipe(
                takeUntil(race(port.disconnect$, port.onMethodUnsubscribe(id))),
            );
        } else if (this.methodMapping.hasOwnProperty(method)) {
            console.debug("Handling call remotely", { ...call });
            const handler = this.clients[this.methodMapping[method]];

            out$ = handler.sendPreparedMethodCall(call);
        } else {
            console.warn(`Call to unknown method '${method}'`, { name: method, args });
            out$ = throwError(new MethodNotFoundException(method));
        }

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
        ).subscribe((msg) => port.postMessage(msg));
    }

    /**
     * Wait for the client to advertise it's methods and register them
     */
    protected awaitMethodAdvertisement(port: PortWrapper): Observable<void> {
        return port.methodAdvertisement$.pipe(
            // Register client
            tap(() => { this.clients[port.name] = port; }),

            // Register client methods
            switchMap(({ methods }) => methods),
            rxFilter((method) => {
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
