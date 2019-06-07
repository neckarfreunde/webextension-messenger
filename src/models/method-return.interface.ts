import MessageTypes from "./message-types.enum";
import IMessage, { isMessage } from "./message.interface";

/**
 * @internal
 */
export default interface IMethodReturn<R = any> extends IMessage<MessageTypes.MethodReturn> {
    readonly id: string;
    readonly value: R;
}

/**
 * @internal
 */
export function isMethodReturn(obj: any): obj is IMethodReturn {
    return isMessage(obj)
        && obj.type === MessageTypes.MethodReturn
        && obj.hasOwnProperty("id");
}
