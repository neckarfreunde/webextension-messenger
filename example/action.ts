import { filter, switchMap, take, tap } from "rxjs/operators";
import Connection from "../src/connection";
import ConnectionStatus from "../src/connection-status.enum";
import { AllMethods, IActionMethods } from "./interfaces";

const btnBroadcast = document.getElementById("btnBroadcast") as HTMLButtonElement;
const divStatus = document.getElementById("divStatus") as HTMLDivElement;
const divTime = document.getElementById("divTime") as HTMLDivElement;

const methods: IActionMethods = {
    print: (value) => {
        divStatus.innerText = value;
    },
};

btnBroadcast.disabled = true;

const connection = new Connection<AllMethods>("action", methods);

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
