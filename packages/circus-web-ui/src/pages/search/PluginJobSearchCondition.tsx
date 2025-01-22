import React, { useState, useEffect, useMemo } from 'react';
import { modalities } from '../../modalities';
import ConditionFrame, { Condition } from './ConditionFrame';
import { escapeRegExp } from 'utils/util';
import * as et from '@smikitky/rb-components/lib/editor-types';
import DateRangePicker, {
  DateRange,
  dateRangeToMongoQuery
} from '@smikitky/rb-components/lib/DateRangePicker';
import AgeMinMax from 'components/AgeMinMax';
import { conditionToMongoQuery } from '@smikitky/rb-components/lib/ConditionEditor';
import SearchPanel from 'pages/search/SearchPanel';
import { useApi } from 'utils/api';
import PluginDisplay from 'components/PluginDisplay';
import { PropertyEditorProperties } from '@smikitky/rb-components/lib/PropertyEditor';

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

  const api = useApi();
  const [plugins, setPlugins] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const data = await api('/plugins');
      if (!isMounted) return;
      setPlugins(data);
    };
    load();

    return () => {
      isMounted = false;
    };
  }, [api]);

  const basicConditionProperties = useMemo<
    PropertyEditorProperties<any>
  >(() => {
    const pluginOptions: { [key: string]: any } = { all: 'All' };
    plugins.forEach(p => (pluginOptions[p.pluginId] = p.pluginId));
    return [
      {
        key: 'pluginId',
        caption: 'Plugin',
        editor: et.shrinkSelect(pluginOptions, { renderer: PluginRenderer })
      },
      { key: 'jobId', caption: 'Job ID', editor: et.text() },
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
  }, [plugins]);

  const advancedConditionKeys = useMemo(() => {
    const pluginOptions: { [key: string]: any } = {};
    plugins.forEach(
      p =>
        (pluginOptions[p.pluginId] = {
          caption: `${p.pluginName} v.${p.version}`
        })
    );
    return {
      pluginId: {
        caption: 'plugin',
        type: 'select',
        spec: { options: pluginOptions }
      },
      jobId: { caption: 'job ID', type: 'text' },
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
  }, [plugins]);

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
