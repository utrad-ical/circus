import { conditionToMongoQuery } from '@smikitky/rb-components/lib/ConditionEditor';
import DateRangePicker, {
  DateRange,
  dateRangeToMongoQuery
} from '@smikitky/rb-components/lib/DateRangePicker';
import * as et from '@smikitky/rb-components/lib/editor-types';
import { PropertyEditorProperties } from '@smikitky/rb-components/lib/PropertyEditor';
import AgeMinMax from 'components/AgeMinMax';
import PluginDisplay from 'components/PluginDisplay';
import SearchPanel from 'pages/search/SearchPanel';
import React, { useMemo } from 'react';
import useLoginUser from 'utils/useLoginUser';
import { escapeRegExp } from 'utils/util';
import { modalities } from '../../modalities';
import ConditionFrame, { Condition } from './ConditionFrame';

const sexOptions: { [key: string]: string } = {
  all: 'All',
  M: 'Male',
  F: 'Female',
  O: 'Other'
};

const modalityOptions: { [key: string]: string } = Object.fromEntries([
  ['all', 'All'],
  ...modalities.map(m => [m, m])
]);

const statusList = [
  'in_queue',
  'processing',
  'finished',
  'cancelled',
  'failed',
  'invalidated'
];
const statusOptions: { [key: string]: string } = Object.fromEntries([
  ['all', 'All'],
  ...statusList.map(s => [s, s.replace('_', ' ')])
]);

const basicConditionToMongoQuery = (condition: any) => {
  const members: any[] = [];
  Object.keys(condition).forEach(key => {
    const val = condition[key];
    switch (key) {
      case 'age':
        if (typeof val.min === 'number' && !Number.isNaN(val.min))
          members.push({ 'patientInfo.age': { $gte: val.min } });
        if (typeof val.max === 'number' && !Number.isNaN(val.max))
          members.push({ 'patientInfo.age': { $lte: val.max } });
        break;
      case 'createdAt': {
        const q = dateRangeToMongoQuery(val, 'createdAt');
        if (q) members.push(q);
        break;
      }
      case 'pluginId': {
        if (val !== 'all') members.push({ pluginId: val });
        break;
      }
      default:
        if (key.match(/modality|sex|status/) && val === 'all') return;
        if (key.match(/^(patient(.+)|sex)$/)) {
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

const conditionToFilter = (condition: any) => {
  switch (condition.type) {
    case 'basic':
      return basicConditionToMongoQuery(condition.basic);
    case 'advanced':
      return conditionToMongoQuery(
        condition.advanced,
        ['createdAt', 'finishedAt'],
        true,
        false
      );
  }
  throw new Error('Unkonwn condition type');
};

const PluginRenderer: React.FC<any> = props => {
  if (props.caption === 'All') return <>All</>;
  return <PluginDisplay pluginId={props.caption} />;
};

const ConditionEditor: React.FC<{
  value: Condition;
  onChange: (value: Condition) => void;
}> = props => {
  const { value, onChange } = props;

  const user = useLoginUser();
  const accessiblePlugins = useMemo(
    () =>
      user.accessiblePlugins.filter(
        p => p.roles.includes('executePlugin') && p.roles.includes('readPlugin')
      ),
    [user]
  );

  const basicConditionProperties = useMemo<
    PropertyEditorProperties<any>
  >(() => {
    const pluginOptions: { [key: string]: any } = { all: 'All' };
    accessiblePlugins.forEach(p => (pluginOptions[p.pluginId] = p.pluginId));
    return [
      {
        key: 'pluginId',
        caption: 'Plugin',
        editor: et.shrinkSelect(pluginOptions, { renderer: PluginRenderer })
      },
      { key: 'patientId', caption: 'Patient ID', editor: et.text() },
      { key: 'patientName', caption: 'Pt. Name', editor: et.text() },
      { key: 'age', caption: 'Age', editor: AgeMinMax },
      { key: 'sex', caption: 'Sex', editor: et.shrinkSelect(sexOptions) },
      {
        key: 'createdAt',
        caption: 'Job Date',
        editor: DateRangePicker as et.Editor<DateRange>
      },
      {
        key: 'status',
        caption: 'Status',
        editor: et.shrinkSelect(statusOptions)
      }
    ];
  }, [accessiblePlugins]);

  const advancedConditionKeys = useMemo(() => {
    const pluginOptions: { [key: string]: any } = {};
    accessiblePlugins.forEach(
      p =>
        (pluginOptions[p.pluginId] = {
          caption: `${p.plugin.pluginName} v.${p.plugin.version}`
        })
    );
    return {
      pluginId: {
        caption: 'plugin',
        type: 'select',
        spec: { options: pluginOptions }
      },
      'patientInfo.patientId': { caption: 'patient ID', type: 'text' },
      'patientInfo.patientName': { caption: 'patient name', type: 'text' },
      'patientInfo.age': { caption: 'age', type: 'number' },
      'patientInfo.sex': {
        caption: 'sex',
        type: 'select',
        spec: { options: ['M', 'F', 'O'] }
      },
      createdAt: { caption: 'job register date', type: 'date' },
      finishedAt: { caption: 'job finish date', type: 'date' },
      status: {
        caption: 'job status',
        type: 'select',
        spec: { options: statusList }
      }
    };
  }, [accessiblePlugins]);

  return (
    <ConditionFrame
      condition={value}
      onChange={onChange}
      basicConditionProperties={basicConditionProperties}
      advancedConditionKeys={advancedConditionKeys}
    />
  );
};

const nullCondition = (): Condition => {
  return {
    type: 'basic',
    basic: { pluginId: 'all', sex: 'all', status: 'all' },
    advanced: { $and: [{ keyName: 'pluginId', op: '==', value: 'all' }] }
  };
};

const PluginSearchCondition: React.FC<{}> = props => {
  return (
    <SearchPanel
      searchName="pluginJob"
      resource={{ endPoint: 'plugin-jobs', primaryKey: 'jobId' }}
      defaultSort='{"createdAt":-1}'
      nullCondition={nullCondition}
      conditionToFilter={conditionToFilter}
      conditionEditor={ConditionEditor}
    />
  );
};

export default PluginSearchCondition;
