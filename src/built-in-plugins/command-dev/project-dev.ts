import * as colors from 'colors';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as prettier from 'prettier';
import * as urlJoin from 'url-join';
import * as webpack from 'webpack';
import { vai } from '../../node';
import { analyseProject } from '../../utils/analyse-project';
import { createEntry } from '../../utils/create-entry';
import { globalState } from '../../utils/global-state';
import { log, spinner } from '../../utils/log';
import { getPluginsByOrder } from '../../utils/plugins';
import { prettierConfig } from '../../utils/prettier-config';
import { hasPluginsModified } from '../../utils/project-helper';
import * as projectState from '../../utils/project-state';
import { tempJsEntryPath, tempPath } from '../../utils/structor-config';
import { runWebpack } from '../../utils/webpack';
import { runWebpackDevServer } from '../../utils/webpack-dev-server';
import { WrapContent } from '../../utils/webpack-plugin-wrap-content';
import dashboardClientServer from './dashboard/server/client-server';
import dashboardServer from './dashboard/server/index';
import { bundleDlls, dllMainfestName, dllOutPath, libraryStaticPath } from './dll';

const dashboardBundleFileName = 'main';

export const projectDev = async (instance: typeof vai, options: any) => {
  if (options && options.debugDashboard) {
    await debugDashboard();
  } else {
    await debugProject(instance);
  }
};

const debugDashboard = async () => {
  const analyseInfo = await spinner('Analyse project', async () => {
    const scopeAnalyseInfo = await analyseProject();
    createEntry();
    return scopeAnalyseInfo;
  });

  const freePort = await portfinder.getPortPromise();
  const dashboardServerPort = await portfinder.getPortPromise({ port: freePort + 1 });

  await bundleDlls();

  // Start dashboard server
  dashboardServer({ serverPort: dashboardServerPort, analyseInfo });

  // Create dashboard entry
  const dashboardEntryFilePath = createDashboardEntry();

  // Serve dashboard
  await runWebpackDevServer({
    publicPath: '/static/',
    entryPath: dashboardEntryFilePath,
    devServerPort: freePort,
    outFileName: 'main.[hash].js',
    htmlTemplatePath: path.join(__dirname, '../../../template-dashboard.ejs'),
    htmlTemplateArgs: {
      dashboardServerPort,
      libraryStaticPath
    },
    webpackBarOptions: {
      name: 'dashboard'
    }
  });
};

const debugProject = async (instance: typeof vai) => {
  const freePort = instance.projectConfig.devPort || (await portfinder.getPortPromise());
  const dashboardServerPort = await portfinder.getPortPromise({ port: freePort + 1 });
  const dashboardClientPort = await portfinder.getPortPromise({ port: freePort + 2 });

  debugProjectPrepare(instance, dashboardClientPort);

  await instance.project.lint(false);
  await instance.project.ensureProjectFiles();
  await instance.project.checkProjectFiles();

  const analyseInfo = await spinner('Analyse project', async () => {
    const scopeAnalyseInfo = await analyseProject();
    createEntry();
    return scopeAnalyseInfo;
  });

  await bundleDlls();

  // Bundle dashboard if plugins changed or dashboard bundle not exist.
  const dashboardDistDir = path.join(globalState.projectRootPath, tempPath.dir, 'static/dashboard-bundle');
  if ((await hasPluginsModified()) || !fs.existsSync(path.join(dashboardDistDir, dashboardBundleFileName + '.js'))) {
    const dashboardEntryFilePath = createDashboardEntry();

    const status = await runWebpack({
      mode: 'production',
      publicPath: '/bundle/',
      entryPath: dashboardEntryFilePath,
      distDir: dashboardDistDir,
      outFileName: 'main.[hash].js' // dashboard has no css file
    });
    projectState.set('dashboardHash', status.hash);
  }
  const stdoutOfAnyType = process.stdout as any;
  try {
    stdoutOfAnyType.clearLine(0);
  } catch {}

  log(colors.blue('\nStart dev server.\n'));

  // Start dashboard server
  dashboardServer({ serverPort: dashboardServerPort, analyseInfo });

  if (globalState.projectConfig.useHttps) {
    log(colors.blue(`you should set chrome://flags/#allow-insecure-localhost, to trust local certificate.`));
  }

  // Start dashboard client production server
  dashboardClientServer({
    serverPort: dashboardServerPort,
    clientPort: dashboardClientPort,
    staticRootPath: path.join(globalState.projectRootPath, tempPath.dir, 'static'),
    hash: projectState.get('dashboardHash')
  });

  // Serve project
  await runWebpackDevServer({
    publicPath: globalState.projectConfig.publicPath,
    entryPath: path.join(globalState.projectRootPath, path.format(tempJsEntryPath)),
    devServerPort: freePort,
    htmlTemplatePath: path.join(__dirname, '../../../template-project.ejs'),
    htmlTemplateArgs: {
      dashboardServerPort
    },
    webpackBarOptions: {
      name: 'dev'
    },
    pipeConfig: config => {
      const dllHttpPath = urlJoin(
        `${globalState.projectConfig.useHttps ? 'https' : 'http'}://127.0.0.1:${freePort}`,
        libraryStaticPath
      );

      config.plugins.push(
        new WrapContent(
          `
          var dllScript = document.createElement("script");
          dllScript.src = "${dllHttpPath}";
          dllScript.onload = runEntry;
          document.body.appendChild(dllScript);

          function runEntry() {
        `,
          `}`
        )
      );
      return config;
    }
  });
};

