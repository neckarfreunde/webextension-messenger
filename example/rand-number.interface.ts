export default interface IRandNumber {
    readonly randNumber: number;
}

export const isRandNumber = (obj: any): obj is IRandNumber => typeof obj === "object"
    && obj.hasOwnProperty("randNumber");
