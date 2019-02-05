import { IFeatureLoaded } from './interfaces';

export class Controller implements ControllerRecipe {
  public async start() {}
  public async stop() {}
  public async isFree() { return true; }
  public loadFeatures(features: IFeatureLoaded[], data?: any) {}
}

export abstract class ControllerRecipe {
  public abstract start: () => Promise<void>;
  public abstract stop: () => Promise<void>;
  public abstract isFree: () => Promise<boolean>;
  public abstract loadFeatures: (features: IFeatureLoaded[], recipe?: any) => void;
}
