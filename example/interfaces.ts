import { IMethodList } from "../src/types";
import { IBgMethods } from "./bg";

export interface IActionMethods extends IMethodList {
    print: (value: string) => void;
}

export type AllMethods = IBgMethods & IActionMethods;
