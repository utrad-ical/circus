import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DateRangePicker, {
  dateRangeToMongoQuery
} from '@smikitky/rb-components/lib/DateRangePicker';
import { modalities } from 'modalities';
import * as et from '@smikitky/rb-components/lib/editor-types';
import ConditionFrame from './ConditionFrame';
import { escapeRegExp } from 'utils/util';
import { ControlLabel } from 'components/react-bootstrap';
import ProjectSelectorMultiple from 'components/ProjectSelectorMultiple';
import { conditionToMongoQuery } from '@smikitky/rb-components/lib/ConditionEditor';
import SearchPanel from 'pages/search/SearchPanel';
import useLoginUser from 'utils/useLoginUser';
import { Condition as BaseCondition } from './ConditionFrame';

const modalityOptions: { [key: string]: string } = { all: 'All' };
modalities.forEach(m => (modalityOptions[m] = m));

interface Condition extends BaseCondition {
  projects: string[];
}

const basicConditionToMongoQuery = (condition: Condition['basic']) => {
  const members: any[] = [];
  Object.keys(condition).forEach(key => {
    const val = condition[key];
    switch (key) {
      case 'createdAt':
      case 'updatedAt': {
        const q = dateRangeToMongoQuery(val, key);
        if (q) members.push(q);
        break;
      }
      case 'tags':
        if (val.length) members.push({ tags: { $in: val } });
        break;
      default:
        if (key.match(/^(patient(.+))$/)) {
          key = 'patientInfo.' + key;
        }
        if (typeof val === 'string' && !val.length) return;
        members.push({ [key]: { $regex: escapeRegExp(val) } });
        break;
    }
  });
  return members.length > 1
    ? { $and: members }
    : members.length === 1
    ? members[0]
    : {};
};

const conditionToFilter = (condition: Condition) => {
  let tabFilter;
  switch (condition.type) {
    case 'basic':
      tabFilter = basicConditionToMongoQuery(condition.basic);
      break;
    case 'advanced':
      tabFilter = conditionToMongoQuery(condition.advanced, [
        'createdAt',
        'updatedAt'
      ]);
      break;
    default:
      throw new Error('Unknown conditoin type.');
  }
  if (condition.projects.length === 0) return tabFilter;
  if (tabFilter.$and) {
    return {
      $and: [...tabFilter.$and, { projectId: { $in: condition.projects } }]
    };
  } else {
    return { $and: [tabFilter, { projectId: { $in: condition.projects } }] };
  }
};

const ConditionEditor: React.FC<{
  value: Condition;
  onChange: (value: Condition) => void;
}> = props => {
  const { value, onChange } = props;
  const [availableTags, setAvailableTags] = useState<any>({});
  const { accessibleProjects } = useLoginUser()!;

  const basicConditionProperties = useMemo(
    () => [
      { key: 'caseId', caption: 'Case ID', editor: et.text() },
      { key: 'patientId', caption: 'Patient ID', editor: et.text() },
      { key: 'patientName', caption: 'Patient Name', editor: et.text() },
      {
        key: 'createdAt',
        caption: 'Create Time',
        editor: DateRangePicker
      },
      {
        key: 'updatedAt',
        caption: 'Update Time',
        editor: DateRangePicker
      },
      { key: 'tags', caption: 'Tags', editor: et.multiSelect(availableTags) }
    ],
    [availableTags]
  );

  const advancedConditionKeys = useMemo(
    () => ({
      caseId: { caption: 'case ID', type: 'text' },
      'patientInfo.patientId': { caption: 'patient ID', type: 'text' },
      'patientInfo.patientName': { caption: 'patient name', type: 'text' },
      'patientInfo.age': { caption: 'age', type: 'number' },
      'patientInfo.sex': {
        caption: 'sex',
        type: 'select',
        spec: { options: ['M', 'F', 'O'] }
      },
      createdAt: { caption: 'create time', type: 'date' },
      updatedAt: { caption: 'update time', type: 'date' },
      tag: {
        caption: 'Tag',
        type: 'select',
        spec: { options: Object.keys(availableTags) }
      }
    }),
    [availableTags]
  );

  const updateTagList = useCallback(
    (projectIds: string[]) => {
      const tags: any = {};
      for (const pid of projectIds) {
        const p = accessibleProjects.find(p => p.projectId === pid);
        if (!p) continue;
        p.project.tags.forEach(t => {
          if (tags[t.name]) return;
          tags[t.name] = { caption: t.name, color: t.color };
        });
      }
      setAvailableTags(tags);
    },
    [accessibleProjects]
  );

  useEffect(() => updateTagList(value.projects), [
    value.projects,
    updateTagList
  ]);

  const handleSelectedProjectsChange = (projectIds: string[]) => {
    updateTagList(projectIds);
    const newTags = value.basic.tags.filter((t: string) => availableTags[t]);

    onChange({
      ...value,
      projects: projectIds,
      basic: { ...value.basic, tags: newTags },
      advanced: { $and: [] }
    });
  };

  return (
    <>
      <div style={{ marginBottom: '10px' }}>
        <ControlLabel>Project:&ensp;</ControlLabel>
        <ProjectSelectorMultiple
          projects={accessibleProjects}
          noneText="(All projects)"
          value={value.projects}
          onChange={handleSelectedProjectsChange}
        />
      </div>
      <ConditionFrame
        condition={value}
        onChange={onChange}
        basicConditionProperties={basicConditionProperties}
        advancedConditionKeys={advancedConditionKeys}
      />
    </>
  );
};

const nullCondition = (): Condition => {
  return {
    type: 'basic',
    projects: [],
    basic: { tags: [] },
    advanced: { $and: [] }
  };
};

const CaseSearchCondition: React.FC<{}> = props => {
  return (
    <SearchPanel
      searchName="case"
      resource="cases"
      defaultSort='{"createdAt":-1}'
      nullCondition={nullCondition}
      conditionToFilter={conditionToFilter}
      conditionEditor={ConditionEditor}
    />
  );
};

export default CaseSearchCondition;
