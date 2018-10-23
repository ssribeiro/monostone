import { IModelSheet } from "../interfaces";
import { Schema, Store } from "../store";

export function loadModels(modelSheets: IModelSheet[]): void {
  modelSheets.forEach((modelSheet: IModelSheet) => {
    Store.defineMapper(modelSheet.modelName, {
      relations: modelSheet.relations,
      schema: modelSheet.schema ? new Schema(modelSheet.schema) : undefined,
    });
  });
}
