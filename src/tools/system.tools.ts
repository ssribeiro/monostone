// import * as ast from "@angstone/node-util";
import { db } from "../store";
import { EventTools } from "../tools";

export let rethinkDevConnected: boolean = false;

export const dbDrop = async () => {
  await db.dropDatabase();
};

export const eventClear = async () => {
  await EventTools.clearAllEvents();
};
