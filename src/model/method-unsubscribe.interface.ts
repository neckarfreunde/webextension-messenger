import IMessage, { isMessage } from "./message.interface";
import MessageTypes from "./messate-types.enum";

export default interface IMethodUnsubscribe extends IMessage<MessageTypes.MethodUnsubscribe> {
    readonly id: string;
}

export function isMethodUnsubscribe(obj: any): obj is IMethodUnsubscribe {
    return isMessage(obj)
        && obj.type === MessageTypes.MethodUnsubscribe
        && obj.hasOwnProperty("id");
}
