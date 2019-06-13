import { interval, Observable } from "rxjs";
import { take, toArray } from "rxjs/operators";
import MethodNotFoundException from "../exceptions/method-not-found.exception";
import MethodHandler from "./method-handler";

interface ITestMethods {
    plain: (name: string) => string;
    promise: () => Promise<boolean>;
    observable: () => Observable<number>;
}

class TestHandler extends MethodHandler<ITestMethods> {
    public constructor(methods: ITestMethods) {
        super(methods);
    }
}

const plain = (name: string) => `Hello ${name}!`;

describe("MethodHandler", () => {
    const testMethods: ITestMethods = {
        plain: jest.fn()
            .mockImplementation(plain),
        promise: jest.fn()
            .mockImplementation(() => Promise.resolve(true)),
        observable: jest.fn()
            .mockImplementation(() => interval(10).pipe(take(3))),
    };

    let handler: TestHandler;

    beforeEach(() => {
        jest.clearAllMocks();

        handler = new TestHandler(testMethods);
    });

    test("correctly calls method and returns plain values as observables", (done) => {
        const name = "Tester";
        const ret = handler.methods.plain(name);

        expect(ret)
            .toBeInstanceOf(Observable);

        ret.subscribe((greeting) => {
            expect(testMethods.plain)
                .toHaveBeenCalledTimes(1);

            expect(testMethods.plain)
                .toHaveBeenCalledWith(name);

            expect(typeof greeting)
                .toEqual("string");

            expect(greeting)
                .toEqual(plain(name));

            done();
        }, done);
    });

    test("correctly converts promises to observables", (done) => {
        const ret = handler.methods.promise();

        expect(ret)
            .toBeInstanceOf(Observable);

        ret.subscribe((bool) => {
            expect(testMethods.promise)
                .toHaveBeenCalledTimes(1);

            expect(testMethods.promise)
                .toHaveBeenCalledWith();

            expect(bool)
                .toBeTruthy();

            done();
        }, done);
    });

    test("returns observables as is", (done) => {
        const ret = handler.methods.observable();

        expect(ret)
            .toBeInstanceOf(Observable);

        ret.pipe(
            toArray(),
        ).subscribe((numbers) => {
            expect(testMethods.observable)
                .toHaveBeenCalledTimes(1);

            expect(testMethods.observable)
                .toHaveBeenCalledWith();

            expect(Array.isArray(numbers))
                .toBeTruthy();

            expect(numbers)
                .toEqual([0, 1, 2]);

            done();
        }, done);
    });

    test("throws not found exception for unknown methods", (done) => {
        const ret: Observable<any> = (handler.methods as any).unknown();

        expect(ret)
            .toBeInstanceOf(Observable);

        ret.subscribe(
            () => done("should not emit"),
            (e: MethodNotFoundException) => {
                expect(e)
                    .toBeInstanceOf(MethodNotFoundException);

                done();
            },
        );
    });
});
