import { filter, mergeMap, take } from "rxjs/operators";
import Client from "../src/client";
import ConnectionStatus from "../src/connection-status.enum";
import { IBgMethods } from "./bg";

const connection = new Client<IBgMethods>("content");
connection.connect();

connection.status$.pipe(
    filter((c) => c === ConnectionStatus.Connected),
    mergeMap(() => connection.methods.bgTimeSubscribe()),
    take(3),
).subscribe(console.log.bind(void 0, "got time"));

connection.broadcast$.subscribe(console.log.bind(void 0, "broadcast"));
