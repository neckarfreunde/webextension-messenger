import MessengerException from "./messenger.exception";

export default class RemoteMethodException extends MessengerException {
    public constructor(message: string, public readonly remoteStack?: string) {
        super(message);
    }
}
