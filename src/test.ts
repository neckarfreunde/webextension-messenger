import { timer } from "rxjs";
import { map, take } from "rxjs/operators";
import Router from "./router";

class Commands {
    public one() {
        return timer(0, 1000).pipe(
            map((n) => (n % 2 === 0) ? "tick" : "tock"),
        );
    }

    public two() {
        return "this is it";
    }
}

const router = new Router(new Commands());

router.methods.one().pipe(
    take(10),
).subscribe(console.warn);

// @ts-ignore
router.methods.nothing().subscribe({
    error: console.warn,
});

router.methods.two().subscribe(console.log);
