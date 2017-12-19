import React from 'react';
import DateRangePicker, { dateRangeToMongoQuery } from 'rb/DateRangePicker';
import { modalities } from 'modalities';
import * as et from 'rb/editor-types';
import ConditionFrame from './ConditionFrame';
import { escapeRegExp } from 'utils/util';
import { Well, ControlLabel } from 'components/react-bootstrap';
import { connect } from 'react-redux';
import ProjectSelectorMultiple from 'components/ProjectSelectorMultiple';

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


class CaseSearchConditionView extends React.Component {
	constructor(props) {
		super(props);
		this.advancedConditionKeys = {
			caseId: { caption: 'case ID', type: 'text' },
			tag: { caption: 'Tag', type: 'select', spec: { options: [] } },
		};
		this.state = {
			selectedProjects: [],
			availableTags: {}
		};
		this.selectedProjectsChange = this.selectedProjectsChange.bind(this);
	}

	selectedProjectsChange(projects) {
		const availableTags = {};
		for (const pid of projects) {
			const p = this.props.accessibleProjects.find(p => p.projectId === pid).project;
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
		const { accessibleProjects } = this.props;
		return <Well>
			<div style={{marginBottom: '10px'}}>
				<ControlLabel>Project:&ensp;</ControlLabel>
				<ProjectSelectorMultiple
					projects={accessibleProjects}
					value={this.state.selectedProjects}
					onChange={this.selectedProjectsChange}
				/>
			</div>
			<ConditionFrame
				condition={this.props.condition}
				onChange={this.props.onChange}
				onSearch={this.props.onSearch}
				onResetClick={this.props.onResetClick}
				basicConditionProperties={basicConditionProperties}
				advancedConditionKeys={this.advancedConditionKeys}
				basicFilterToMongoQuery={basicFilterToMongoQuery}
			/>
		</Well>;
	}
}

const CaseSearchCondition = connect(
	state => ({ accessibleProjects: state.loginUser.data.accessibleProjects })
)(CaseSearchConditionView);

export default CaseSearchCondition;

const modalityOptions = { all: 'All' };
modalities.forEach(m => modalityOptions[m] = m);

const basicConditionProperties = [
	{ key: 'caseId', caption: 'Case ID', editor: et.text() },
	{ key: 'patientId', caption: 'Patient ID', editor: et.text() },
	{ key: 'patientName', caption: 'Patient Name', editor: et.text() },
	{ key: 'createdAt', caption: 'Case Created at', editor: DateRangePicker },
	{ key: 'updatedAt', caption: 'Case Updated at', editor: DateRangePicker },
	{ key: 'tags', caption: 'Tags', editor: et.multiSelect({ a: '1' }) }
];
