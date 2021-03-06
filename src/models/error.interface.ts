import MessageTypes from "./message-types.enum";
import IMessage, { isMessage } from "./message.interface";

/**
 * @internal
 */
export default interface IError extends IMessage<MessageTypes.Error> {
    readonly id: string;
    readonly message: string;
    readonly stack?: string;
}

/**
 * @internal
 */
export function isError(obj: any): obj is IError {
    return isMessage(obj)
        && obj.type === MessageTypes.Error
        && obj.hasOwnProperty("id")
        && obj.hasOwnProperty("message");
}
