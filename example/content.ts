import { timer } from "rxjs";
import { concatMap, filter, map } from "rxjs/operators";
import { Client } from "../src";
import { IBgMethods } from "./bg";
import { isRandNumber } from "./rand-number.interface";

const connection = new Client<IBgMethods>("content");
connection.connect();

const notification = document.createElement("div");
notification.style.position = "absolute";
notification.style.left = "5px";
notification.style.top = "5px";
notification.style.zIndex = "99999";
notification.style.border = "1px solid #000";
notification.style.background = "#ffff";
notification.style.padding = "5px";

connection.broadcast$.pipe(
    map(({ data }) => data),
    filter(isRandNumber),
    concatMap(({ randNumber }) => {
        notification.innerText = `Lucky number of the day ${randNumber}`;
        document.body.appendChild(notification);

        return timer(4000);
    }),
).subscribe(() => document.body.removeChild(notification));
