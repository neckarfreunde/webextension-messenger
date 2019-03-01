import MessageTypes from "./message-types.enum";
import IMessage, { isMessage } from "./message.interface";
import IRegularExpression, { isRegularExpression } from "./regular-expression.interface";

export interface IBroadcast<D = any> extends IMessage<MessageTypes.Broadcast> {
    readonly data: D;
    readonly filter: IRegularExpression;
}

export function isBroadcast(obj: any): obj is IBroadcast {
    return isMessage(obj)
        && obj.type === MessageTypes.Broadcast
        && obj.hasOwnProperty("data")
        && obj.hasOwnProperty("filter")
        && isRegularExpression(obj.filter);
}
