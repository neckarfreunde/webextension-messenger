import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * @internal
 */
export const makeVoid = () => (source: Observable<any>): Observable<void> => source.pipe(
    map(() => { /* Make void */ }),
);
