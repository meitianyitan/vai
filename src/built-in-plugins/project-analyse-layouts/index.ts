import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as normalizePath from 'normalize-path';
import * as path from 'path';
import { vai } from '../../node';
import { md5 } from '../../utils/md5';
import { layoutPath, tempJsEntryPath } from '../../utils/structor-config';

const LAYOUT = 'LayoutComponent';
const LAYOUT_ROUTE = 'LayoutRoute';

interface IResult {
  projectAnalyseLayout: {
    hasLayout: boolean;
  };
}

export default async (instance: typeof vai) => {
  instance.project.onAnalyseProject(files => {
    return {
      projectAnalyseLayout: {
        hasLayout: files
          .filter(file => {
            const relativePath = path.relative(instance.projectRootPath, path.join(file.dir, file.name));

            if (!relativePath.startsWith(layoutPath.dir)) {
              return false;
            }

            return true;
          })
          .some(file => file.name === 'index')
      }
    } as IResult;
  });

  instance.project.onCreateEntry((analyseInfo: IResult, entry) => {
    if (!analyseInfo.projectAnalyseLayout.hasLayout) {
      return;
    }

    const layoutEntryRelativePath = path.relative(tempJsEntryPath.dir, path.join(layoutPath.dir, layoutPath.name));

    entry.pipeAppHeader(header => {
      return `
        ${header}
        import ${entry.pipe.get('analyseLayoutImportName', LAYOUT)} from "${normalizePath(layoutEntryRelativePath)}"
      `;
    });

    entry.pipeAppBody(body => {
      return `
        ${body}

        ${entry.pipe.get('analyseLayoutBody', '')}

        const ${LAYOUT_ROUTE} = ({ component: Component, ...rest }: any) => {
          return (
            <Route {...rest} render={(matchProps: any) => (
              <${LAYOUT}>
                <Component {...matchProps} />
              </${LAYOUT}>
            )} />
          )
        }
      `;
    });

    entry.pipe.set('commonRoute', route => {
      return LAYOUT_ROUTE;
    });
  });
};
