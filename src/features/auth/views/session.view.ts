import { IViewSheet } from "../../../interfaces";
import { db } from "../../../store";
// import { messages } from "./signup.messages";

export const viewSheet: IViewSheet = {

  watchEvents: [
    "auth login",
  ],

  renderInitial: async (): Promise<any> => {
    const authentications = await db.collection("authentication").find();
    const sessions: Array<{
      userId: number,
      deviceType: string,
      loggedSince: number,
    }> = [];
    if (authentications) {
      while (await authentications.hasNext()) {
        const authentication = await authentications.next();
        sessions.push({
          deviceType: authentication.deviceType,
          loggedSince: authentication.createdAt,
          userId: authentication.userId,
        });
      }
    }
    return { sessions };
  },

  renderUpdate: async (lastData: any, event: any): Promise<any> => {
    const sessionNew = {
      deviceType: event.request.deviceType,
      loggedSince: event.request.createdAt,
      userId: event.request.userId,
    };
    lastData.sessions = [ ...lastData.sessions, sessionNew ];
    return lastData;
  },

  renderPrivate: async (data: any): Promise<any> => {
    return data.sessions;
  },

};
