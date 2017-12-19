import React from 'react';
import { Tabs, Tab, Button } from 'components/react-bootstrap';
import IconButton from 'rb/IconButton';
import ConditionEditor, { conditionToMongoQuery } from 'rb/ConditionEditor';
import { Tag } from 'components/tag';

const ConditionFrame = props => {
	function handleChangeType(key) {
		const type = key === 1 ? 'basic' : 'advanced';
		props.onChange({ ...props.condition, type });
	}

	function handleBasicFilterChange(basicFilter) {
		props.onChange({ ...props.condition, basicFilter });
	}

	function handleAdvancedFilterChange(advancedFilter) {
		props.onChange({ ...props.condition, advancedFilter });
	}

	function handleSearchClick() {
		let condition;
		if (props.condition.type === 'basic') {
			condition = props.basicFilterToMongoQuery(
				props.condition.basicFilter
			);
		} else {
			condition = conditionToMongoQuery(
				props.condition.advancedFilter
			);
		}
		props.onSearch && props.onSearch(condition);
	}

	const {
		basicConditionForm: BasicConditionForm,
		formParams = {}
	} = props;
	const activeKey = props.condition.type === 'advanced' ? 2 : 1;

	return (
		<div>
			<Tabs
				animation={false}
				id='search-condition-tabs'
				activeKey={activeKey}
				onSelect={handleChangeType}
			>
				<Tab eventKey={1} title='Basic'>
					<BasicConditionForm
						value={props.condition.basicFilter}
						onChange={handleBasicFilterChange}
						{...formParams}
					/>
				</Tab>
				<Tab eventKey={2} title='Advanced'>
					<ConditionEditor
						keys={props.conditionKeys}
						value={props.condition.advancedFilter}
						onChange={handleAdvancedFilterChange}
					/>
				</Tab>
			</Tabs>
			<div className='search-buttons'>
				<Button bsStyle='link' onClick={props.onResetClick}>
					Reset
				</Button>
				&ensp;
				<IconButton
					bsStyle='primary'
					icon='search'
					onClick={handleSearchClick}
				>
					Search
				</IconButton>
			</div>
		</div>
	);
};

export default ConditionFrame;

export const ProjectRenderer = props => <span>{props.projectName}</span>;

export const TagRenderer = props => (
	<Tag name={props.name} color={props.color} />
);
