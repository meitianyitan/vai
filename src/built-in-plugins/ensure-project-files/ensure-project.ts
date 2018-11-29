import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';
import { pagesPath, testsPath, vai } from '../../node';
import { VAI_PACKAGE_NAME } from '../../utils/constants';
import { prettierConfig } from '../../utils/prettier-config';

export function ensureProjectFiles(instance: typeof vai) {
  ensureProjectEntry(instance);
  ensureTest(instance);
}

const ensureProjectEntry = (instance: typeof vai) => {
  const homePagePath = path.join(pagesPath.dir, 'index.tsx');
  const homePageAbsolutePath = path.join(instance.projectRootPath, homePagePath);
  const homeMarkdownPagePath = path.join(pagesPath.dir, 'index.md');
  const homeMarkdownPageAbsolutePath = path.join(instance.projectRootPath, homeMarkdownPagePath);

  if (!fs.existsSync(homePageAbsolutePath) && !fs.existsSync(homeMarkdownPageAbsolutePath)) {
    instance.project.addProjectFiles({
      fileName: homePagePath,
      pipeContent: () =>
        prettier.format(
          `
            import { isDevelopment } from "${VAI_PACKAGE_NAME}/client"
            import * as React from "react"

            class Props {

            }

            class State {

            }

            export default class Page extends React.PureComponent<Props, State> {
              public static defaultProps = new Props()
              public state = new State()

              public render() {
                return (
                  <div>
                    <h1 style={{ display: "flex", alignItems: "center", justifyContent: "center"}}>
                      Welcome to vai!
                    </h1>
                    <p style={{ padding: "10 50px" }}>
                      Current env: {isDevelopment ? "local" : "prod"}
                    </p>
                  </div>
                )
              }
            }
          `,
          { ...prettierConfig, parser: 'typescript' }
        )
    });
  }
};

export const ensureTest = (instance: typeof vai) =>
  instance.project.addProjectFiles({
    fileName: path.join(testsPath.dir, 'index.ts'),
    pipeContent: (prev: string) =>
      prev
        ? prev
        : prettier.format(
            `
              test("Example", () => {
                expect(true).toBe(true)
              })
            `,
            { ...prettierConfig, parser: 'typescript' }
          )
  });
