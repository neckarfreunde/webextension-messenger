import { Observable, timer } from "rxjs";
import { map } from "rxjs/operators";
import { IMethodList, Router } from "../src";

interface IRandConfig {
    min: number;
    max: number;
}

export interface IBgMethods extends IMethodList {
    subscribeTime: () => Observable<string>;
    randInt: (config: IRandConfig) => number;
    setTimeout: (duration: number) => Promise<void>;
}

const methods: IBgMethods = {
    /**
     * Example of a continuous observable subscription
     */
    subscribeTime: () => timer(0, 1000).pipe(
        map(() => {
            const now = new Date();
            return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
        }),
    ),

    /**
     * Example of a one of return value
     */
    randInt: ({ min, max }: IRandConfig): number => {
        min = Math.ceil(min);
        max = Math.floor(max);

        return Math.floor(Math.random() * (max - min) + min);
    },

    /**
     * Example of a one of promise
     */
    setTimeout: (duration: number) => new Promise((resolve) => {
        console.log("set timeout");
        setTimeout(() => {
            console.log("resolve");
            resolve(void 0);
        }, duration);
    }),
};

const router = new Router<IBgMethods>(methods);
(window as any).router = router;
