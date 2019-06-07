/**
 * @internal
 */
export default interface IBroadcaster {
    /**
     * Send broadcast to all clients that match the given filter
     *
     * @param {any} data - Data to broadcast
     * @param {RegExp} [clientFilter] - Client name filter
     */
    sendBroadcast(data: any, clientFilter: RegExp): void;
}
