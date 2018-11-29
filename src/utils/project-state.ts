import * as fs from 'fs-extra';
import * as path from 'path';
import { globalState } from './global-state';
import { tempPath } from './structor-config';

const storeFilePath = path.join(globalState.projectRootPath, tempPath.dir, 'state.json');

export const get = (key: string) => {
  if (!fs.existsSync(storeFilePath)) {
    return null;
  }

  const info = fs.readJsonSync(storeFilePath);
  return info[key];
};

export const set = (key: string, value: any) => {
  const info = fs.existsSync(storeFilePath) ? fs.readJsonSync(storeFilePath) : {};
  const newInfo = { ...info, [key]: value };
  fs.outputJsonSync(storeFilePath, newInfo);
};
