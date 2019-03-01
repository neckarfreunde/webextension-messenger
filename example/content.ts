import { filter, mergeMap, take } from "rxjs/operators";
import Connection from "../src/connection";
import ConnectionStatus from "../src/connection-status.enum";
import { IMethodList } from "../src/types";
import { AllMethods } from "./interfaces";

export interface IContentMethods extends IMethodList {
    reload: (why: string) => void;
}

const methods: IContentMethods = {
    reload: () => window.location.reload(),
};

const connection = new Connection<AllMethods>("content", methods);
connection.connect();

connection.status$.pipe(
    filter((c) => c === ConnectionStatus.Connected),
    mergeMap(() => connection.methods.bgTimeSubscribe()),
    take(3),
).subscribe(console.log.bind(void 0, "got time"));

connection.broadcast$.subscribe(console.log.bind(void 0, "broadcast"));
