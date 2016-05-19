import React from 'react';

import { Tabs, Tab, Form, FormGroup, FormControl,
	ControlLabel, Row, Col, Well } from './react-bootstrap';
import { ConditionEditor } from './condition-editor.jsx';
import { MultiSelect } from './multiselect.jsx';
import { DateRangePicker } from './daterange-picker.jsx';
import { ShrinkSelect } from './shrink-select.jsx';
import { modalities } from '../constants';
import { Tag } from './tag.jsx';

const ProjectRenderer = props => <span>{props.projectName}</span>;

export const SeriesSearchCondition = props => {
	const activeKey = props.condition.type === 'advanced' ? 2 : 1;

	// Switch Basic <=> Advanced
	const changeType = key => {
		const type = key === 1 ? 'basic' : 'advanced';
		props.onChange({ ... props.condition, type });
	};

	const changeProjects = projects => {
		const newCondition = { ... props.condition, projects };
		props.onChange(newCondition);
	};

	const changeBasicFilter = basicFilter => {
		props.onChange({ ... props.condition, basicFilter });
	};

	const changeAdvanedFilter = advancedFilter => {
		props.onChange({ ... props.condition, advancedFilter });
	}

	const availableTags = (() => {
		const tags = {};
		props.condition.projects.forEach(pid => {
			const project = props.projects[pid];
			(project.tags || []).forEach(t => {
				tags[t.name] = t;
			});
		});
		return tags;
	})();

	const conditionKeys = {
		age: { caption: 'Age', type: 'number' },
		salary: { caption: 'Salary', type: 'number' },
		name: { caption: 'Name', type: 'text' },
		address: { caption: 'Address', type: 'text' },
		sex: { caption: 'Sex', type: 'select', spec: { options: ['M', 'F', 'O'] } },
		modality: { caption: 'Modality', type: 'select', spec: { options: modalities }},
		tag: { caption: 'Tag', type: 'select',
			spec: { options: Object.keys(availableTags).map(t => availableTags[t].name) }
		}
	};

	return <Well>
		<FormGroup>
			<ControlLabel>Projects:</ControlLabel>&ensp;
			<MultiSelect options={props.projects}
				renderer={ProjectRenderer}
				selected={props.condition.projects}
				onChange={changeProjects} />
		</FormGroup>
		<Tabs animation={false} id="series-search-condition"
			activeKey={activeKey} onSelect={changeType}
		>
			<Tab eventKey={1} title="Basic">
				<BasicConditionForm
					value={props.condition.basicFilter}
					availableTags={availableTags}
					onChange={changeBasicFilter}
				/>
			</Tab>
			<Tab eventKey={2} title="Advanced">
				<ConditionEditor keys={conditionKeys}
					value={props.condition.advancedFilter}
					onChange={changeAdvanedFilter}
				/>
			</Tab>
		</Tabs>
	</Well>;
}

const Column = props => <Col md={4}>{props.children}</Col>;

const ColInput = props => <Column><Input {...props} /></Column>;

const Input = ({ type, name, value, onChange, className }) => {
	return <FormControl
		type={type} className={className}
		onChange={ev => onChange(name, ev.target.value)} />;
}

const Label = ({children}) => <Col md={2}><ControlLabel>{children}</ControlLabel></Col>;

export const basicFilter2Query = filter => {
	let members = [];
	for (let k of filter) {
		if (k === 'maxAge')
			members.push({ age: { $le: filter[k] } });
		else if (k === 'minAge')
			members.push({ age: { $ge: filter[k] } });
		else if (k === 'sex')
			members.push({ sex: filter[k]});
		else
			members.push({ [k]: { $regex: filter[k] } }); // TODO: escape
	}
	return { $and: members };
};

const sexOptions = { all: 'All', M: 'male', F: 'female', O: 'other' };
const modalityOptions = { all: 'All' };
modalities.forEach(m => modalityOptions[m] = m);

const TagRenderer = props => <Tag name={props.name} color={props.color} />;

const BasicConditionForm = props => {
	const change = (key, newValue) => {
		if (newValue === null || typeof newValue === 'string' && newValue.length === 0) {
			let newCondition = { ...props.value };
			delete newCondition[key];
			props.onChange(newCondition);
		} else {
			props.onChange({ ...props.value, [key]: newValue });
		}
	};

	return <Form horizontal>
		<Row>
			<Label>Modality</Label>
			<Column>
				<ShrinkSelect options={modalityOptions}
					value={props.value.modality} onChange={v => change('modality', v)} />
			</Column>
		</Row>
		<Row>
			<Label>Series UID</Label>
			<ColInput name="seriesUID" value={props.value.seriesUID} onChange={change} />
			<Label>Series Description</Label>
			<ColInput name="seriesDescription" value={props.value.seriesDescription} onChange={change} />
		</Row>
		<Row>
			<Label>Patient ID</Label>
			<ColInput name="patientID" value={props.value.patientID} onChange={change} />
			<Label>Patient Name</Label>
			<ColInput name="patientName" value={props.value.patientName} onChange={change} />
		</Row>
		<Row>
			<Label>Age</Label>
			<Column>
				<div className="form-inline">
					<Input type="number" name="minAge" className="age"
						value={props.value.minAge} onChange={change} />
					&thinsp;&mdash;&thinsp;
					<Input type="number" name="maxAge" className="age"
						value={props.value.maxAge} onChange={change} />
				</div>
			</Column>
			<Label>Sex</Label>
			<Column>
				<ShrinkSelect options={sexOptions} value={props.value.sex}
					onChange={v => change('sex', v)} />
			</Column>
		</Row>
		<Row>
			<Label>Series Date</Label>
			<Column>
				<DateRangePicker value={props.value.seriesDate} onChange={r => change('seriesDate', r)} />
			</Column>
			<Label>Tags</Label>
			<Column>
				<MultiSelect renderer={TagRenderer}
					options={props.availableTags}
					selected={props.value.tags}
					onChange={s => change('tags', s.length > 0 ? s : null)} />
			</Column>
		</Row>
	</Form>;
}
