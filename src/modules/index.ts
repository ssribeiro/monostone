import { BasicModule } from './basic.module'
import { EventModule } from './event.module'
import { PortalModule } from './portal.module'
import { ReducerModule } from './reducer.module'
import { ViewModule } from './view.module'
import { EffectModule } from './effect.module'

export {
  BasicModule,
  EventModule,
  PortalModule,
  ReducerModule,
  ViewModule,
  EffectModule,
}

export const MonoModules = [
  EventModule,
  ReducerModule,
  ViewModule,
  EffectModule,
  PortalModule
];
