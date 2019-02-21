import * as fs from 'fs';

const EMAIL_TEXT: string = 'This is supposed to be a fake email to test effects. eventNumber is ';

export const testFakeEmail = async (
  eventNumber: number,
  login: string
): Promise<boolean> => {

  let fakedir = './fake';
  let filename = 'email_'+login+'|';
  let emailtext = EMAIL_TEXT + eventNumber;
  if (!fs.existsSync(fakedir)) return false;

  return await new Promise<any>((resolve) => {
    fs.readFile(
      fakedir+'/'+filename,
      'utf8',
      (err, data) => {
        if(err) resolve(false)
        if(!data) resolve(false)
        console.log(data);
        console.log(emailtext);
        if( data == emailtext ) {
          fs.unlinkSync(fakedir+'/'+filename)
          resolve(true)
        }
        else resolve(false)
      }
    );
  });

}
