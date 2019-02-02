import { IFeature } from 'interfaces';
import { feature as AuthFeature } from './auth/optional.index';

export const features: IFeature[] = [AuthFeature];
