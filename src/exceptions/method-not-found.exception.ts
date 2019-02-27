import MessengerException from "./messenger.exception";

export default class MethodNotFoundException extends MessengerException {
    public constructor(methodName: string) {
        super(`No such method: '${methodName}`);
    }
}
