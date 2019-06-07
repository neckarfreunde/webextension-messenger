enum MessageTypes {
    Broadcast = "broadcast",
    MethodCall = "method-call",
    MethodReturn = "method-return",
    MethodCompletion = "method-completion",
    MethodUnsubscribe = "method-unsubscribe",
    Error = "error",
}

/**
 * @internal
 */
export default MessageTypes;
