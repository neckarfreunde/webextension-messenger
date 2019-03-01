import { filter, switchMap, take, tap } from "rxjs/operators";
import Client from "../src/client";
import ConnectionStatus from "../src/connection-status.enum";
import { IBgMethods } from "./bg";

const btnBroadcast = document.getElementById("btnBroadcast") as HTMLButtonElement;
const divStatus = document.getElementById("divStatus") as HTMLDivElement;
const divTime = document.getElementById("divTime") as HTMLDivElement;

btnBroadcast.disabled = true;

const connection = new Client<IBgMethods>("action");

connection.status$.subscribe((status) => { divStatus.innerText = status; });
connection.status$.pipe(
    filter((status) => status === ConnectionStatus.Connected),
    tap(() => { btnBroadcast.disabled = false; }),
    take(1),

    switchMap(() => connection.methods.bgTimeSubscribe(10)),
).subscribe((time) => { divTime.innerText = `${time}`; });

connection.connect();

btnBroadcast.addEventListener("click", () => connection.sendBroadcast({
    time: Date.now(),
}, /^content:.*/));
