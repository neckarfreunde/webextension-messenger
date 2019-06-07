import MessageTypes from "./message-types.enum";
import IMessage, { isMessage } from "./message.interface";

/**
 * @internal
 */
export default interface IMethodUnsubscribe extends IMessage<MessageTypes.MethodUnsubscribe> {
    readonly id: string;
}

/**
 * @internal
 */
export function isMethodUnsubscribe(obj: any): obj is IMethodUnsubscribe {
    return isMessage(obj)
        && obj.type === MessageTypes.MethodUnsubscribe
        && obj.hasOwnProperty("id");
}
