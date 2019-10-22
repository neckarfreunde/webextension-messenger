import { Observable, ObservableInput, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";

/**
 * @internal
 */
export const makeVoid = () => (source: Observable<any>): Observable<void> => source.pipe(
    map(() => { /* Make void */ }),
);

/**
 * Switch to result of fn() if condition() returns true
 */
export const switchIf = <T, O>(condition: (value: T) => boolean, fn: (value: T) => ObservableInput<O>) =>
    (source: Observable<T>) => source.pipe(
        switchMap((value) => (condition(value)) ? fn(value) : of(value)),
    );
