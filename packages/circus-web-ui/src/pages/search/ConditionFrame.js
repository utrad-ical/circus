import React from 'react';
import { Tabs, Tab } from 'components/react-bootstrap';
import ConditionEditor from 'rb/ConditionEditor';
import PropertyEditor from 'rb/PropertyEditor';

const ConditionFrame = props => {
	function handleChangeType(key) {
		const type = key === 1 ? 'basic' : 'advanced';
		props.onChange({ ...props.condition, type });
	}

	function handleBasicFilterChange(basicCondition) {
		props.onChange({ ...props.condition, basic: basicCondition });
	}

	function handleAdvancedFilterChange(advancedCondition) {
		props.onChange({ ...props.condition, advanced: advancedCondition });
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
						value={condition.basic}
						onChange={handleBasicFilterChange}
					/>
				</Tab>
				<Tab eventKey={2} title='Advanced'>
					<ConditionEditor
						keys={advancedConditionKeys}
						value={condition.advanced}
						onChange={handleAdvancedFilterChange}
					/>
				</Tab>
			</Tabs>
		</div>
	);
};

export default ConditionFrame;
