import * as ast from '@angstone/node-util';
import { config } from './config';
import { error } from './error';

ast.log('booting monostone framework')
ast.log('loading configuration')
config();
if(process.env.NODE_ENV=='production'||process.env.NODE_ENV=='development')
  ast.success('configuration loaded');
else error.fatal('configuration failed');





ast.info('configured environment: '+process.env.NODE_ENV);
