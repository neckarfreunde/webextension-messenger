import { ObjectUrlMock } from "../../test/object-url.mock";
import { binToObjUrl } from "./binary";

beforeAll(() => ObjectUrlMock.setUp());

afterAll(() => ObjectUrlMock.tearDown());

afterEach(() => ObjectUrlMock.clear());

describe("binToObjUrl()", () => {
    test("Correctly encodes blobs", () => {
        console.log(Blob.arguments);
        const blob = new Blob([new Uint8Array([1, 2, 3])]);
        console.dir(blob);
        const { dataObject } = binToObjUrl(blob);

        return fetch(dataObject)
            .then((r) => console.log(r.arrayBuffer()));
    });
});
