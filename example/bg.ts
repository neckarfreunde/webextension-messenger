import { Observable, timer } from "rxjs";
import { map, take } from "rxjs/operators";
import Router from "../src/router";
import { IMethodList } from "../src/types";
import { AllMethods } from "./interfaces";

export interface IBgMethods extends IMethodList {
    bgTimeSubscribe: () => Observable<number>;
}

const methods: IBgMethods = {
    bgTimeSubscribe: () => timer(0, 1000).pipe(
        map(() => Math.round(Date.now() / 1000)),
        take(10),
    ),
};

const router = new Router<AllMethods>(methods);
(window as any).router = router;
