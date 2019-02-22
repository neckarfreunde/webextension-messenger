import Connection from "../src/connection";

console.log("bg");

const connection = new Connection({}, "content");

connection.status$.subscribe((status) => console.log("con status", status));

connection.broadcast$.subscribe((data) => console.log("got broadcast", data));

connection.connect();
