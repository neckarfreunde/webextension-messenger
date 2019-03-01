import { IMethodList } from "../src/types";
import { IBgMethods } from "./bg";
import { IContentMethods } from "./content";

export interface IActionMethods extends IMethodList {
    print: (value: string) => void;
}

export type AllMethods = IBgMethods & IActionMethods & IContentMethods;
