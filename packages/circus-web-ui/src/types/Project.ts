import { CircusIconDefinition } from 'components/BodyPartIcon';
import { Schema } from '@smikitky/rb-components/lib/JsonSchemaEditor';
import CaseTag from './CaseTag';

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
  tags: CaseTag[];
  windowPresets: WindowPreset[];
  windowPriority: string;
  caseAttributesSchema: Schema;
  labelAttributesSchema: Schema;
}
