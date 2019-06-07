import MessageTypes from "./message-types.enum";

/**
 * @internal
 */
export default interface IMessage<T extends MessageTypes> {
    readonly type: T;

    [x: string]: any;
}

/**
 * @internal
 */
export function isMessage(obj: any): obj is IMessage<any> {
    return typeof obj === "object"
        && obj.hasOwnProperty("type") && Object.values(MessageTypes).includes(obj.type);
}
