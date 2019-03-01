import MessengerException from "./messenger.exception";

export default class RemoteMethodException extends MessengerException {
    public constructor(
        public readonly id: string,
        message: string,
        public readonly remoteStack?: string,
    ) {
        super(message);
    }
}
