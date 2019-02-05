import { IFeatureLoaded } from './';

export interface IMonoModule {
  config: () => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isFree: () => Promise<boolean>;
  loadFeatures: (features: IFeatureLoaded[]) => void;
};
