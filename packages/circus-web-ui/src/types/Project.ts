import { CircusIconDefinition } from 'components/BodyPartIcon';

export type ProjectRoles =
  | 'read'
  | 'write'
  | 'addSeries'
  | 'viewPersonalInfo'
  | 'moderate';

export interface WindowPreset {
  label: string;
  level: number;
  width: number;
}

export default interface Project {
  projectId: string;
  createdAt: string;
  updatedAt: string;
  icon: CircusIconDefinition;
  projectName: string;
  description: string;
  tags: any[];
  windowPresets: WindowPreset[];
  windowPriority: string;
  caseAttributesSchema: any[];
  labelAttributesSchema: any[];
}
