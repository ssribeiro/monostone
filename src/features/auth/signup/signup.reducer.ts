import { IReducer } from "../../../interfaces";
import { db } from "../../../store";

export const reducer: IReducer = {
  async process(request: any, eventNumber: number): Promise<void> {
    await db.collection("user").insert({
      id: eventNumber,
      login: request.login,
      name: request.name,
      password: request.password,
    });
  },
};
