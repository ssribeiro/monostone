import * as ast from "@angstone/node-util"
import { BasicModule, EventModule } from './'
import { IFeatureLoaded, IViewLoaded, IEventRead } from "../interfaces"

// TODO: Probabbly the interfaces are the error source
interface IRenderUpdate {
  viewTag: string,
  methodRenderUpdate: (lastData?: any, event?: any) => Promise<any>,
}

interface IRenderInitial {
  viewTag: string,
  methodRenderInitial: () => Promise<any>,
}

interface IViewWatcher {
  event: string,
  renderUpdates: IRenderUpdate[],
}

interface IViewModuleState {
  /**
   * Object to store all data from views that are required to
   * be persisted across iterations within the reducer
   */
  viewsData: any
  initialRenders: IRenderInitial[]
  viewWatchers: IViewWatcher[]
  rendering: boolean
  lastTimeRendering: number
}

const state: IViewModuleState = {
  viewsData: {},
  initialRenders: [],
  viewWatchers: [],
  rendering: false,
  lastTimeRendering: Date.now(),
}

const RENDER_REST_TIME: number = 10

const config = () => {
  state.viewsData = {}
  state.initialRenders = []
  state.viewWatchers = []
  state.rendering = false
  state.lastTimeRendering = Date.now()
}

const loadFeatures = (features: IFeatureLoaded[]) => {
  features.forEach((feature: IFeatureLoaded) => {
    if (feature.views) {
      feature.views.forEach((view: IViewLoaded) => {

        state.viewsData[view.viewTag] = {}

        if (view.renderUpdate && view.watchEvents) {
          view.watchEvents.forEach((watchEvent: string) => {
            const alreadyInitiatedWatcher = state.viewWatchers
              .filter((watch: IViewWatcher) => {
                return watch.event == watchEvent
              })
            if ( alreadyInitiatedWatcher.length === 0 ) {
              state.viewWatchers.push({
                event: watchEvent,
                renderUpdates: [],
              })
            }
            state.viewWatchers = state.viewWatchers.map((watch: IViewWatcher) => {
              if (watch.event == watchEvent && view.renderUpdate) {
                watch.renderUpdates.push({
                  methodRenderUpdate: view.renderUpdate,
                  viewTag: view.viewTag,
                })
              }
              return watch
            });
          });
        }

        if (view.renderInitial) {
          state.initialRenders.push({
            methodRenderInitial: view.renderInitial,
            viewTag: view.viewTag,
          })
        }

      })
    }
  })
}

const start = async () => {
  await renderInitialViews()
  await ast.delay(3)
  watchEvents()
}

/**
 * renders views
 */
const renderInitialViews = async () => {
  state.rendering = true
  for (const initialRenderIndex in state.initialRenders) {
    if (state.initialRenders[initialRenderIndex]) {
      state.viewsData[ state.initialRenders[initialRenderIndex].viewTag ] =
        await state.initialRenders[initialRenderIndex].methodRenderInitial()
    }
  }
  state.rendering = false
  state.lastTimeRendering = Date.now()
}

/**
 * watch for events
 */
const watchEvents = () => {
  state.viewWatchers.forEach((watcher: IViewWatcher) => {

    EventModule.getEventReadStream().addListener(
      watcher.event,
      (eventRead: IEventRead) => {
        state.rendering = true

        console.log('got the event: ', eventRead)

        watcher.renderUpdates.forEach((render: IRenderUpdate) => {
          render.methodRenderUpdate(
            state.viewsData[render.viewTag],
            eventRead
          ).then((newViewData: any) => {
            console.log('got the new data: ', newViewData)
            console.log('see the state of viewsData befor: ', state.viewsData[render.viewTag])
            state.viewsData[render.viewTag] = newViewData
            console.log('see the state of viewsData now: ', state.viewsData[render.viewTag])
          })
        })

        state.lastTimeRendering = Date.now()
        state.rendering = false
      })

  })
}

const isFree = async (): Promise<boolean> => {
  if (state.rendering) return false
  else {
    if ((Date.now() - state.lastTimeRendering) > 3 * RENDER_REST_TIME)
      return !state.rendering
    return false
  }
}

const getViewData = (view: IViewLoaded): any => state.viewsData[view.viewTag]

export const ViewModule = {
  ...BasicModule,
  config,
  loadFeatures,
  start,
  isFree,
  getViewData
}
