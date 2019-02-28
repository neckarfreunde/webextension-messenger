import { filter, switchMap } from "rxjs/operators";
import Connection from "../src/connection";
import ConnectionStatus from "../src/connection-status.enum";
import { AllMethods } from "./interfaces";

const connection = new Connection<AllMethods>("content");
connection.connect();

connection.status$.pipe(
    filter((c) => c === ConnectionStatus.Connected),
    switchMap(() => connection.methods.bgTimeSubscribe()),
).subscribe(console.log.bind(void 0, "got time"));
