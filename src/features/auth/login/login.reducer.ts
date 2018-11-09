import { IReducer } from "../../../interfaces";
import { db } from "../../../store";

export const reducer: IReducer = {
  async process(request: any, eventNumber: number): Promise<void> {
    if ( request.expiresAt > Date.now() ) {
      await db.collection("authentication").insertOne({
        createdAt: request.createdAt,
        deviceId: request.deviceId,
        deviceType: request.deviceType,
        expiresAt: request.expiresAt,
        id: eventNumber,
        userId: request.userId,
      });
    }
  },
};
