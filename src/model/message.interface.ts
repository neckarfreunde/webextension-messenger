import MessageTypes from "./messate-types.enum";

export default interface IMessage<T extends MessageTypes> {
    readonly type: T;

    [x: string]: any;
}

export function isMessage(obj: any): obj is IMessage<any> {
    return typeof obj === "object"
        && obj.hasOwnProperty("type") && Object.values(MessageTypes).includes(obj.type);
}
