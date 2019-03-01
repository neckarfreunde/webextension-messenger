import { BehaviorSubject, Observable, throwError } from "rxjs";
import { v4 } from "uuid";
import ConnectionStatus from "./connection-status.enum";
import MessengerException from "./exceptions/messenger.exception";
import IBroadcaster from "./interfaces/broadcaster.interface";
import MethodProxy from "./method-proxy";
import { IBroadcast } from "./models/broadcast.interface";
import MessageTypes from "./models/message-types.enum";
import PortWrapper from "./port-wrapper";
import { IMethodList } from "./types";

export default class Client<M extends IMethodList> extends MethodProxy<M> implements IBroadcaster {
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

    public constructor(prefix?: string) {
        super();

        this.id = `${(prefix) ? `${prefix}:` : ""}${v4()}`;
    }

    /**
     * Open runtime connection
     */
    public connect() {
        if (this.port) {
            throw new MessengerException("Already connected");
        }

        try {
            this.port = new PortWrapper(
                browser.runtime.connect(void 0, { name: this.id }),
            );
        } catch (e) {
            this.statusSub.next(ConnectionStatus.Failed);
            return;
        }

        this.port.disconnect$.subscribe(() => {
            this.statusSub.next(ConnectionStatus.Closed);
            this.port = undefined;
        });

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
        console.debug("Calling remote method", { method, args });
        return this.port!.callMethod(method, args);
    }
}
