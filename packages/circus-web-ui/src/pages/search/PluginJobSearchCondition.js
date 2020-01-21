import React, { useState, useEffect, useMemo } from 'react';
import { modalities } from 'modalities';
import ConditionFrame from './ConditionFrame';
import { escapeRegExp } from 'utils/util';
import * as et from 'rb/editor-types';
import DateRangePicker, { dateRangeToMongoQuery } from 'rb/DateRangePicker';
import AgeMinMax from 'components/AgeMinMax';
import { conditionToMongoQuery } from 'rb/ConditionEditor';
import SearchPanel from 'pages/search/SearchPanel';
import sendSearchCondition from 'pages/search/sendSearchCondition';
import { useApi } from 'utils/api';
import PluginDisplay from 'components/PluginDisplay';

const sexOptions = { all: 'All', M: 'male', F: 'female', O: 'other' };
const modalityOptions = { all: 'All' };
modalities.forEach(m => (modalityOptions[m] = m));

const basicConditionToMongoQuery = condition => {
  const members = [];
  Object.keys(condition).forEach(key => {
    const val = condition[key];
    switch (key) {
      case 'age':
        if (typeof val.min === 'number')
          members.push({ 'patientInfo.age': { $gte: val.min } });
        if (typeof val.max === 'number')
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
        if (key.match(/modality|sex/) && val === 'all') return;
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

const conditionToFilter = condition => {
  switch (condition.type) {
    case 'basic':
      return basicConditionToMongoQuery(condition.basic);
    case 'advanced':
      return conditionToMongoQuery(condition.advanced, [
        'createdAt',
        'finishedAt'
      ]);
  }
  throw new Error('Unkonwn condition type');
};

const PluginRenderer = props => {
  if (props.caption === 'All') return 'All';
  return <PluginDisplay pluginId={props.caption} />;
};

const PluginSearchCondition = props => {
  const { condition, onChange } = props;
  const api = useApi();
  const [pluginOptions, setPluginOptions] = useState({ all: 'All' });
  useEffect(() => {
    const load = async () => {
      const plugins = await api('/plugins');
      const opts = { all: 'All' };
      plugins.forEach(p => (opts[p.pluginId] = p.pluginId));
      setPluginOptions(opts);
    };
    load();
  }, [api]);

  const basicConditionProperties = useMemo(
    () => [
      {
        key: 'pluginId',
        caption: 'Plugin',
        editor: et.shrinkSelect(pluginOptions, { renderer: PluginRenderer })
      },
      { key: 'patientId', caption: 'Patient ID', editor: et.text() },
      { key: 'patientName', caption: 'Pt. Name', editor: et.text() },
      { key: 'age', caption: 'Age', editor: AgeMinMax },
      { key: 'sex', caption: 'Sex', editor: et.shrinkSelect(sexOptions) },
      { key: 'createdAt', caption: 'Job Date', editor: DateRangePicker }
    ],
    [pluginOptions]
  );

  const advancedConditionKeys = useMemo(
    () => ({
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
      finishedAt: { caption: 'job finish date', type: 'date' }
    }),
    [pluginOptions]
  );

  return (
    <SearchPanel {...props}>
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
    basic: { pluginId: 'all', sex: 'all' },
    advanced: { $and: [{ keyName: 'pluginId', op: '==', value: 'all' }] }
  };
};

export default sendSearchCondition({
  searchName: 'pluginJobs',
  resource: 'plugin-jobs',
  defaultSort: '{"createdAt":-1}',
  nullCondition,
  conditionToFilter
})(PluginSearchCondition);
