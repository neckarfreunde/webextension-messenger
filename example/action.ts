import { fromEvent, merge } from "rxjs";
import { concatMap, filter, switchMap, take, tap } from "rxjs/operators";
import { Client, ConnectionStatus } from "../src";
import { IBgMethods } from "./bg";
import IRandNumber from "./rand-number.interface";

const btnBroadcast = document.getElementById("btnBroadcast") as HTMLButtonElement;
const btnBroadcastDelayed = document.getElementById("btnBroadcastDelayed") as HTMLButtonElement;
const btnBinary = document.getElementById("btnBinary") as HTMLDivElement;
const divTime = document.getElementById("divTime") as HTMLDivElement;

btnBroadcast.disabled = true;

const connection = new Client<IBgMethods>("action");

connection.status$.pipe(
    filter((status) => status === ConnectionStatus.Connected),
    tap(() => { btnBroadcast.disabled = false; }),
    take(1),

    switchMap(() => connection.methods.subscribeTime()),
).subscribe((time) => { divTime.innerText = time; });

connection.connect();

const broadcastClick$ = fromEvent(btnBroadcast, "click");
const broadcastDelayedClick$ = fromEvent(btnBroadcastDelayed, "click").pipe(
    tap(() => console.log("before")),
    concatMap(() => connection.methods.setTimeout(3000)),
    tap(() => console.log("after")),
);

merge(broadcastClick$, broadcastDelayedClick$).pipe(
    concatMap(() => connection.methods.randInt({ min: 1, max: 100 })),
).subscribe((randNumber) => {
    const broadcast: IRandNumber = { randNumber };
    connection.sendBroadcast(broadcast, /^content/i);
});

fromEvent(btnBinary, "click").pipe(
    switchMap(() => {
        const buffer = new Uint8Array(4);
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = i + 1;
        }

        return connection.methods.testBinary(buffer.buffer);
    }),
).subscribe((retBuffer: ArrayBuffer) => {
    const intBuff = new Uint8Array(retBuffer);

    console.log(intBuff);
});
