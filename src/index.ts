import * as ast from '@angstone/node-util';
import { config } from './config';

config();

ast.info('configured environment: '+process.env.NODE_ENV);
