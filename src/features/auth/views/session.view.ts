import { IView } from "../../../interfaces";
import { db } from "../../../store";
import { IAuthToken } from "../interfaces/auth-token.i";

export const view: IView = {

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

  renderPrivate: async (data: any, token: IAuthToken): Promise<any> => {
    return data.sessions.filter((session: {
      userId: number,
      deviceType: string,
      loggedSince: number,
    }) => session.userId === token.uId);
  },

};