function debugProjectPrepare(instance: typeof vai, dashboardClientPort: number) {
  instance.project.onCreateEntry((__, entry) => {
    if (instance.isDevelopment) {
      entry.pipeEnvironmentBody(envText => {
        return `
            ${envText}
            vaiStore.globalState = ${JSON.stringify(globalState)}
          `;
      });

      // Jump page from iframe dashboard event.
      entry.pipeAppClassDidMount(entryDidMount => {
        return `
          ${entryDidMount}
          window.addEventListener("message", event => {
            const data = event.data
            switch(data.type) {
              case "changeRoute":
                customHistory.push(data.path)
                break
              default:
            }
          }, false)
        `;
      });

      // React hot loader
      entry.pipeEntryHeader(
        header => `
        ${header}
        import { hot, setConfig } from "react-hot-loader"
      `
      );

      entry.pipeEntryRender(
        str => `
        setConfig({ pureSFC: true })

        const HotApp = hot(module)(App)
        ${str}
      `
      );

      entry.pipe.set('entryRenderApp', () => `<HotApp />`);

      // Load webui iframe
      entry.pipeEntryRender(
        str => `
        ${str}
        const webUICss = \`
          #vai-help-button {
            position: fixed;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 140px;
            height: 30px;
            transform: rotate(90deg);
            font-size: 14px;
            right: -55px;
            top: calc(50% - 15px);
            border: 1px solid #ddd;
            border-top: none;
            border-bottom-left-radius: 5px;
            border-bottom-right-radius: 5px;
            color: #666;
            z-index: 10001;
            cursor: pointer;
            transition: all .2s;
            background-color: white;
            user-select: none;
          }

          #vai-help-button.active {
            right: 744px !important;
          }

          #vai-help-button:hover {
            color: black;
          }

          #vai-help-iframe {
            position: fixed;
            right: -810px;
            z-index: 10000;
            background-color: white;
            width: 800px;
            top: 0;
            height: 100%;
            border: 0;
            outline: 0;
            box-shadow: -1px 0 1px #d4d4d4;
            transition: right .2s;
          }

          #vai-help-iframe.active {
            right: 0 !important;
          }
        \`
        const webUIStyle = document.createElement('style')

        webUIStyle.type = "text/css"
        if ((webUIStyle as any).styleSheet){
          (webUIStyle as any).styleSheet.cssText = webUICss
        } else {
          webUIStyle.appendChild(document.createTextNode(webUICss))
        }

        document.head.appendChild(webUIStyle)

        // Add dashboard iframe
        const dashboardIframe = document.createElement("iframe")
        dashboardIframe.id = "vai-help-iframe"
        dashboardIframe.src = "//127.0.0.1:${dashboardClientPort}"
        document.body.appendChild(dashboardIframe)

        // Add dashboard button
        const dashboardButton = document.createElement("div")
        dashboardButton.id = "vai-help-button"
        dashboardButton.innerText = "Toggle dashboard"
        dashboardButton.onclick = () => {
          const activeClassName = "active"
          const isShow = dashboardIframe.classList.contains(activeClassName)

          if (isShow) {
            dashboardIframe.classList.remove(activeClassName)
            dashboardButton.classList.remove(activeClassName)
          } else {
            dashboardIframe.classList.add(activeClassName)
            dashboardButton.classList.add(activeClassName)
          }
        }
        document.body.appendChild(dashboardButton)
      `
      );
    }
  });

  if (instance.majorCommand === 'dev') {
    instance.build.pipeConfig(config => {
      if (!instance.isDevelopment) {
        return config;
      }

      config.plugins.push(
        new webpack.DllReferencePlugin({
          context: '.',
          manifest: require(path.join(dllOutPath, dllMainfestName))
        })
      );

      return config;
    });
  }
}

function createDashboardEntry() {
  const dashboardEntryMainPath = path.join(__dirname, 'dashboard/client/index');
  const dashboardEntryFilePath = path.join(globalState.projectRootPath, tempPath.dir, 'dashboard', 'main.tsx');

  const webUiEntries: string[] = [];

  Array.from(getPluginsByOrder()).forEach(plugin => {
    try {
      const packageJsonPath = require.resolve(path.join(plugin.pathOrModuleName, 'package.json'), {
        paths: [__dirname, globalState.projectRootPath]
      });
      const packageJson = fs.readJsonSync(packageJsonPath, { throws: false });
      const webEntry = _.get(packageJson, 'vai.web-entry', null);

      if (webEntry) {
        const webEntrys: string[] = typeof webEntry === 'string' ? [webEntry] : webEntry;

        webEntrys.forEach(eachWebEntry => {
          const webEntryAbsolutePath = path.resolve(path.parse(packageJsonPath).dir, eachWebEntry);
          const parsedPath = path.parse(webEntryAbsolutePath);
          const importPath = path.join(parsedPath.dir, parsedPath.name);
          webUiEntries.push(`
          // tslint:disable-next-line:no-var-requires
          const plugin${webUiEntries.length} = require("${importPath}").default`);
        });
      }
    } catch (error) {
      //
    }
  });

  fs.outputFileSync(
    dashboardEntryFilePath,
    prettier.format(
      `
      // tslint:disable-next-line:no-var-requires
      const dashboard = require("${dashboardEntryMainPath}").default

      ${
        webUiEntries.length > 0
          ? `
          ${webUiEntries.join('\n')}
          dashboard([${webUiEntries.map((each, index) => `plugin${index}`).join(',')}])
        `
          : `
          dashboard()
        `
      }
    `,
      { ...prettierConfig, parser: 'typescript' }
    )
  );

  return dashboardEntryFilePath;
}
