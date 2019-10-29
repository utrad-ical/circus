import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DateRangePicker, { dateRangeToMongoQuery } from 'rb/DateRangePicker';
import { modalities } from 'modalities';
import * as et from 'rb/editor-types';
import ConditionFrame from './ConditionFrame';
import { escapeRegExp } from 'utils/util';
import { ControlLabel } from 'components/react-bootstrap';
import ProjectSelectorMultiple from 'components/ProjectSelectorMultiple';
import { conditionToMongoQuery } from 'rb/ConditionEditor';
import SearchPanel from 'pages/search/SearchPanel';
import sendSearchCondition from 'pages/search/sendSearchCondition';
import useLoginUser from 'utils/useLoginUser';

const modalityOptions = { all: 'All' };
modalities.forEach(m => (modalityOptions[m] = m));

const basicConditionToMongoQuery = condition => {
  const members = [];
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
          key = 'patientInfoCache.' + key;
        }
        if (typeof val === 'string' && !val.length) return;
        members.push({ [key]: { $regex: escapeRegExp(val) } });
        break;
    }
  });
  return members.length > 1
    ? { $and: members }
    : members.length === 1 ? members[0] : {};
};

const conditionToFilter = condition => {
  let tabFilter;
  switch (condition.type) {
    case 'basic':
      tabFilter = basicConditionToMongoQuery(
        condition.basic,
        condition.projects
      );
      break;
    case 'advanced':
      tabFilter = conditionToMongoQuery(condition.advanced);
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

const CaseSearchCondition = props => {
  const { condition, onChange } = props;

  const [availableTags, setAvailableTags] = useState({});
  const { accessibleProjects } = useLoginUser();

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
      'patientInfoCache.patientId': { caption: 'patient ID', type: 'text' },
      'patientInfoCache.patientName': { caption: 'patient name', type: 'text' },
      'patientInfoCache.age': { caption: 'age', type: 'number' },
      'patientInfoCache.sex': {
        caption: 'sex',
        type: 'select',
        spec: { options: ['M', 'F', 'O'] }
      },
      createdAt: { caption: 'import date', type: 'date' },
      tag: {
        caption: 'Tag',
        type: 'select',
        spec: { options: Object.keys(availableTags) }
      }
    }),
    [availableTags]
  );

  const updateTagList = useCallback(
    projectIds => {
      const tags = {};
      for (const pid of projectIds) {
        const p = accessibleProjects.find(p => p.projectId === pid);
        p.project.tags.forEach(t => {
          if (tags[t.name]) return;
          tags[t.name] = { caption: t.name, color: t.color };
        });
      }
      setAvailableTags(tags);
    },
    [accessibleProjects]
  );

  useEffect(() => updateTagList(condition.projects), [
    condition.projects,
    updateTagList
  ]);

  const handleSelectedProjectsChange = projectIds => {
    updateTagList(projectIds);
    const newTags = condition.basic.tags.filter(t => availableTags[t]);

    onChange({
      ...condition,
      projects: projectIds,
      basic: { ...condition.basic, tags: newTags },
      advanced: { $and: [] }
    });
  };

  return (
    <SearchPanel {...props}>
      <div style={{ marginBottom: '10px' }}>
        <ControlLabel>Project:&ensp;</ControlLabel>
        <ProjectSelectorMultiple
          projects={accessibleProjects}
          noneText="(All projects)"
          value={condition.projects}
          onChange={handleSelectedProjectsChange}
        />
      </div>
      <ConditionFrame
        condition={condition}
        onChange={onChange}
        basicConditionProperties={basicConditionProperties}
        advancedConditionKeys={advancedConditionKeys}
      />
    </SearchPanel>
  );
};

const nullCondition = () => {
  return {
    type: 'basic',
    projects: [],
    basic: { tags: [] },
    advanced: { $and: [] }
  };
};

export default sendSearchCondition({
  searchName: 'case',
  resource: 'cases',
  defaultSort: '{"createdAt":-1}',
  nullCondition,
  conditionToFilter
})(CaseSearchCondition);
