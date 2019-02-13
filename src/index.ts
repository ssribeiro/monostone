// Monostone Starter
import * as angstoneTools from "@angstone/node-util"
import { App } from "./app"
import { error } from "./error"
import { config } from './config'

import { db as store } from './store'

import {
  IView,
  IRule,
  IEffect,
  ICommand,
  ICronjob,
  IFeature,
  IReducer,
  IEventRead,
  IMonoModule,
  IConfigRecipe,
  IViewLoaded,
  IEventRecipe,
  IEffectLoaded,
  ICommandLoaded,
  IFeatureLoaded
} from './interfaces'

import { IAuthToken } from './features/auth/interfaces/auth-token.i';
import { IPermission } from './features/auth/interfaces/permission.i';

import {
  FeatureTools,
  CommandTools,
  GeneralTools,
  StringTools,
  SystemTools,
  RuleTools,
  CronjobTools,
  EffectTools,
  ReducerTools,
  FolderTools,
  EventTools,
  ViewTools
} from './tools'

import {
  BasicModule,
  PortalModule,
  CronjobModule,
  EffectModule,
  ReducerModule,
  EventModule,
  ViewModule
} from './modules'

import * as SystemCommands from './system_commands'

process.env.FRAMEWORK_ENV = 'packed'

export {
  App,
  error,
  config,
  store,
  SystemCommands,
  angstoneTools,
  // interfaces
  IView,
  IRule,
  IEffect,
  ICommand,
  ICronjob,
  IFeature,
  IReducer,
  IEventRead,
  IMonoModule,
  IConfigRecipe,
  IViewLoaded,
  IEventRecipe,
  IEffectLoaded,
  ICommandLoaded,
  IFeatureLoaded,
  IAuthToken,
  IPermission,
  //  tools
  FeatureTools,
  CommandTools,
  GeneralTools,
  StringTools,
  SystemTools,
  RuleTools,
  CronjobTools,
  EffectTools,
  ReducerTools,
  FolderTools,
  EventTools,
  ViewTools,
  // modules
  BasicModule,
  PortalModule,
  CronjobModule,
  EffectModule,
  ReducerModule,
  EventModule,
  ViewModule
}
