import React from 'react';
import DateRangePicker, { dateRangeToMongoQuery } from 'rb/DateRangePicker';
import PropertyEditor from 'rb/PropertyEditor';
import { modalities } from 'modalities';
import * as et from 'rb/editor-types';
import ConditionFrame from './ConditionFrame';
import { escapeRegExp } from 'utils/util';
import { Well, ControlLabel } from 'components/react-bootstrap';
import { MultiSelect } from 'components/multiselect';
import { store } from 'store';

const basicFilterToMongoQuery = (condition) => {
	const members = [];
	Object.keys(condition).forEach(key => {
		const val = condition[key];
		switch (key) {
			case 'createdAt':
			case 'updatedAt': {
				const q = dateRangeToMongoQuery(val, 'seriesDate');
				if (q) members.push(q);
				break;
			}
			case 'tags':
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
	return members.length > 0 ? { $and: members } : {};
};


export default class CaseSearchCondition extends React.Component {
	constructor(props) {
		super(props);
		this.conditionKeys = {
			caseId: { caption: 'case ID', type: 'text' },
			tag: { caption: 'Tag', type: 'select', spec: { options: [] } },
		};
		const projects = store.getState().loginUser.data.accessibleProjects;
		const projectOptions = {};
		projects.filter(p => p.roles.indexOf('read') > -1)
			.forEach(p => {
				projectOptions[p.projectId] =
					{ caption: p.project.projectName, project: p.project };
			});
		this.state = {
			selectedProjects: [],
			projectOptions,
			availableTags: {}
		};
	}

	selectedProjectsChange(projects) {
		const availableTags = {};
		for (const pid of projects) {
			const p = this.state.projectOptions[pid].project;
			p.tags.forEach(t => {
				if (availableTags[t.name]) return;
				availableTags[t.name] = { caption: t.name, color: t.color };
			});
		}
		this.setState({
			selectedProjects: projects,
			availableTags
		});
	}

	render() {
		return <Well>
			<div style={{marginBottom: '10px'}}>
				<ControlLabel>Project:&ensp;</ControlLabel>
				<MultiSelect
					options={this.state.projectOptions}
					onChange={this.selectedProjectsChange.bind(this)}
					selected={this.state.selectedProjects}
				/>
			</div>
			<ConditionFrame
				condition={this.props.condition}
				onChange={this.props.onChange}
				onSearch={this.props.onSearch}
				basicConditionForm={BasicConditionForm}
				conditionKeys={this.conditionKeys}
				basicFilterToMongoQuery={basicFilterToMongoQuery}
				nullCondition={CaseSearchCondition.nullCondition}
				formParams={{ availableTags: this.state.availableTags }}
			/>
		</Well>;
	}
}

const modalityOptions = { all: 'All' };
modalities.forEach(m => modalityOptions[m] = m);

const properties = [
	{ key: 'caseId', caption: 'Case ID', editor: et.text() },
	{ key: 'patientId', caption: 'Patient ID', editor: et.text() },
	{ key: 'patientName', caption: 'Patient Name', editor: et.text() },
	{ key: 'createdAt', caption: 'Case Created at', editor: DateRangePicker },
	{ key: 'updatedAt', caption: 'Case Updated at', editor: DateRangePicker },
	{ key: 'tags', caption: 'Tags', editor: et.multiSelect({ a: '1' }) }
];

const BasicConditionForm = props => {
	return <PropertyEditor
		className='condition-basic-filter'
		properties={properties}
		value={props.value}
		onChange={props.onChange}
	/>;
};