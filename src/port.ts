/* tslint:disable:member-ordering */

import { fromEventPattern, merge, Observable, race, throwError } from "rxjs";
import { filter, finalize, map, shareReplay, switchMap, take, takeUntil, tap } from "rxjs/operators";
import { v4 } from "uuid";
import RemoteMethodException from "./exceptions/remote-method.exception";
import { IBroadcast, isBroadcast } from "./model/broadcast.interface";
import { isError } from "./model/error.interface";
import IMessage, { isMessage } from "./model/message.interface";
import MessageTypes from "./model/messate-types.enum";
import IMethodAdvertisement, { isMethodAdvertisement } from "./model/method-advertisement.interface";
import IMethodCall, { isMethodCall } from "./model/method-call.interface";
import IMethodCompletion, { isMethodCompletion } from "./model/method-completion.interface";
import IMethodReturn, { isMethodReturn } from "./model/method-return.interface";
import IMethodUnsubscribe, { isMethodUnsubscribe } from "./model/method-unsubscribe.interface";
import { makeVoid } from "./utils/operators";

// TODO Debug logging
/**
 * Wrapper around browser.runtime.Port object that provides common helper properties/methods
 */
export default class Port {
    public readonly disconnect$: Observable<void> = this.listenDisconnect();

    protected readonly message$: Observable<IMessage<any>> = this.listenMessages();

    public readonly methodCall$: Observable<IMethodCall> = this.message$.pipe(
        filter(isMethodCall),
    );

    public readonly methodAdvertisement$: Observable<IMethodAdvertisement> = this.message$.pipe(
        filter(isMethodAdvertisement),
        take(1),

        shareReplay(),
    );

    public broadcast$: Observable<IBroadcast> = this.message$.pipe(
        filter(isBroadcast),
    );

    protected readonly methodReturn$: Observable<IMethodReturn> = this.message$.pipe(
        filter(isMethodReturn),
    );

    protected readonly methodCompletion$: Observable<IMethodCompletion> = this.message$.pipe(
        filter(isMethodCompletion),
    );

    protected readonly methodUnsubscribe$: Observable<IMethodUnsubscribe> = this.message$.pipe(
        filter(isMethodUnsubscribe),
    );

    protected readonly methodException$: Observable<RemoteMethodException> = this.message$.pipe(
        filter(isError),
        map(({ id, message, stack }) => new RemoteMethodException(id, message, stack)),
    );

    public get name(): string {
        return this.port.name;
    }

    public constructor(
        protected readonly port: browser.runtime.Port,
    ) { }

    public postMessage(message: IMessage<any>): void {
        this.port.postMessage(message);
    }

    public disconnect(): void {
        this.port.disconnect();
    }

    public callMethod(method: string, args: any[]): Observable<any> {
        return this.sendPreparedMethodCall({
            type: MessageTypes.MethodCall,
            args,
            method,
            id: v4(),
        });
    }

    /**
     * Send already prepared method call
     *
     * @param {IMethodCall} call - The method call to send
     */
    public sendPreparedMethodCall(call: IMethodCall): Observable<any> {
        const { id, method } = call;

        let completed = false;
        const complete$ = this.methodCompletion$.pipe(
            filter((msg) => msg.id === id),
            take(1),

            tap(() => { completed = true; }),
        );

        const unsubscribe$ = this.methodUnsubscribe$.pipe(
            filter((msg) => msg.id === id),
            take(1),
        );

        const until$ = race(this.disconnect$, complete$, unsubscribe$);

        const return$ = this.methodReturn$.pipe(
            filter((msg) => msg.id === id),
        );

        const error$ = this.methodException$.pipe(
            filter((err) => err.id === id),
            take(1),

            switchMap((err) => throwError(err)),
        );

        this.port.postMessage(call);

        return merge(return$, error$).pipe(
            map(({ value }) => value),
            tap((value) => {
                console.debug("Received method call return", {
                    id,
                    method,
                    value,
                });
            }),

            takeUntil(until$),

            finalize(() => {
                if (!completed) {
                    // Stop method execution on the other end
                    this.port!.postMessage({
                        type: MessageTypes.MethodUnsubscribe,
                        id,
                    } as IMethodUnsubscribe);
                }

                console.debug("Return stream closed", { id, method, completed });
            }),
        );
    }

    /**
     * Listen for method unsubscription
     *
     * @param {string} id - The method call ID
     */
    public onMethodUnsubscribe(id: string): Observable<IMethodUnsubscribe> {
        return this.methodUnsubscribe$.pipe(
            filter((msg) => msg.id === id),
            take(1),
        );
    }

    /**
     * Listen to port disconnect
     */
    protected listenDisconnect(): Observable<void> {
        return fromEventPattern(
            (handler) => this.port.onDisconnect.addListener(handler),
            (handler) => this.port.onDisconnect.removeListener(handler),
        ).pipe(
            makeVoid(),
            take(1),
        );
    }

    /**
     * Listen to incoming port messages
     */
    protected listenMessages(): Observable<IMessage<any>> {
        return fromEventPattern<[any, any]>(
            (listener) => this.port.onMessage.addListener(listener),
            (listener) => this.port.onMessage.removeListener(listener),
        ).pipe(
            takeUntil(this.disconnect$),

            map(([msg]) => msg),
            filter(isMessage),
        );
    }
}
