import { IView, IEventRead } from "interfaces";
import { db } from "store";
// import { messages } from "./signup.messages";

export const view: IView = {

  watchEvents: [
    "auth signup",
  ],

  renderInitial: async (): Promise<any> => {
    const usersInside = db.collection("user").find();
    const users: Array<{
      login: string,
      name: string,
      memberSince: number,
      role: string,
    }> = [];
    if (usersInside) {
      while (await usersInside.hasNext()) {
        const userInside = await usersInside.next();
        users.push({
          login: userInside.login,
          memberSince: userInside.createdAt,
          name: userInside.name,
          role: userInside.role,
        });
      }
    }
    return { users };
  },

  renderUpdate: async (lastData: any, event: IEventRead): Promise<any> => {
    console.log('goting for update old: ', lastData)
    console.log('goting for update old: ', lastData.users)
    const userNew = {
      login: event.request.login,
      memberSince: event.request.createdAt,
      name: event.request.name,
      role: event.request.role,
    };
    lastData.users = [ ...lastData.users, userNew ];
    console.log('sending back: ', lastData)
    console.log('sending back: ', lastData.users)
    return lastData;
  },

  renderPublic: async (data: any): Promise<any> => {
    console.log('what view feature is gotting: ', data)
    return data.users;
  },

};
