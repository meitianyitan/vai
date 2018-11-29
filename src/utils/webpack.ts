import * as webpack from 'webpack';
import * as WebpackBar from 'webpackbar';
import { getWebpackConfig } from './webpack-config';

interface IOptions {
  mode: 'production' | 'development';
  entryPath: string;
  htmlTemplatePath?: string;
  publicPath?: string;
  distDir?: string;
  outFileName?: string;
  outCssFileName?: string;
  htmlTemplateArgs?: {
    dashboardServerPort?: number;
    dashboardClientPort?: number;
    libraryStaticPath?: string;
  };
  pipeConfig?: (config?: webpack.Configuration) => webpack.Configuration;
}

const stats = {
  warnings: false,
  version: false,
  modules: false,
  entrypoints: false,
  hash: false,
  colors: true,
  children: false
};

export const runWebpack = async (opts: IOptions): Promise<any> => {
  let webpackConfig = await getWebpackConfig({
    mode: opts.mode,
    entryPath: opts.entryPath,
    htmlTemplatePath: opts.htmlTemplatePath,
    htmlTemplateArgs: opts.htmlTemplateArgs,
    publicPath: opts.publicPath,
    distDir: opts.distDir,
    outFileName: opts.outFileName,
    outCssFileName: opts.outCssFileName
  });

  if (opts.pipeConfig) {
    webpackConfig = opts.pipeConfig(webpackConfig);
  }

  webpackConfig.plugins.push(new WebpackBar());
  const compiler = webpack(webpackConfig);

  return runCompiler(compiler);
};

function runCompiler(compiler: webpack.Compiler) {
  return new Promise(resolve => {
    compiler.run((err, status) => {
      if (!err && !status.hasErrors()) {
        process.stdout.write(status.toString(stats) + '\n\n');

        resolve(status.toJson());
      } else {
        if (err && err.message) {
          throw Error(err.message);
        } else {
          throw Error(status.toString());
        }
      }
    });
  });
}
