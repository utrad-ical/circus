import React from 'react';
import { modalities } from 'modalities';
import ConditionFrame from './ConditionFrame';
import { escapeRegExp } from 'utils/util';
import * as et from '@smikitky/rb-components/lib/editor-types';
import DateRangePicker, {
  dateRangeToMongoQuery
} from '@smikitky/rb-components/lib/DateRangePicker';
import AgeMinMax from 'components/AgeMinMax';
import { conditionToMongoQuery } from '@smikitky/rb-components/lib/ConditionEditor';
import SearchPanel from './SearchPanel';
import { Condition } from './ConditionFrame';

const sexOptions = { all: 'All', M: 'male', F: 'female', O: 'other' };
const modalityOptions: { [key: string]: string } = { all: 'All' };
modalities.forEach(m => (modalityOptions[m] = m));

const basicConditionProperties = [
  {
    key: 'modality',
    caption: 'Modality',
    editor: et.shrinkSelect(modalityOptions)
  },
  { key: 'seriesUid', caption: 'Series UID', editor: et.text() },
  {
    key: 'seriesDescription',
    caption: 'Series Description',
    editor: et.text()
  },
  { key: 'patientId', caption: 'Patient ID', editor: et.text() },
  { key: 'patientName', caption: 'Patient Name', editor: et.text() },
  { key: 'age', caption: 'Age', editor: AgeMinMax },
  { key: 'sex', caption: 'Sex', editor: et.shrinkSelect(sexOptions) },
  { key: 'seriesDate', caption: 'Series Date', editor: DateRangePicker }
];

const basicConditionToMongoQuery = (condition: Condition['basic']) => {
  const members: any[] = [];
  Object.keys(condition).forEach(key => {
    const val = condition[key];
    switch (key) {
      case 'age':
        if (typeof val.min === 'number')
          members.push({ 'patientInfo.age': { $gte: val.min } });
        if (typeof val.max === 'number')
          members.push({ 'patientInfo.age': { $lte: val.max } });
        break;
      case 'seriesDate': {
        const q = dateRangeToMongoQuery(val, 'seriesDate');
        if (q) members.push(q);
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

const advancedConditionKeys: any = {
  modality: {
    caption: 'modality',
    type: 'select',
    spec: { options: modalities }
  },
  seriesUid: { caption: 'series UID', type: 'text' },
  seriesDescription: { caption: 'series description', type: 'text' },
  'patientInfo.patientId': { caption: 'patient ID', type: 'text' },
  'patientInfo.patientName': { caption: 'patient name', type: 'text' },
  'patientInfo.age': { caption: 'age', type: 'number' },
  'patientInfo.sex': {
    caption: 'sex',
    type: 'select',
    spec: { options: ['M', 'F', 'O'] }
  },
  seriesDate: { caption: 'series date', type: 'date' },
  createdAt: { caption: 'import date', type: 'date' }
};

const conditionToFilter = (condition: Condition) => {
  switch (condition.type) {
    case 'basic':
      return basicConditionToMongoQuery(condition.basic);
    case 'advanced':
      return conditionToMongoQuery(
        condition.advanced,
        Object.keys(advancedConditionKeys).filter(
          k => advancedConditionKeys[k].type === 'date'
        )
      );
  }
  throw new Error('Unkonwn condition type');
};

const nullCondition = (): Condition => {
  return {
    type: 'basic',
    basic: { modality: 'all', sex: 'all' },
    advanced: { $and: [{ keyName: 'modality', op: '==', value: 'CT' }] }
  };
};

const ConditionEditor: React.FC<{
  value: Condition;
  onChange: (value: Condition) => void;
}> = props => {
  const { value, onChange } = props;
  return (
    <ConditionFrame
      condition={value}
      onChange={onChange}
      basicConditionProperties={basicConditionProperties}
      advancedConditionKeys={advancedConditionKeys}
    />
  );
};

const SeriesSearchCondition: React.FC<{}> = props => {
  return (
    <SearchPanel
      searchName="series"
      resource={{ endPoint: 'series', primaryKey: 'seriesUid' }}
      defaultSort='{"createdAt":-1}'
      nullCondition={nullCondition}
      conditionToFilter={conditionToFilter}
      conditionEditor={ConditionEditor}
    />
  );
};

export default SeriesSearchCondition;
