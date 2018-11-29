import { ProjectConfig } from './project-config-interface';

export class GlobalState {
  public projectRootPath: string;
  public projectConfig = new ProjectConfig();
  public vaiPackageJson: any;
  /**
   * majorCommand
   * for example: vai dev -d, the major command is "dev"
   */
  public majorCommand: string;
  /**
   * Development enviroment.
   */
  public isDevelopment: boolean;
  /**
   * Project type
   */
  public projectType: 'project' | 'component' | 'plugin' | null;
}
