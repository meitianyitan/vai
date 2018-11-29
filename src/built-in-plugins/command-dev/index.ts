import * as colors from 'colors';
import * as _ from 'lodash';
import { vai } from '../../node';
import text from '../../utils/text';
import { pluginDev } from './plugin-dev';
import { projectDev } from './project-dev';

export default async (instance: typeof vai) => {
  instance.commands.registerCommand({
    name: 'dev',
    options: [['-d, --debugDashboard', 'Debug dashboard']],
    description: text.commander.dev.description,
    action: async (options: any) => {
      switch (instance.projectType) {
        case 'project':
          await projectDev(instance, options);
          break;
        case 'component':
          throw Error(colors.red(`component not support 'npm start' yet, try 'npm run docs'!`));
        case 'plugin':
          await pluginDev();
          break;
        default:
      }
    }
  });
};
