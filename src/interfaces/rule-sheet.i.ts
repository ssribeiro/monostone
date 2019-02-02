/**
 * A file loaded to generate the business rule object for the command
 */
export interface IRuleSheet {
  /**
   * pre-validates the request (used for validation that does not require database access)
   */
  preValidation?: (req: any) => Promise<string|undefined>;
  /**
   * validate parameters using business rule and database
   */
  validation?: (req: any) => Promise<string|undefined|{req: any}>;
  /**
   * Data to respond after the event beeing reduced
   */
  respond?: (eventNumber: number, req: any) => Promise<any>;
}
