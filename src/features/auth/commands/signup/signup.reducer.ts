import { IReducer } from "../../../../interfaces";
import { db } from "../../../../store";
import { IdbUser } from "../../../../schemas/user.db.i";

export const reducer: IReducer = {
  async process(request: any, eventNumber: number): Promise<void> {
    const user: IdbUser = {
      createdAt: request.createdAt,
      id: eventNumber,
      login: request.login,
      name: request.name,
      password: request.password,
      role: "newuser",
      email_confirmed: false,
    }
    await db.collection("user").insertOne(user);
  },
};
