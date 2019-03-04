import { fromEventPattern, of, race } from "rxjs";
import { catchError, finalize, map, takeUntil, tap } from "rxjs/operators";
import IBroadcaster from "./interfaces/broadcaster.interface";
import MethodHandler from "./method-handler";
import { IBroadcast } from "./models/broadcast.interface";
import IError from "./models/error.interface";
import MessageTypes from "./models/message-types.enum";
import IMethodCall from "./models/method-call.interface";
import IMethodCompletion from "./models/method-completion.interface";
import IMethodReturn from "./models/method-return.interface";
import PortWrapper from "./port-wrapper";
import { IMethodList } from "./types";

interface IClientList {
    [id: string]: PortWrapper;
}

export default class Router<M extends IMethodList> extends MethodHandler<M> implements IBroadcaster {
    /**
     * Mapping between client names and Ports
     */
    protected readonly clients: IClientList = {};

    public constructor(methods: IMethodList = {}) {
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

        this.clients[port.name] = port;

        port.disconnect$.subscribe(() => this.handlePortDisconnect(port));
        port.methodCall$.subscribe((call) => this.handleMethodCall(port, call));
        port.broadcast$.subscribe(({ data, filter }) => this.sendBroadcast(
            data,
            new RegExp(filter.source, filter.flags),
        ));
    }

    /**
     * Cleans up after port disconnect
     *
     * @param {PortWrapper} port
     */
    protected handlePortDisconnect(port: PortWrapper) {
        console.debug(`Client '${port.name}' disconnected`);

        delete this.clients[port.name];
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

        super.callMethod(method, args).pipe(
            map((value): IMethodReturn => ({
                type: MessageTypes.MethodReturn,
                id,
                value,
            })),

            tap((ret) => console.debug("Sending method return", ret)),

            takeUntil(race(port.disconnect$, port.onMethodUnsubscribe(id))),

            // Translate error into messages
            catchError((e: Error) => of({
                type: MessageTypes.Error,
                id,
                message: e.message,
                stack: e.stack,
            } as IError)),

            // Complete method call
            finalize(() => {
                if (!port.closed) {
                    port.postMessage({
                        type: MessageTypes.MethodCompletion,
                        id,
                    } as IMethodCompletion);
                }
            }),
        ).subscribe((msg) => port.postMessage(msg));
    }
}
