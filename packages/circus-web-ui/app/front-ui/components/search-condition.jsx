import React from 'react';
import { Tabs, Tab, Form, FormGroup, FormControl, Button, Glyphicon,
	ControlLabel, Row, Col, Well } from './react-bootstrap';
import { ConditionEditor, conditionToMongoQuery } from './condition-editor.jsx';

export class SearchConditionBase extends React.Component {
	changeType(key) {
		const type = key === 1 ? 'basic' : 'advanced';
		this.props.onChange({ ... this.props.condition, type });
	};

	changeBasicFilter(basicFilter) {
		this.props.onChange({ ... this.props.condition, basicFilter });
	};

	changeAdvanedFilter(advancedFilter) {
		this.props.onChange({ ... this.props.condition, advancedFilter });
	}

	searchClick(ev) {
		let condition;
		if (this.props.condition.type === 'basic') {
			condition = this.basicFilterToMongoQuery(this.props.condition.basicFilter);
		} else {
			condition = conditionToMongoQuery(this.props.condition.advancedFilter);
		}
		this.props.onSearch && this.props.onSearch(condition);
	};

	renderUsing(BasicConditionForm) {
		const activeKey = this.props.condition.type === 'advanced' ? 2 : 1;

		return <Well>
			<Tabs animation={false} id="series-search-condition"
				activeKey={activeKey} onSelect={this.changeType.bind(this)}
			>
				<Tab eventKey={1} title="Basic">
					<BasicConditionForm
						value={this.props.condition.basicFilter}
						onChange={this.changeBasicFilter.bind(this)}
					/>
				</Tab>
				<Tab eventKey={2} title="Advanced">
					<ConditionEditor keys={this.conditionKeys}
						value={this.props.condition.advancedFilter}
						onChange={this.changeAdvanedFilter.bind(this)}
					/>
				</Tab>
			</Tabs>
			<div className="search-buttons">
				<Button bsStyle="primary" onClick={this.searchClick.bind(this)}>
					<Glyphicon glyph="search" />&ensp;Search
				</Button>
			</div>
		</Well>;
	}

}

export const Input = ({ type, name, value, onChange, className }) => {
	return <FormControl
		type={type} className={className}
		onChange={ev => onChange(name, ev.target.value)} />;
}

export const FormGrid = items => {
	let row = [];
	const rows = [row];
	items.forEach(item => {
		if (item === 'br' || row.length > 2) {
			row = [];
			rows.push(row);
		}
		if (item !== 'br') {
			const [label, content] = item;
			row.push(
				<Col md={2}><ControlLabel>{label}</ControlLabel></Col>,
				<Col md={4}>{content}</Col>
			);
		}
	});
	return <Form horizontal>
		{rows.map(r => <Row>{r}</Row>)}
	</Form>;
};

export const ProjectRenderer = props => <span>{props.projectName}</span>;

export const TagRenderer = props => <Tag name={props.name} color={props.color} />;
