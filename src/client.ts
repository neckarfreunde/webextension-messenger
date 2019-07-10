import { BehaviorSubject, fromEvent, Observable, throwError } from "rxjs";
import { filter, finalize, skip, switchMap, switchMapTo, take, tap } from "rxjs/operators";
import { v4 } from "uuid";
import ConnectionStatus from "./connection-status.enum";
import MessengerException from "./exceptions/messenger.exception";
import IBroadcaster from "./interfaces/broadcaster.interface";
import { IBroadcast } from "./models/broadcast.interface";
import MessageTypes from "./models/message-types.enum";
import MethodProxy from "./utils/method-proxy";
import PortWrapper from "./utils/port-wrapper";
import { FIREFOX_CANARY_ID, isFirefox } from "./utils/utils";

export default class Client<T> extends MethodProxy<T> implements IBroadcaster {
    public get status$(): Observable<ConnectionStatus> {
        return this.statusSub.asObservable();
    }

    public get broadcast$(): Observable<IBroadcast<any>> {
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

        if (isFirefox()) {
            // Port.onDisconnect is not triggered by Firefox when the extension is disabled/removed
            // This is a workaround based on https://stackoverflow.com/a/47361379
            this.createFirefoxCanary()
                .subscribe(() => this.statusSub.next(ConnectionStatus.Closed));
        }

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
    protected callMethod(method: keyof T, args: any[]): Observable<any> {
        console.debug("Calling remote method", { method, args });
        return this.port!.callMethod(method, args);
    }

    /**
     * Creates a canary element to detect when the extension is disabled/removed
     *
     * Based on https://stackoverflow.com/a/47361379
     */
    protected createFirefoxCanary() {
        const canary = document.createElement("span");
        canary.id = FIREFOX_CANARY_ID;

        // Ensure nothing is visible
        canary.style.display = "block";
        canary.style.width = "0";
        canary.style.height = "0";

        // Enable transition to use "transitionstart" event
        canary.style.opacity = "1";
        canary.style.transition = "opacity 1ms 100ms";

        let o$ = this.status$.pipe(
            // Wait for connection to start
            filter((status) => status === ConnectionStatus.Connected),
            take(1),
            tap(() => console.log("connection ready")),

            // Wait for transition indicating injected CSS was removed
            switchMap(() => fromEvent(canary, "transitionstart")),
            skip(1),
            take(1),

            tap(console.log.bind(void 0, "transition")),

            // Cleanup
            finalize(() => {
                console.log("finalizing");
                document.body.removeChild(canary);
            }),
        );

        if (document.readyState === "complete") {
            console.log("complete add canary", canary);
            document.body.appendChild(canary);
        } else {
            console.log("not complete, waiting");
            o$ = fromEvent(document, "readystatechange").pipe(
                take(1),
                tap(() => {
                    console.log("now is complete, adding canary", canary);
                    document.body.appendChild(canary);
                }),

                switchMapTo(o$),
            );
        }

        return o$;
    }
}
