import React from 'react';

import { DateRangePicker, dateRangeToMongoQuery } from './daterange-picker.jsx';
import { ShrinkSelect } from './shrink-select.jsx';
import { modalities } from '../constants';
import { SearchConditionBase, FormGrid, Input } from './search-condition.jsx';
import { Well, ControlLabel } from './react-bootstrap';
import { MultiSelect } from './multiselect.jsx';

export class CaseSearchCondition extends SearchConditionBase {
	constructor(props) {
		super(props);
		this.conditionKeys = {
			caseID: { caption: 'case ID', type: 'text' },
			tag: { caption: 'Tag', type: 'select', spec: { options: [] } }
		};
	}

	static nullCondition() {
		return {
			type: 'basic',
			projects: [],
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
					members.push({ age: { $ge: val }});
					break;
				case 'maxAge':
					members.push({ age: { $le: val }});
					break;
				case 'seriesDate':
					const q = dateRangeToMongoQuery(val, 'seriesDate');
					if (q) members.push(q);
					break;
				default:
					members.push({ [key]: val });
					break;
			}
		});
		return members.length > 0 ? { $and: members } : {};
	}

	render() {
		return <Well>
			<div style={{'margin-bottom': '10px'}}>
				<ControlLabel>Project:&ensp;</ControlLabel>
				<MultiSelect options={['A','B','C']} />
			</div>
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

	const grid = FormGrid([
		[
			'Case ID',
			<Input name="caseID" value={props.value.caseID} onChange={change} />
		],
		'br',
		[
			'Patient ID',
			<Input name="patientID" value={props.value.caseID} onChange={change} />
		],
		[
			'Patient Name',
			<Input name="patientName" value={props.value.caseID} onChange={change} />
		],
		[
			'Case Created At',
			<DateRangePicker value={props.value.createdAt} onChange={v => change('createdAt', v)} />
		],
		[
			'Case Updated At',
			<DateRangePicker value={props.value.updatedAt} onChange={v => change('updatedAt', v)}  />
		],
		[
			'Tags',
			<Input name="caseID" value={props.value.caseID} onChange={change} />
		],
	]);

	return <div>
		{grid}
	</div>;
};
