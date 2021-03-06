/**
 * recipe to config
 */
export interface IConfigRecipe {
  /**
   * path to config .env file when different from default (root of project)
   */
  envPath?: string;
  featuresPath?: string;
}
