
import fetch from "node-fetch";
import { v4 as uuid } from "uuid";
import { IEventRecipe } from "../interfaces";

/**
 * send an event to event store
 * @param  eventRecipe recipe with the command and the request
 * @return eventNumber
 */
export async function send( eventRecipe: IEventRecipe): Promise<number> {

    const evt = {
      payload: eventRecipe.request || {},
      type: eventRecipe.command.featureName + " " +
        eventRecipe.command.commandName,
    };

    const url: string =
    (process.env.EVENT_SOURCE_GATEWAY || "http://localhost:2113") +
      "/streams/" + ( process.env.EVENT_STREAM_NAME || "mono" );
    const method = "POST";
    const eventData = {
      data: evt.payload,
      eventId: uuid(),
      eventType: evt.type,
    };
    const body = JSON.stringify([eventData]);
    const headers = { "Content-Type": "application/vnd.eventstore.events+json" };
    const response = await fetch(url, {method, headers, body});
    if (response.status === 201) {
      const location = response.headers.get("location");
      if (location) {
        return parseInt( location.split("/").slice(-1)[0] , 10);
      } else {
        throw new Error("no location field in response");
      }
    } else {
      throw new Error("event store could not get the event");
    }
}

/**
 * deletes all events
 */
export async function clearAllEvents() {
  const url: string =
  (process.env.EVENT_SOURCE_GATEWAY || "http://localhost:2113") +
    "/streams/" + ( process.env.EVENT_STREAM_NAME || "mono" );
  const method = "DELETE";
  const response = await fetch(url, { method });
  if (response.status !== 204 && response.status !== 404) {
    throw new Error("the stream could not be deleted");
  }
}
