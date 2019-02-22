import { Observable } from "rxjs";
import Connection from "./connection";
import { IMethodList } from "./types";

interface IHandlers extends IMethodList {
    greet: (name: string, age: number) => string;
    promise: () => Promise<number>;
    observable: () => Observable<string>;
}

const con = new Connection<IHandlers>({});

con.methods.greet("Robin", 29)
    .subscribe(console.log);

con.methods.promise()
    .subscribe(console.log);

con.methods.observable()
    .subscribe(console.log);
