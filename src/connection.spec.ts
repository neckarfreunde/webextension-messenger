import { take, toArray } from "rxjs/operators";
import Connection from "./connection";
import ConnectionStatus from "./connection-status.enum";

describe("Connection", () => {
    test("if connect throws status goes from Connecting to Failed", (done) => {
        const connection = new Connection();

        connection.status$.pipe(
            take(2),
            toArray(),
        ).subscribe((states) => {
            expect(states)
                .toEqual([ConnectionStatus.Connecting, ConnectionStatus.Failed]);

            done();
        }, done);

        connection.connect();
    });
});
