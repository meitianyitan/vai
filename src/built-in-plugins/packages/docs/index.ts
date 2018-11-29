import * as inquirer from 'inquirer';
import * as path from 'path';
import { vai } from '../../../node';
import { exec } from '../../../utils/exec';
import { log, logError, spinner } from '../../../utils/log';
import { devDocs } from '../../command-docs';
import { packagesPath } from '../config';
import { getPackages } from '../utils';

export default async (packageName: string) => {
  const packages = await getPackages();

  if (!packageName) {
    const inquirerInfo = await inquirer.prompt([
      {
        message: `Choose packages to run docs.`,
        name: 'packageName',
        type: 'list',
        choices: packages.map(eachPackage => eachPackage.name)
      }
    ]);

    packageName = inquirerInfo.packageName;
  }

  await devDocs(vai, path.join(packagesPath, packageName, 'docs'));
};
