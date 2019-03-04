import { timer } from "rxjs";
import { concatMap, filter, map } from "rxjs/operators";
import Client from "../src/client";
import { IBgMethods } from "./bg";
import { isRandNumber } from "./rand-number.interface";

const connection = new Client<IBgMethods>("content");
connection.connect();

const notif = document.createElement("div");
notif.style.position = "absolute";
notif.style.left = "5px";
notif.style.top = "5px";
notif.style.zIndex = "99999";
notif.style.border = "1px solid #000";
notif.style.background = "#ffff";
notif.style.padding = "5px";

connection.broadcast$.pipe(
    map(({ data }) => data),
    filter(isRandNumber),
    concatMap(({ randNumber }) => {
        notif.innerText = `Lucky number of the day ${randNumber}`;
        document.body.appendChild(notif);

        return timer(4000);
    }),
).subscribe(() => document.body.removeChild(notif));
