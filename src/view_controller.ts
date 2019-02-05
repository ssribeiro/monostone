import * as ast from "@angstone/node-util";
import { Controller } from './controller';
import { EventController } from './event_controller';
import { IFeatureLoaded, IViewLoaded, IEventRead } from "./interfaces";

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

export class ViewController extends Controller {

  private static RENDER_REST_TIME: number = 10;

  /**
   * Object to store all data from views that are required to
   * be persisted across iterations within the reducer
   */
  public viewsData: any = {};
  private initialRenders: IRenderInitial[] = [];
  private viewWatchers: IViewWatcher[] = [];

  private rendering: boolean = false;
  private lastTimeRendering: number = Date.now();

  constructor() { super(); }

  public async start() {
    await this.renderInitialViews();
    await ast.delay(3);
    this.watchEvents();
  }

  public loadFeatures(features: IFeatureLoaded[]) {
    features.forEach((feature: IFeatureLoaded) => {
      if (feature.views) {
        feature.views.forEach((view: IViewLoaded) => {

          this.viewsData[view.viewTag] = {};

          if (view.renderUpdate && view.watchEvents) {
            view.watchEvents.forEach((watchEvent: string) => {
              const alreadyInitiatedWatcher = this.viewWatchers.filter((watch: IViewWatcher) => {
                return watch.event == watchEvent;
              });
              if ( alreadyInitiatedWatcher.length === 0 ) {
                this.viewWatchers.push({
                  event: watchEvent,
                  renderUpdates: [],
                });
              }
              this.viewWatchers = this.viewWatchers.map((watch: IViewWatcher) => {
                if (watch.event == watchEvent && view.renderUpdate) {
                  watch.renderUpdates.push({
                    methodRenderUpdate: view.renderUpdate,
                    viewTag: view.viewTag,
                  });
                }
                return watch;
              });
            });
          }

          if (view.renderInitial) {
            this.initialRenders.push({
              methodRenderInitial: view.renderInitial,
              viewTag: view.viewTag,
            });
          }

        });
      }
    });
  }

  /**
   * renders views
   */
  public async renderInitialViews() {
    this.rendering = true;
    for (const initialRenderIndex in this.initialRenders) {
      if (this.initialRenders[initialRenderIndex]) {
        this.viewsData[ this.initialRenders[initialRenderIndex].viewTag ] =
          await this.initialRenders[initialRenderIndex].methodRenderInitial();
      }
    }
    this.rendering = false;
    this.lastTimeRendering = Date.now();
  }

  /**
   * watch for events
   */
  public watchEvents() {
    this.viewWatchers.forEach((watcher: IViewWatcher) => {

      EventController.eventRead$.addListener(watcher.event, (eventRead: IEventRead) => {
        this.rendering = true;

        watcher.renderUpdates.forEach((render: IRenderUpdate) => {
          render.methodRenderUpdate(
            this.viewsData[render.viewTag],
            eventRead
          ).then((newViewData: any) => {
            this.viewsData[render.viewTag] = newViewData;

            // console.log("A BIG BIG BIG MARK A BIG BIG BIG MARK A BIG BIG BIG MARK ");
            // console.log(this.viewsData[render.viewTag]);
            // console.log("count a call");

          });
        });

        this.lastTimeRendering = Date.now();
        this.rendering = false;
      });

    });
  }

  public async isFree(): Promise<boolean> {
    if (this.rendering) {
      return false;
    } else {
      if ((Date.now() - this.lastTimeRendering) > 3 * ViewController.RENDER_REST_TIME) {
        return !this.rendering;
      }
      return false;
    }
  }

}
