import { IMonoModule, IFeatureLoaded } from '../interfaces';

export const BasicModule: IMonoModule = {
  config: () => {},
  start: async () => {},
  stop: async () => {},
  isFree: async () => true,
  loadFeatures: (features: IFeatureLoaded[]) => {},
};
