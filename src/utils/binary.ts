import { from, Observable, of } from "rxjs";
import { concatMap, filter, map, reduce, switchMap, tap } from "rxjs/operators";
import { BinaryDataTypes, IBinaryData, isBinaryDataObject } from "../interfaces/binary-data.interface";
import { switchIf } from "./operators";

declare type SupportedBinaryTypes = Blob | ArrayBuffer;

interface IDecodedBinaryDataTypes {
    [BinaryDataTypes.Blob]: Blob;
    [BinaryDataTypes.ArrayBuffer]: ArrayBuffer;
}

declare type DecodedBinaryObject<T> = {
    [P in keyof T]: T[P] extends IBinaryData<infer D>
        ? IDecodedBinaryDataTypes[D]
        : T extends { [x: string]: any }
            ? DecodedBinaryObject<T[P]>
            : T;
};

declare type EncodedBinaryType<T> = T extends Blob
    ? IBinaryData<BinaryDataTypes.Blob>
    : T extends ArrayBuffer
        ? IBinaryData<BinaryDataTypes.ArrayBuffer>
        : T extends { [x: string]: any }
            ? EncodedBinaryObject<T>
            : T;

declare type EncodedBinaryObject<T> = {
    [P in keyof T]: EncodedBinaryType<T[P]>;
};

/**
 * Converts a Blob or ArrayBuffer into a BinaryData object
 */
export function binToObjUrl(obj: SupportedBinaryTypes): IBinaryData {
    let originalType = BinaryDataTypes.Blob;
    if (obj instanceof ArrayBuffer) {
        originalType = BinaryDataTypes.ArrayBuffer;
        obj = new Blob([obj]);
    }

    const dataObject = URL.createObjectURL(obj);

    return {
        originalType,
        dataObject,
    };
}

/**
 * Encodes a single binary property
 */
function encodeBinaryProperty(value: any): any {
    if (value instanceof Blob || value instanceof ArrayBuffer) {
        return binToObjUrl(value);
    } else if (typeof value === "object") {
        if (Array.isArray(value)) {
            return value.map((encodeBinaryProperty));
        } else {
            return encodeBinaryProperties(value);
        }
    }

    return value;
}

/**
 * Recursively encodes all Blobs and ArrayBuffers into binary object URLs
 */
export function encodeBinaryProperties<T extends { [x: string]: any }>(obj: T): EncodedBinaryObject<T> {
    const ret: any = {};

    for (const key of Object.keys(obj)) {
        if (!obj.hasOwnProperty(key)) {
            continue;
        }

        ret[key] = encodeBinaryProperty(obj[key]);
    }

    return ret;
}

/**
 * Parses the given binary data description and parses it back into its original type
 */
export function objUrlToBin<K extends BinaryDataTypes>(obj: IBinaryData<K>): Observable<IDecodedBinaryDataTypes[K]> {
    const { dataObject, originalType } = obj;

    return from(fetch(dataObject)).pipe(
        switchMap((r) => r.blob()),
        switchIf(() => originalType !== BinaryDataTypes.Blob, (blob: any) => blob.arrayBuffer()),

        tap(() => URL.revokeObjectURL(dataObject)),
    );
}

/**
 * Decode values if binary, recursively if array or object
 */
function decodeBinaryProperty(value: any): Observable<any> {
    if (typeof value === "object") {
        if (Array.isArray(value)) {
            return from(value).pipe(
                concatMap(decodeBinaryProperty),
            );
        } else if (isBinaryDataObject(value)) {
            return objUrlToBin(value);
        } else if (typeof value === "object") {
            return decodeBinaryProperties(value);
        }
    }

    return of(value);
}

/**
 * Recursively decodes all data objects to their original binary data types
 */
export function decodeBinaryProperties<T extends { [x: string]: any }>(obj: T): Observable<DecodedBinaryObject<T>> {
    return from(Object.keys(obj)).pipe(
        filter((key) => obj.hasOwnProperty(key)),
        map((key) => ({
            key,
            value: obj[key],
        })),

        concatMap(({ key, value }) => decodeBinaryProperty(value).pipe(
            map((decoded) => ({ key, value: decoded })),
        )),

        reduce((acc: any, { key, value }) => {
            acc[key] = value;
            return acc;
        }, {}),
    );
}
