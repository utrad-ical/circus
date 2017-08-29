import React from 'react';
import {
	Tabs, Tab, Form, FormControl, Button, Glyphicon,
	ControlLabel, Row, Col
} from 'components/react-bootstrap';
import ConditionEditor, { conditionToMongoQuery } from 'rb/ConditionEditor';
import { Tag } from 'components/tag';

export class SearchConditionBase extends React.Component {
	changeType(key) {
		const type = key === 1 ? 'basic' : 'advanced';
		this.props.onChange({ ... this.props.condition, type });
	}

	changeBasicFilter(basicFilter) {
		this.props.onChange({ ... this.props.condition, basicFilter });
	}

	changeAdvanedFilter(advancedFilter) {
		this.props.onChange({ ... this.props.condition, advancedFilter });
	}

	resetClick() {
		this.props.onChange(this.constructor.nullCondition());
	}

	searchClick() {
		let condition;
		if (this.props.condition.type === 'basic') {
			condition = this.basicFilterToMongoQuery(this.props.condition.basicFilter);
		} else {
			condition = conditionToMongoQuery(this.props.condition.advancedFilter);
		}
		this.props.onSearch && this.props.onSearch(condition);
	}

	renderUsing(BasicConditionForm, formParams = {}) {
		const activeKey = this.props.condition.type === 'advanced' ? 2 : 1;

		return <div>
			<Tabs animation={false} id='series-search-condition'
				activeKey={activeKey} onSelect={this.changeType.bind(this)}
			>
				<Tab eventKey={1} title='Basic'>
					<BasicConditionForm
						value={this.props.condition.basicFilter}
						onChange={this.changeBasicFilter.bind(this)}
						{...formParams}
					/>
				</Tab>
				<Tab eventKey={2} title='Advanced'>
					<ConditionEditor keys={this.conditionKeys}
						value={this.props.condition.advancedFilter}
						onChange={this.changeAdvanedFilter.bind(this)}
					/>
				</Tab>
			</Tabs>
			<div className='search-buttons'>
				<Button bsStyle='link'
					onClick={this.resetClick.bind(this)}
				>
					Reset
				</Button>
				&ensp;
				<Button bsStyle='primary'
					onClick={this.searchClick.bind(this)}
				>
					<Glyphicon glyph='search' />&ensp;Search
				</Button>
			</div>
			{ /* <div>{JSON.stringify(this.props.condition)}</div> */ }
		</div>;
	}

}

export const Input = ({ type, name, value, onChange, className }) => {
	return <FormControl
		type={type} className={className} value={value || ''}
		onChange={ev => onChange(name, type === 'number' ? parseFloat(ev.target.value) : ev.target.value)}
	/>;
};

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
				<Col md={2} key={label + '-l'}>
					<ControlLabel>{label}</ControlLabel>
				</Col>,
				<Col md={4} key={label + '-c'}>
					{content}
				</Col>
			);
		}
	});
	return <Form horizontal>
		{rows.map((r, i) => <Row key={i}>{r}</Row>)}
	</Form>;
};

export const ProjectRenderer = props => <span>{props.projectName}</span>;

export const TagRenderer = props => <Tag name={props.name} color={props.color} />;
