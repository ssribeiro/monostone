import { error } from "../error";
import { IModelSheet } from "../interfaces";
import { Schema, Store } from "../store";
import { SystemTools } from "../tools";

export function loadModels(modelSheets: IModelSheet[]): void {
  modelSheets.forEach((modelSheet: IModelSheet) => {
    Store.defineMapper(modelSheet.modelName, {
      relations: modelSheet.relations,
      schema: modelSheet.schema ? new Schema(modelSheet.schema) : undefined,
    });
    SystemTools.use().then(() => {
      SystemTools.r.tableList().contains(modelSheet.modelName).run().then((contains) => {
        if (!contains) {
          Store.as(modelSheet.modelName).createRecord();
        }
      }).catch((err) => {
        error.fatal("unable to access table list in db: ", err);
      });
    });
  });
}
