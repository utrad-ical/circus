import React from 'react';
import { modalities } from 'modalities';
import ConditionFrame from './ConditionFrame';
import { escapeRegExp } from 'utils/util';
import * as et from 'rb/editor-types';
import DateRangePicker, { dateRangeToMongoQuery } from 'rb/DateRangePicker';
import AgeMinMax from 'components/AgeMinMax';
import { conditionToMongoQuery } from 'rb/ConditionEditor';
import SearchPanel from 'pages/search/SearchPanel';

const sexOptions = { all: 'All', M: 'male', F: 'female', O: 'other' };
const modalityOptions = { all: 'All' };
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

const basicFilterToMongoQuery = condition => {
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
	return members.length > 0 ? { $and: members } : {};
};

const advancedConditionKeys = {
	modality: {
		caption: 'modality',
		type: 'select',
		spec: { options: modalities }
	},
	seriesUid: { caption: 'series UID', type: 'text' },
	seriesDescription: { caption: 'series description', type: 'text' },
	patientId: { caption: 'patient ID', type: 'text' },
	patientName: { caption: 'patient name', type: 'text' },
	age: { caption: 'age', type: 'number' },
	sex: { caption: 'sex', type: 'select', spec: { options: ['M', 'F', 'O'] } },
	seriesDate: { caption: 'series date', type: 'date' },
	updatedAt: { caption: 'import date', type: 'date' }
};

const conditionToFilter = condition => {
	switch (condition.type) {
		case 'basic':
			return basicFilterToMongoQuery(condition.basic);
		case 'advanced':
			return conditionToMongoQuery(condition.advanced);
	}
	throw new Error('Unkonwn condition type');
};

export default function SeriesSearchCondition(props) {
	const { condition, onChange, onSearch, onResetClick } = props;

	function handleSearchClick() {
		const filter = conditionToFilter(condition);
		onSearch({ condition, filter });
	}

	return (
		<SearchPanel
			onSearchClick={handleSearchClick}
			onResetClick={onResetClick}
		>
			<ConditionFrame
				condition={condition}
				onChange={onChange}
				basicConditionProperties={basicConditionProperties}
				advancedConditionKeys={advancedConditionKeys}
			/>
		</SearchPanel>
	);
}
