import React from 'react';
import DateRangePicker, { dateRangeToMongoQuery } from 'rb/DateRangePicker';
import { modalities } from '../../modalities';
import * as et from 'rb/editor-types';
import ConditionFrame from './ConditionFrame';
import { escapeRegExp } from 'shared/utils/util';
import { ControlLabel } from 'shared/components/react-bootstrap';
import { connect } from 'react-redux';
import ProjectSelectorMultiple from '../../components/ProjectSelectorMultiple';
import { conditionToMongoQuery } from 'rb/ConditionEditor';
import SearchPanel from './SearchPanel';
import sendSearchCondition from './sendSearchCondition';

const modalityOptions = { all: 'All' };
modalities.forEach(m => (modalityOptions[m] = m));

const basicConditionPropertiesTemplate = () => {
  return [
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
    { key: 'tags', caption: 'Tags', editor: et.multiSelect({}) }
  ];
};

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

const advancedConditionKeysTemplate = () => {
  return {
    caseId: { caption: 'case ID', type: 'text' },
    createdAt: { caption: 'case created at', type: 'date' },
    updatedAt: { caption: 'case updated at', type: 'date' }
  };
};

class CaseSearchConditionView extends React.Component {
  constructor(props) {
    super(props);
    this.advancedConditionKeys = {
      caseId: { caption: 'case ID', type: 'text' },
      tag: { caption: 'Tag', type: 'select', spec: { options: [] } }
    };

    this.state = {
      basicConditionProperties: basicConditionPropertiesTemplate(),
      advancedConditionKeys: advancedConditionKeysTemplate()
    };
  }

  selectedProjectsChange = projects => {
    const { accessibleProjects, condition } = this.props;
    const availableTags = {};
    for (const pid of projects) {
      const p = accessibleProjects.find(p => p.projectId === pid);
      p.project.tags.forEach(t => {
        if (availableTags[t.name]) return;
        availableTags[t.name] = { caption: t.name, color: t.color };
      });
    }
    const basicConditionProperties = basicConditionPropertiesTemplate();
    basicConditionProperties[5].editor = et.multiSelect(availableTags);
    const newTags = condition.basic.tags.filter(t => availableTags[t]);

    const advancedConditionKeys = advancedConditionKeysTemplate();
    if (Object.keys(availableTags).length) {
      advancedConditionKeys.tags = {
        caption: 'tag',
        type: 'select',
        spec: { options: Object.keys(availableTags) }
      };
    }

    this.setState({ basicConditionProperties, advancedConditionKeys });
    this.props.onChange({
      ...condition,
      projects,
      basic: {
        ...condition.basic,
        tags: newTags
      },
      advanced: { $and: [] }
    });
  };

  render() {
    const { accessibleProjects, condition } = this.props;
    const { basicConditionProperties, advancedConditionKeys } = this.state;

    return (
      <SearchPanel {...this.props}>
        <div style={{ marginBottom: '10px' }}>
          <ControlLabel>Project:&ensp;</ControlLabel>
          <ProjectSelectorMultiple
            projects={accessibleProjects}
            noneText="(All projects)"
            value={condition.projects}
            onChange={this.selectedProjectsChange}
          />
        </div>
        <ConditionFrame
          condition={condition}
          onChange={this.props.onChange}
          basicConditionProperties={basicConditionProperties}
          advancedConditionKeys={advancedConditionKeys}
        />
      </SearchPanel>
    );
  }
}

const nullCondition = () => {
  return {
    type: 'basic',
    projects: [],
    basic: { tags: [] },
    advanced: { $and: [] }
  };
};

const CaseSearchCondition = connect(state => ({
  accessibleProjects: state.loginUser.data.accessibleProjects
}))(CaseSearchConditionView);

export default sendSearchCondition({
  searchName: 'case',
  resource: 'cases',
  defaultSort: '{"createdAt":-1}',
  nullCondition,
  conditionToFilter
})(CaseSearchCondition);
