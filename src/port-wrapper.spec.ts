import PortWrapper from "./port-wrapper";

describe("PortWrapper", () => {
    test("PortWrapper.name returns wrapped port name", () => {
        const name = "test";
        const port = new PortWrapper({ name } as any);

        expect(port.name)
            .toEqual(name);
    });

    test("PortWrapper.postMessage() calls wrapped port.postMessage()", () => {
        const postMessage = jest.fn();
        const message: any = { rand: Math.random() };
        const port = new PortWrapper({ postMessage } as any);

        port.postMessage(message);

        expect(postMessage)
            .toHaveBeenCalledTimes(1);

        expect(postMessage)
            .toHaveBeenCalledWith(message);
    });

    test("PortWrapper.disconnect() calls wrapped port.disconnect() method", () => {
        const disconnect = jest.fn();
        const port = new PortWrapper({ disconnect } as any);

        port.disconnect();

        expect(disconnect)
            .toHaveBeenCalledTimes(1);

        expect(disconnect)
            .toHaveBeenCalledWith();
    });
});
