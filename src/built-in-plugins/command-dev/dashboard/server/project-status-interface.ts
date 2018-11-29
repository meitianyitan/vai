import { IProjectInfo } from '../../../../utils/analyse-project-interface';
import { ProjectConfig } from '../../../../utils/project-config-interface';

export interface IProjectStatus {
  projectConfig: ProjectConfig;
  analyseInfo: any;
}
