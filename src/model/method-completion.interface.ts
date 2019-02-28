import IMessage, { isMessage } from "./message.interface";
import MessageTypes from "./messate-types.enum";

export default interface IMethodCompletion<R = any> extends IMessage<MessageTypes.MethodCompletion> {
    readonly id: string;
}

export function isMethodCompletion(obj: any): obj is IMethodCompletion {
    return isMessage(obj)
        && obj.type === MessageTypes.MethodCompletion
        && obj.hasOwnProperty("id");
}
