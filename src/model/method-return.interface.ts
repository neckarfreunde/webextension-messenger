import IMessage, { isMessage } from "./message.interface";
import MessageTypes from "./messate-types.enum";

export default interface IMethodReturn<R = any> extends IMessage<MessageTypes.MethodReturn> {
    readonly id: string;
    readonly return: R;
}

export function isMethodReturn(obj: any): obj is IMethodReturn {
    return isMessage(obj)
        && obj.type === MessageTypes.MethodReturn
        && obj.hasOwnProperty("id")
        && obj.hasOwnProperty("return");
}
