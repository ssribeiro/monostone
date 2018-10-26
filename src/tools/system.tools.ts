// import * as ast from "@angstone/node-util";
import { connectRethinkDbDev, r } from "../store";
import { EventTools } from "../tools";

export let rethinkDevConnected: boolean = false;

export const use = async () => {
  await connectRethinkDev();
};

export const connectRethinkDev = async () => {
  if ( !rethinkDevConnected ) {
    await connectRethinkDbDev();
    rethinkDevConnected = true;
  }
};

export const dbCheck = async () => {
  return await r.dbList().contains( process.env.RETHINKDB_DATABASE || "dev" ).run();
};

export const dbDrop = async () => {
  if ( await dbCheck() ) {
    await r.dbDrop( process.env.RETHINKDB_DATABASE || "dev" ).run();
  }
};

export const dbCreate = async () => {
  if ( ! await dbCheck() ) {
    await r.dbCreate( process.env.RETHINKDB_DATABASE || "dev" ).run();
  }
};

export const dbWipe = async () => {
  await dbDrop();
  await dbCreate();
};

export const eventClear = async () => {
  await EventTools.clearAllEvents();
};

export { r };
