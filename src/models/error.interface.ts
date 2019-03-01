import IMessage, { isMessage } from "./message.interface";
import MessageTypes from "./messate-types.enum";

export default interface IError extends IMessage<MessageTypes.Error> {
    readonly id: string;
    readonly message: string;
    readonly stack?: string;
}

export function isError(obj: any): obj is IError {
    return isMessage(obj)
        && obj.type === MessageTypes.Error
        && obj.hasOwnProperty("id")
        && obj.hasOwnProperty("message");
}
