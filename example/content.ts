import { filter, mergeMap, take } from "rxjs/operators";
import Connection from "../src/connection";
import ConnectionStatus from "../src/connection-status.enum";
import { AllMethods } from "./interfaces";

const connection = new Connection<AllMethods>("content");
connection.connect();

connection.status$.pipe(
    filter((c) => c === ConnectionStatus.Connected),
    mergeMap(() => connection.methods.bgTimeSubscribe()),
    take(3),
).subscribe(console.log.bind(void 0, "got time"));

connection.broadcast$.subscribe(console.log.bind(void 0, "broadcast"));
