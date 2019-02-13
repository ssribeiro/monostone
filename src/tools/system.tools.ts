// import * as ast from "@angstone/node-util";
import { db } from "../store";
import { EventTools } from "../tools";

export let rethinkDevConnected: boolean = false;

/**
 * drops the database erasing everthing
 */
export const dbDrop = async () => {
  await db().dropDatabase();
};

/**
 * Clear all events saved on event store
 */
export const eventClear = async () => {
  await EventTools.clearAllEvents();
};
