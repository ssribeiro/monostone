import { IReducer } from "../../../interfaces";
import { Store } from "../../../store";

export const reducer: IReducer = {
  async process(request: any, eventNumber: number): Promise<void> {
    await Store.getMapper("user").create({
      id: eventNumber,
      login: request.login,
      name: request.name,
      password: request.password,
    });
  },
};
