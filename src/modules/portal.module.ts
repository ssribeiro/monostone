import * as ast from "@angstone/node-util"
import { error } from 'error'

import * as bodyParser from "body-parser"
import * as express from "express"
import * as http from "http"

import { BasicModule, ReducerModule, ViewModule } from './'

import { ICommandLoaded, IFeatureLoaded, IViewLoaded } from "../interfaces"
import { CommandTools } from "tools"

import { IAuthToken } from "features/auth/interfaces/auth-token.i"
import { messages as authMessages } from "features/auth/messages"
import * as AuthTools from "features/auth/tools"

interface ServerError extends Error {
  code: string | number
}

interface IPortalModuleState {
  apiPort: number;
  expressApp: express.Express;
  httpServer: http.Server | null;
}

const state: IPortalModuleState = {
  apiPort: 0,
  expressApp: express().use(bodyParser.json()),
  httpServer:  null,
}

const config = () => {
  state.apiPort = +(process.env.API_PORT || 3002)
  state.expressApp = express().use(bodyParser.json())
  state.httpServer = null
}

const loadFeatures = (features: IFeatureLoaded[]) => {
  ast.log("creating routes")
  routeSystem()
  routeFeatures(features)
}

const routeSystem = () => {
  ast.log("adding system routes")
  const router = express.Router()
  router.get("/ping", (req: express.Request, res: express.Response) => {
    res.send("pong")
  })
  state.expressApp.use("/", router)
  ast.log("system routes added")
}

/**
 * Route each feature
 * @param  features      loaded features
 * @param  eventReduced$ reduced events stream
 * @param  viewData     stored data from views
 */
const routeFeatures = (features: IFeatureLoaded[]) => {
  ast.log("adding the feature routes")
  features.forEach((feature) => {

    ast.log("found feature: " + feature.featureName)
    const featureRouter = express.Router()
    featureRouter.use(authMiddleware)

    if (feature.commands) {
      feature.commands.forEach((command) => {
        ast.log(" found command: " + command.commandName)

        featureRouter.post("/" + command.commandName,
          commandRequest(command))

        ast.log(" routed command " + command.commandName);
      })
    }

    if (feature.views) {

      feature.views.forEach((view) => {
        ast.log(" found view: " + view.viewName)
        featureRouter.get( "/" + view.viewName, viewRequest( view ) )

        ast.log(" routed view " + view.viewName)
      })
    }

    state.expressApp.use("/" + feature.featureName, featureRouter)
    ast.log("routed feature " + feature.featureName)

  })
}

/**
 * Middleware to handle authentication
 * @param req  the request
 * @param res  the response
 * @param next called at end
 */
const authMiddleware = (
  req: any,
  res: express.Response,
  next: any,
): void => {
  const tokenHeader = req.get("token")
  if (tokenHeader) {
    AuthTools.decodeToken(tokenHeader).then((decoded: IAuthToken) => {
      req.token = decoded
      next()
    }).catch((err: any) => {
      res.status(401).send(err.message || err.msg || "unknown")
    })
  } else {
    next()
  }
}

/**
 * Generate the request for each command
 * @param  command       [description]
 * @param  eventReduced$ stream of reduced events
 * @return               express function midlleware
 */
const commandRequest = (command: ICommandLoaded): (
  req: express.Request,
  res: express.Response,
) => void  => {
  return (req: express.Request, res: express.Response) => {
    CommandTools.execute(command, req.body, ReducerModule.eventReduced$)
      .then((ans: any) => res.status(200).send(ans))
      .catch((err: Error) => {
        ast.dev(err)
        res.status(400).send(err)
      })
  }
}

/**
 * Generate the request for each view
 * @param  view      [description]
 * @param  viewTag   [description]
 * @param  viewData [description]
 * @return           express function middleware
 */
const viewRequest = (view: IViewLoaded): (
  req: express.Request,
  res: express.Response,
) => void => {

  const viewData = ViewModule.getViewData(view);

  if (view.renderPrivate && !view.renderPublic) {

    return (req: any, res: express.Response) => {
      if (req.token && view.renderPrivate) {
        view.renderPrivate( viewData, req.token )
          .then((ans: any) => res.status(200).send(ans))
          .catch((err: Error) => res.status(400).send(err))
      } else {
        res.status(401).send(authMessages.NO_TOKEN_PROVIDED)
      }
    }

  } else if (view.renderPrivate && view.renderPublic) {

    return (req: any, res: express.Response) => {
      if (req.token && view.renderPrivate) {
        view.renderPrivate( viewData, req.token )
          .then((ans: any) => res.status(200).send(ans))
          .catch((err: Error) => res.status(400).send(err))
      } else if (view.renderPublic){
        view.renderPublic( viewData )
          .then((ans: any) => res.status(200).send(ans))
          .catch((err: Error) => res.status(400).send(err))
      }
    }

  } else {
    if (view.renderPublic) {

      return (req: any, res: express.Response) => {
        if(view.renderPublic) {
          view.renderPublic( viewData )
            .then((ans: any) => res.status(200).send(ans))
            .catch((err: Error) => res.status(400).send(err))
        }
      }

    } else {
      return (req: any, res: express.Response) => res.status(200).send({})
    }
  }

}

const start = (): Promise<void> => {
  return new Promise<void>( (resolve, reject) => {
    ast.log("testing http port use")
    isPortTaken(state.apiPort).then( (isTaken: boolean) => {
      if (isTaken) {
        reject("The port '" + state.apiPort + "' is already being used!'")
      } else {

        state.httpServer = http.createServer(state.expressApp)
        state.httpServer.once('listening', () => {
          ast.log("Express Server listening on port " + state.apiPort)
          resolve()
        })
        state.httpServer.on('error', (e: ServerError) => {
          error.fatal(e)
          reject()
        })

        state.httpServer.listen.apply(state.httpServer, [{
          host: 'localhost',
          port: state.apiPort,
        }])

      }
    }).catch( (err: any) => {
      reject("failure when testing http server api port");
    })

  })
}

const isPortTaken  = (port: number): Promise<boolean> => {
  return new Promise<boolean>( (resolve) => {
    /*const tester = net.createServer()
      .once('error', (err: ServerError) => {
        if (err.code == 'EADDRINUSE') resolve(true);
        else resolve(false);
      })
      .once('listening', () => {
        tester.once('close', () => { resolve(false); } )
        .close();
      })
      .listen(port);*/
    resolve(false)
  })
}

const stop = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (state.httpServer) {
      state.httpServer.close((error: any) => {
        if (error) reject(error)
        else {
          ast.info("http server closed")
          resolve()
        }
      })
    } else {
      ast.info("http server never started")
      resolve()
    }
  })
}

const getExpressApp = (): express.Express => state.expressApp
const getApiPort = (): number => state.apiPort
const setApiPort = (newApiPort: number) => {
  state.apiPort = newApiPort
  config()
}

export const PortalModule = {
  ...BasicModule,
  config,
  loadFeatures,
  start,
  stop,
  getExpressApp,
  getApiPort,
  setApiPort,
}
