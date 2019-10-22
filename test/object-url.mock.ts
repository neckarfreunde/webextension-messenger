import { v4 } from "uuid";

export abstract class ObjectUrlMock {
    public static setUp() {
        ObjectUrlMock.blobs = {};

        URL.createObjectURL = ObjectUrlMock.createObjectUrl;
        URL.revokeObjectURL = ObjectUrlMock.revokeObjectUrl;
        window.fetch = ObjectUrlMock.fetch;
    }

    public static tearDown() {
        delete URL.createObjectURL;
        delete URL.revokeObjectURL;
        window.fetch = ObjectUrlMock.originalFetch;
    }

    public static clear() {
        ObjectUrlMock.blobs = {};
    }

    protected static readonly extractId = /^blob:(.+)$/i;

    protected static readonly originalFetch = window.fetch;

    protected static blobs: { [id: string]: Blob };

    protected static createObjectUrl(blob: Blob): string {
        const id = v4();

        ObjectUrlMock.blobs[id] = blob;

        return `blob:${id}`;
    }

    protected static revokeObjectUrl(url: string): void {
        const id = ObjectUrlMock.extractMockId(url);

        if (id) {
            delete ObjectUrlMock.blobs[id];
        }
    }

    protected static fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
        const id = ObjectUrlMock.extractMockId(input);
        if (id) {
            const blob: any = ObjectUrlMock.blobs[id];
            console.log(blob);

            const res: Response = {
                headers: {} as any,
                ok: true,
                redirected: false,
                status: 200,
                statusText: "OK",
                trailer: Promise.resolve({} as any),
                type: "basic",
                url: input as string,
                body: {} as any,
                bodyUsed: true,
                clone: () => ({ ...res }),
                arrayBuffer: () => blob.arrayBuffer(),
                blob: () => blob,
                formData: () => Promise.resolve({} as any),
                json: () => Promise.resolve({}),
                text: () => Promise.resolve(""),
            };

            return Promise.resolve(res);
        }

        return ObjectUrlMock.originalFetch(input, init);
    }

    protected static extractMockId(url: any): string | undefined {
        if (typeof url === "string") {
            const res = ObjectUrlMock.extractId.exec(url);

            if (res && res.length === 2) {
                return res[1];
            }
        }

        return undefined;
    }
}
