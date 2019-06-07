import MessageTypes from "./message-types.enum";
import IMessage, { isMessage } from "./message.interface";

/**
 * @internal
 */
export default interface IMethodCompletion<R = any> extends IMessage<MessageTypes.MethodCompletion> {
    readonly id: string;
}

/**
 * @internal
 */
export function isMethodCompletion(obj: any): obj is IMethodCompletion {
    return isMessage(obj)
        && obj.type === MessageTypes.MethodCompletion
        && obj.hasOwnProperty("id");
}
