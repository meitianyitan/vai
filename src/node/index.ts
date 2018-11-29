import { globalState } from '../utils/global-state';
import { vaiEvent } from '../utils/vai-events';
import * as build from './build';
import * as commands from './commands';
import * as context from './context';
import * as devService from './dev-service';
import * as project from './project/index';
import * as self from './self';
import * as serviceWorker from './service-worker';

const vai = {
  /**
   * Operate cli commands
   */
  commands,
  /**
   * Build configs
   */
  build,
  /**
   * Project management
   */
  project,
  /**
   * Context operate
   */
  context,
  /**
   * Register dev service
   */
  devService,
  /**
   * Control service worker
   */
  serviceWorker,

  event: vaiEvent,

  ...self
};

const outputVai = vai as typeof vai & {
  projectType: typeof globalState.projectType;
  projectRootPath: typeof globalState.projectRootPath;
  isDevelopment: typeof globalState.isDevelopment;
  majorCommand: typeof globalState.majorCommand;
  projectConfig: typeof globalState.projectConfig;
};

Object.defineProperty(vai, 'projectType', {
  get() {
    return globalState.projectType;
  }
});

Object.defineProperty(vai, 'projectRootPath', {
  get() {
    return globalState.projectRootPath;
  }
});

Object.defineProperty(vai, 'isDevelopment', {
  get() {
    return globalState.isDevelopment;
  }
});

Object.defineProperty(vai, 'majorCommand', {
  get() {
    return globalState.majorCommand;
  }
});

Object.defineProperty(vai, 'projectConfig', {
  get() {
    return globalState.projectConfig;
  }
});

export { outputVai as vai };

export * from '../utils/structor-config';
