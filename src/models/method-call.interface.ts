import MessageTypes from "./message-types.enum";
import IMessage, { isMessage } from "./message.interface";

export default interface IMethodCall extends IMessage<MessageTypes.MethodCall> {
    readonly id: string;
    readonly method: string;
    readonly args: any[];
}

export function isMethodCall(obj: any): obj is IMethodCall {
    return isMessage(obj)
        && obj.type === MessageTypes.MethodCall
        && obj.hasOwnProperty("id")
        && obj.hasOwnProperty("method")
        && obj.hasOwnProperty("args");
}