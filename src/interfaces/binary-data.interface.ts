export enum BinaryDataTypes {
    Blob = "blob",
    ArrayBuffer = "array-buffer",
}

/**
 * @internal
 */
export interface IBinaryData<T extends BinaryDataTypes = BinaryDataTypes> {
    readonly originalType: T;
    readonly dataObject: string;
}

// noinspection SuspiciousTypeOfGuard
export const isBinaryDataObject = (obj: any): obj is IBinaryData => typeof obj === "object" &&
    !Array.isArray(obj) &&
    obj.hasOwnProperty("originalType") &&
    obj.hasOwnProperty("dataObject") &&
    typeof obj.dataObject === "string" &&
    obj.dataObject.startsWith("blob:") &&
    Object.values(BinaryDataTypes).includes(obj.originalType);
