import IMessage, { isMessage } from "./message.interface";
import MessageTypes from "./messate-types.enum";

export default interface IMethodAdvertisement extends IMessage<MessageTypes.MethodAdvertisement> {
    readonly methods: string[];
}

export function isMethodAdvertisement(obj: any): obj is IMethodAdvertisement {
    return isMessage(obj)
        && obj.type === MessageTypes.MethodAdvertisement
        && obj.hasOwnProperty("methods");
}
