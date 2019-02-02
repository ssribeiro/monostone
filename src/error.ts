import * as ast from "@angstone/node-util";

export const MONOSTONE_ERROR: string = "MONOSTONE ERROR";
export const OPERATIONAL_PREFIX: string = "OPERATIONAL ERROR: ";
export const FATAL_PREFIX: string = "FATAL ERROR: ";

/**
 * Centralized unique error type
 */
export class MonoError extends Error {

  readonly type: string = MONOSTONE_ERROR;
  readonly details: any[] | any;

  /**
   * @param message string optional
   * @param details any details
   */
  constructor(message?: string, ...details: any[] | any) {
    super(message || "unknown error");
    this.details = details;
  }

}

/**
 * shortcuts functions to make easy dealing with errors
 */
export const error = {

  /**
   * creates the error (same as new Error(...))
   * @param message string optional
   * @param details any details
   */
  is(message?: string, ...details: any[] | any): MonoError {
    if ( !details && !message ) return new MonoError();
    else if ( !details && !!message ) return new MonoError( message );
    else return new MonoError( message, details );
  },

  /**
  * print error to console
  * @param  message the text message of the error OR the generated error itself (Error or MonoError)
  * @param  ...details any number of objects to include with the error
  */
  op(message?: string | Error, ...details: any[]) {

    if ( !message ) {
      ast.warn( OPERATIONAL_PREFIX + error.is().message );
    } else if ( typeof message == "string" ) {
      ast.warn( OPERATIONAL_PREFIX + error.is(message).message );
    } else {
      ast.warn( OPERATIONAL_PREFIX + message.message );
    }

    if (details.length > 0) {
      details.forEach((detail) => {
        ast.warn(detail);
      });
    }

  },

  /**
   * print a fatal error to console and terminates the application
   * @param  message the text message of the error OR the generated error itself (Error or MonoError)
   * @param  ...details any number of objects to include with the error
   */
   fatal(message?: string | Error, ...details: any[]) {

     if ( !message ) {
       ast.error( FATAL_PREFIX + error.is().message );
     } else if ( typeof message == "string" ) {
       ast.error( FATAL_PREFIX + error.is(message).message );
     } else {
       ast.error( FATAL_PREFIX + message.message );
     }

     if (details.length > 0) {
       details.forEach((detail) => {
         ast.error(detail);
       });
     }

     // It should terminate the application to avoid unpredicted states
     // try it gracefully

     process.exit(1);

   },

  /**
   * throw a new error with the message
   * @param  message can be a string or an instance of Error
   * @param  ...details any number of objects to include with the error
   */
  throw( message?: string | Error, ...details: any[] | any) {

    if ( !details && !message ) throw new MonoError();
    else if ( !details && !!message ) {
      if ( typeof message == "string" ) throw new MonoError( message );
      else throw message;
    } else {
      if ( typeof message == "string" ) throw new MonoError( message, details );
      else throw message;
    }

  },

};
