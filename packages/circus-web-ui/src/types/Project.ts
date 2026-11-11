import type { CircusIconDefinition } from '#components/BodyPartIcon.tsx';
import type { Schema } from '@smikitky/rb-components/lib/JsonSchemaEditor';
import type CaseTag from './CaseTag.ts';

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
