import React from 'react';
import { Tabs, Tab, Button } from 'components/react-bootstrap';
import IconButton from 'rb/IconButton';
import ConditionEditor, { conditionToMongoQuery } from 'rb/ConditionEditor';
import { Tag } from 'components/tag';

export default class ConditionFrame extends React.Component {
	constructor(props) {
		super(props);
		this.handleChangeType = this.handleChangeType.bind(this);
		this.handleBasicFilterChange = this.handleBasicFilterChange.bind(this);
		this.handleAdvancedFilterChange = this.handleAdvancedFilterChange.bind(this);
		this.handleResetClick = this.handleResetClick.bind(this);
		this.handleSearchClick = this.handleSearchClick.bind(this);
	}

	handleChangeType(key) {
		const type = key === 1 ? 'basic' : 'advanced';
		this.props.onChange({ ...this.props.condition, type });
	}

	handleBasicFilterChange(basicFilter) {
		this.props.onChange({ ...this.props.condition, basicFilter });
	}

	handleAdvancedFilterChange(advancedFilter) {
		this.props.onChange({ ...this.props.condition, advancedFilter });
	}

	handleResetClick() {
		this.props.onChange(this.props.nullCondition());
	}

	handleSearchClick() {
		let condition;
		if (this.props.condition.type === 'basic') {
			condition = this.props.basicFilterToMongoQuery(this.props.condition.basicFilter);
		} else {
			condition = conditionToMongoQuery(this.props.condition.advancedFilter);
		}
		this.props.onSearch && this.props.onSearch(condition);
	}

	render() {
		const {
			basicConditionForm: BasicConditionForm,
			formParams = {}
		} = this.props;
		const activeKey = this.props.condition.type === 'advanced' ? 2 : 1;

		return <div>
			<Tabs
				animation={false}
				id='search-condition-tabs'
				activeKey={activeKey}
				onSelect={this.handleChangeType}
			>
				<Tab eventKey={1} title='Basic'>
					<BasicConditionForm
						value={this.props.condition.basicFilter}
						onChange={this.handleBasicFilterChange}
						{...formParams}
					/>
				</Tab>
				<Tab eventKey={2} title='Advanced'>
					<ConditionEditor
						keys={this.props.conditionKeys}
						value={this.props.condition.advancedFilter}
						onChange={this.handleAdvancedFilterChange}
					/>
				</Tab>
			</Tabs>
			<div className='search-buttons'>
				<Button bsStyle='link'
					onClick={this.handleResetClick}
				>
					Reset
				</Button>
				&ensp;
				<IconButton
					bsStyle='primary' icon='search'
					onClick={this.handleSearchClick}
				>
					Search
				</IconButton>
			</div>
			{ /* <div>{JSON.stringify(this.props.condition)}</div> */ }
		</div>;
	}

}

export const ProjectRenderer = props => <span>{props.projectName}</span>;

export const TagRenderer = props => <Tag name={props.name} color={props.color} />;
