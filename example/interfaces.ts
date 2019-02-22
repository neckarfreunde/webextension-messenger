import { IMethodList } from "../src/types";

export interface IBgMethods extends IMethodList {
    time: () => number;
}

export interface IActionMethods extends IMethodList {
    print: (value: string) => void;
}

export type AllMethods = IBgMethods & IActionMethods;
