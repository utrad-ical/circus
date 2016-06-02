import React from 'react';

import { DateRangePicker, dateRangeToMongoQuery } from 'components/daterange-picker';
import { ShrinkSelect } from 'components/shrink-select';
import { modalities } from 'constants';
import { SearchConditionBase, FormGrid, Input } from './search-condition';
import { escapeRegExp } from 'utils/util';
import { Well } from 'components/react-bootstrap';

export class SeriesSearchCondition extends SearchConditionBase {
	constructor(props) {
		super(props);
		this.conditionKeys = {
			modality: { caption: 'modality', type: 'select', spec: { options: modalities }},
			seriesUID: { caption: 'series UID', type: 'text' },
			seriesDescription: { caption: 'series description', type: 'text' },
			patientID: { caption: 'patient ID', type: 'text' },
			patientName: { caption: 'patient name', type: 'text' },
			age: { caption: 'age', type: 'number' },
			sex: { caption: 'sex', type: 'select', spec: { options: ['M', 'F', 'O'] } },
			seriesDate: { caption: 'series date', type: 'text' },
		};
	}

	static nullCondition() {
		return {
			type: 'basic',
			basicFilter: {},
			advancedFilter: { $and: [] }
		};
	}

	basicFilterToMongoQuery(condition) {
		const members = [];
		Object.keys(condition).forEach(key => {
			const val = condition[key];
			switch (key) {
				case 'minAge':
					members.push({ 'patientInfo.age': { $gte: val }});
					break;
				case 'maxAge':
					members.push({ 'patientInfo.age': { $lte: val }});
					break;
				case 'seriesDate':
					const q = dateRangeToMongoQuery(val, 'seriesDate');
					if (q) members.push(q);
					break;
				default:
					if (key.match(/^(patient(.+)|sex)$/)) {
						key = 'patientInfo.' + key;
					}
					members.push({ [key]: { $regex: escapeRegExp(val) } });
					break;
			}
		});
		return members.length > 0 ? { $and: members } : {};
	}

	render() {
		return <Well>
			{this.renderUsing(BasicConditionForm)}
		</Well>
	}
}

const sexOptions = { all: 'All', M: 'male', F: 'female', O: 'other' };
const modalityOptions = { all: 'All' };
modalities.forEach(m => modalityOptions[m] = m);

const BasicConditionForm = props => {
	const change = (key, newValue) => {
		if (newValue === null ||
			typeof newValue === 'string' && newValue.length === 0 ||
			key.match(/modality|sex/) && newValue === 'all'
		) {
			let newCondition = { ...props.value };
			delete newCondition[key];
			props.onChange(newCondition);
		} else {
			props.onChange({ ...props.value, [key]: newValue });
		}
	};

	return FormGrid([
		[
			'Modality',
			<ShrinkSelect options={modalityOptions} defaultSelect="all"
				value={props.value.modality} onChange={v => change('modality', v)} />
		],
		'br',
		[
			'Series UID',
			<Input name="seriesUID" value={props.value.seriesUID} onChange={change} />
		],
		[
			'Series Description',
			<Input name="seriesDescription" value={props.value.seriesDescription} onChange={change} />
		],
		[
			'Patient ID',
			<Input name="patientID" value={props.value.patientID} onChange={change} />
		],
		[
			'Patient Name',
			<Input name="patientName" value={props.value.patientName} onChange={change} />
		],
		[
			'Age',
			<div className="form-inline">
				<Input type="number" name="minAge" className="age"
					value={props.value.minAge} onChange={change} />
				&thinsp;&mdash;&thinsp;
				<Input type="number" name="maxAge" className="age"
					value={props.value.maxAge} onChange={change} />
			</div>
		],
		[
			'Sex',
			<ShrinkSelect options={sexOptions}
				value={props.value.sex} defaultSelect="all"
				onChange={v => change('sex', v)} />
		],
		[
			'Series Date',
			<DateRangePicker value={props.value.seriesDate} onChange={r => change('seriesDate', r)} />
		]
	]);
};
