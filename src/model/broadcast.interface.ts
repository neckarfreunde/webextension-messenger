import IMessage, { isMessage } from "./message.interface";
import MessageTypes from "./messate-types.enum";

export interface IBroadcast<D = any> extends IMessage<MessageTypes.Broadcast> {
    readonly data: D;
    readonly filter: string;
}

export function isBroadcast(obj: any): obj is IBroadcast {
    return isMessage(obj)
        && obj.type === MessageTypes.Broadcast
        && obj.hasOwnProperty("data");
}
