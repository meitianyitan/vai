import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as path from 'path';
import * as prettier from 'prettier';
import { vai } from '../../node';
import { ensureEndWithSlash, ensureStartWithSlash } from '../../utils/functional';
import { tempPath } from '../../utils/structor-config';

export default async (instance: typeof vai) => {
  instance.project.onCreateEntry((analyseInfo, entry) => {
    entry.pipeEntryRender(
      text => `
      ${
        instance.projectConfig.useServiceWorker
          ? `
        if (navigator.serviceWorker) {
          navigator.serviceWorker.register('/sw.js', {scope: "${ensureStartWithSlash(ensureEndWithSlash(instance.projectConfig.baseHref))}"})
        }
      `
          : ''
      }

      ${text}
    `
    );

    fs.outputFileSync(
      path.join(instance.projectRootPath, tempPath.dir, 'static', 'sw.js'),
      prettier.format(
        entry.pipe.get(
          'serviceWorker',
          `
          self.addEventListener("install", event => {
            self.skipWaiting()
          })

          self.addEventListener("activate", event => {
            self.clients.claim()
          });
        `
        ),
        { semi: true, singleQuote: true, parser: 'babylon' }
      )
    );
  });
};
