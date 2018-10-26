// It is recommended to use the Container component in Node.js
import { Container } from "js-data";
import { RethinkDBAdapter } from "js-data-rethinkdb";
import { r } from "rethinkdb-ts";

const rethinkOptions = {
  db: process.env.RETHINKDB_DATABASE || "dev",
  host: process.env.RETHINKDB_HOST || "localhost",
  password: process.env.RETHINKDB_PASSWORD || "",
  port: +(process.env.RETHINKDB_PORT || 28015),
  ssl: process.env.RETHINKDB_USE_SSL || false,
  user: process.env.RETHINKDB_USER || "admin",
};

const connectRethinkDbDev = async () => await r.connectPool(rethinkOptions);

const rethinkDashOptions = Object.assign({}, rethinkOptions, {
  discovery: process.env.RETHINKDB_DISCOVERY || false,
  // servers: an array of objects {host: <string>, port: <number>} representing RethinkDB nodes to connect to
});

const rethinkdbAdapter = new RethinkDBAdapter({
  // Pass config to rethinkdbdash here
  rOpts: rethinkDashOptions,
});

class StoreDB extends Container {
  constructor() {
    super();
  }
}
const Store: StoreDB = new StoreDB();
// "store" will now use a RethinkDB adapter by default
Store.registerAdapter("rethinkdb", rethinkdbAdapter, { default: true });

export { connectRethinkDbDev, r, rethinkDashOptions, Store };
export { Schema } from "js-data";
