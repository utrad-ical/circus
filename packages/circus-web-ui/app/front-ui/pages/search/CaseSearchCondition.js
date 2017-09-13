import React from 'react';
import DateRangePicker, { dateRangeToMongoQuery } from 'rb/DateRangePicker';
import { modalities } from 'modalities';
import ConditionFrame, { FormGrid, Input } from './ConditionFrame';
import { Well, ControlLabel } from 'components/react-bootstrap';
import { MultiSelect } from 'components/multiselect';
import { store } from 'store';

export default class CaseSearchCondition extends React.Component {
	constructor(props) {
		super(props);
		this.conditionKeys = {
			caseID: { caption: 'case ID', type: 'text' },
			tag: { caption: 'Tag', type: 'select', spec: { options: [] } },
		};
		const projects = store.getState().loginUser.data.accessibleProjects;
		const projectOptions = {};
		projects.filter(p => p.roles.indexOf('readGroups') > -1)
			.forEach(p => {
				projectOptions[p.project.projectID] =
					{ caption: p.project.projectName, project: p.project };
			});
		this.state = {
			selectedProjects: [],
			projectOptions,
			availableTags: {}
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
				case 'seriesDate': {
					const q = dateRangeToMongoQuery(val, 'seriesDate');
					if (q) members.push(q);
					break;
				}
				default:
					members.push({ [key]: val });
					break;
			}
		});
		return members.length > 0 ? { $and: members } : {};
	}

	render() {
		return <Well>
			<div style={{marginBottom: '10px'}}>
				<ControlLabel>Project:&ensp;</ControlLabel>
				<MultiSelect options={this.state.projectOptions}
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
				basicFilterToMongoQuery={this.basicFilterToMongoQuery}
				nullCondition={CaseSearchCondition.nullCondition}
				formParams={{ availableTags: this.state.availableTags }}
			/>
		</Well>;
	}
}

const modalityOptions = { all: 'All' };
modalities.forEach(m => modalityOptions[m] = m);

const BasicConditionForm = props => {
	const change = (key, newValue) => {
		if (newValue === null ||
			typeof newValue === 'string' && newValue.length === 0 ||
			key.match(/modality|sex/) && newValue === 'all'
		) {
			const newCondition = { ...props.value };
			delete newCondition[key];
			props.onChange(newCondition);
		} else {
			props.onChange({ ...props.value, [key]: newValue });
		}
	};

	const grid = FormGrid([
		[
			'Case ID',
			<Input name='caseID' value={props.value.caseID} onChange={change} />
		],
		'br',
		[
			'Patient ID',
			<Input name='patientID' value={props.value.patientID} onChange={change} />
		],
		[
			'Patient Name',
			<Input name='patientName' value={props.value.patientName} onChange={change} />
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
			<MultiSelect options={props.availableTags} value={props.value.tags}
				onChange={v => change('tags', v)}
			/>
		],
	]);

	return <div>
		{grid}
	</div>;
};
