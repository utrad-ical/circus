import React from 'react';
import { Tabs, Tab, Button } from 'components/react-bootstrap';
import IconButton from 'rb/IconButton';
import ConditionEditor, { conditionToMongoQuery } from 'rb/ConditionEditor';
import PropertyEditor from 'rb/PropertyEditor';
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
		basicConditionProperties,
		advancedConditionKeys,
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
					<PropertyEditor
						className='condition-basic-filter'
						properties={basicConditionProperties}
						value={props.condition.basicFilter}
						onChange={handleBasicFilterChange}
					/>
				</Tab>
				<Tab eventKey={2} title='Advanced'>
					<ConditionEditor
						keys={advancedConditionKeys}
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
