/**
 * Collect some information for current project.
 * Global state will be assigned in highest priority.
 */

import * as fs from 'fs-extra';
import { get, merge } from 'lodash';
import * as path from 'path';
import * as yargs from 'yargs';
import * as pkg from '../../package.json';
import { CONFIG_FILE } from './constants';
import { execTsByPath } from './functional';
import { GlobalState } from './global-state-class';
import { ProjectConfig } from './project-config-interface';

const globalState = new GlobalState();

globalState.vaiPackageJson = pkg;
globalState.projectRootPath = yargs.argv.cwd || process.cwd();
globalState.majorCommand = yargs.argv._.length === 0 ? 'dev' : yargs.argv._[0];
globalState.isDevelopment = ['dev', 'docs'].some(operate => operate === globalState.majorCommand);
freshProjectConfig();

// get vai type from package.json
const projectPackageJsonPath = path.join(globalState.projectRootPath, 'package.json');
if (fs.existsSync(projectPackageJsonPath)) {
  const projectPackageJson = fs.readJsonSync(projectPackageJsonPath, { throws: false }) || {};
  globalState.projectType = get(projectPackageJson, 'vai.type', null);
}

export function freshProjectConfig() {
  globalState.projectConfig = getProjectConfig(globalState.isDevelopment);
}

function getProjectConfig(isDevelopment: boolean) {
  const configFilePath = path.join(globalState.projectRootPath, CONFIG_FILE);
  let userProjectConfig: ProjectConfig | ((isDevelopment: boolean) => ProjectConfig) =
    execTsByPath(configFilePath) || {};

  if (typeof userProjectConfig === 'function') {
    userProjectConfig = userProjectConfig(isDevelopment);
  }

  return merge(new ProjectConfig(), userProjectConfig);
}

export { globalState };
