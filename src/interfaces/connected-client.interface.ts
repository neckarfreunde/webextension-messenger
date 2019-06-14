export interface IConnectedClient {
    readonly name: string;
    readonly tab?: browser.tabs.Tab;
}
