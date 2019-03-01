export default interface IRegularExpression {
    readonly source: string;
    readonly flags: string;
}

export const isRegularExpression = (obj: any): obj is IRegularExpression => typeof obj === "object"
    && obj.hasOwnProperty("source")
    && obj.hasOwnProperty("flags");
