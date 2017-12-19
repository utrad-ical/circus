import React from 'react';
import { Tabs, Tab } from 'components/react-bootstrap';
import ConditionEditor from 'rb/ConditionEditor';
import PropertyEditor from 'rb/PropertyEditor';

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

	const {
		basicConditionProperties,
		advancedConditionKeys,
		condition
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
						value={condition.basicFilter}
						onChange={handleBasicFilterChange}
					/>
				</Tab>
				<Tab eventKey={2} title='Advanced'>
					<ConditionEditor
						keys={advancedConditionKeys}
						value={condition.advancedFilter}
						onChange={handleAdvancedFilterChange}
					/>
				</Tab>
			</Tabs>
		</div>
	);
};

export default ConditionFrame;
