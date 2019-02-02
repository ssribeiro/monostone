// import * as ast from "@angstone/node-util";
// import { db } from "../../../store";

import { IEffect } from "interfaces";

import * as fs from 'fs';
import * as path from 'path';

export const effect: IEffect = {

  name: "SendWelcomeEmailEffect",

  triggerAfterCommand: "signup",

  run: async (): Promise<void> => {
    // Fake email creation
    let fakedir = './fake';
    let filename = 'email_'+Date.now();
    let emailtext = 'This is supposed to be a fake email to test effect';

    if (!fs.existsSync(fakedir)) {
      fs.mkdirSync(fakedir);
    }

    const error = await new Promise<any>((resolve) => {
      fs.writeFile(path.join(__dirname, fakedir+'/'+filename), emailtext, resolve);
    });

    if (error) throw error;
    else return;
  },

};
