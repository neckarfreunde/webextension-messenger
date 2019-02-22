import MessageTypes from "./messate-types.enum";

export default interface IMessage<T = MessageTypes> {
    readonly type: T;
}

export function isMessage(obj: any): obj is IMessage {
    return typeof obj === "object"
        && obj.hasOwnProperty("type") && Object.values(MessageTypes).includes(obj.type);
}
