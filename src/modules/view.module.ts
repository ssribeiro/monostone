import * as ast from "@angstone/node-util"
import { BasicModule, EventModule } from './'
import { IFeatureLoaded, IViewLoaded, IEventRead } from "../interfaces"

// TODO: Probabbly the interfaces are the error source
export interface IRenderUpdate {
  viewTag: string,
  methodRenderUpdate: (lastData?: any, event?: any) => Promise<any>,
}

export interface IRenderInitial {
  viewTag: string,
  methodRenderInitial: () => Promise<any>,
}

export interface IViewWatcher {
  event: string,
  renderUpdates: IRenderUpdate[],
}

const RENDER_REST_TIME: number = 10
/**
 * Object to store all data from views that are required to
 * be persisted across iterations within the reducer
 */
let viewsData: any = {}
let initialRenders: IRenderInitial[] = []
let viewWatchers: IViewWatcher[] = []

let rendering: boolean = false
let lastTimeRendering: number = Date.now()

const loadFeatures = (features: IFeatureLoaded[]) => {
  features.forEach((feature: IFeatureLoaded) => {
    if (feature.views) {
      feature.views.forEach((view: IViewLoaded) => {

        viewsData[view.viewTag] = {}

        if (view.renderUpdate && view.watchEvents) {
          view.watchEvents.forEach((watchEvent: string) => {
            const alreadyInitiatedWatcher = viewWatchers
              .filter((watch: IViewWatcher) => {
                return watch.event == watchEvent
              })
            if ( alreadyInitiatedWatcher.length === 0 ) {
              viewWatchers.push({
                event: watchEvent,
                renderUpdates: [],
              })
            }
            viewWatchers = viewWatchers.map((watch: IViewWatcher) => {
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
          initialRenders.push({
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
  rendering = true
  for (const initialRenderIndex in initialRenders) {
    if (initialRenders[initialRenderIndex]) {
      viewsData[ initialRenders[initialRenderIndex].viewTag ] =
        await initialRenders[initialRenderIndex].methodRenderInitial()
    }
  }
  rendering = false
  lastTimeRendering = Date.now()
}

/**
 * watch for events
 */
const watchEvents = () => {
  viewWatchers.forEach((watcher: IViewWatcher) => {

    EventModule.eventRead$.addListener(
      watcher.event,
      (eventRead: IEventRead) => {
        rendering = true

        watcher.renderUpdates.forEach((render: IRenderUpdate) => {
          render.methodRenderUpdate(
            viewsData[render.viewTag],
            eventRead
          ).then((newViewData: any) => {
            viewsData[render.viewTag] = newViewData
          })
        })

        lastTimeRendering = Date.now()
        rendering = false
      })

  })
}

const isFree = async (): Promise<boolean> => {
  if (rendering) return false
  else {
    if ((Date.now() - lastTimeRendering) > 3 * RENDER_REST_TIME)
      return !rendering
    return false
  }
}

const getViewData = (view: IViewLoaded): any => viewsData[view.viewTag]

export const ViewModule = {
  ...BasicModule,
  loadFeatures,
  start,
  isFree,
  getViewData,
}
