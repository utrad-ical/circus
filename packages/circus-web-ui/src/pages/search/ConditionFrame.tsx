import React from 'react';
import Tabs, { Tab } from '#components/Tabs.tsx';
import ConditionEditor from '#components/ConditionEditor.tsx';
import PropertyEditor from '#components/PropertyEditor.tsx';
import styled from 'styled-components';

export interface Condition {
  type: 'basic' | 'advanced';
  basic: any;
  advanced: any;
}

const StyledDiv = styled.div`
  /* Two pairs of caption and editor in a row */
  .condition-basic-filter {
    grid-template-columns: auto 1fr auto 1fr;
    > * {
      grid-column: span 2;
    }
    @media (max-width: 768px) {
      grid-template-columns: auto 1fr;
    }
  }
`;

const ConditionFrame: <T extends Condition>(props: {
  condition: T;
  onChange: (value: T) => void;
  basicConditionProperties: any;
  advancedConditionKeys: any;
}) => React.ReactElement<any> = props => {
  const {
    basicConditionProperties,
    advancedConditionKeys,
    condition,
    onChange
  } = props;

  const handleChangeType = (key: number) => {
    const type = key === 1 ? 'basic' : 'advanced';
    onChange({ ...condition, type });
  };

  const handleBasicFilterChange = (basicCondition: any) => {
    onChange({ ...condition, basic: basicCondition });
  };

  const handleAdvancedFilterChange = (advancedCondition: any) => {
    onChange({ ...condition, advanced: advancedCondition });
  };

  const activeKey = condition.type === 'advanced' ? 2 : 1;

  return (
    <StyledDiv>
      <Tabs
        activeKey={activeKey}
        onSelect={key => handleChangeType(key as number)}
      >
        <Tab eventKey={1} title="Basic">
          <PropertyEditor
            className="condition-basic-filter"
            properties={basicConditionProperties}
            value={condition.basic}
            onChange={handleBasicFilterChange}
          />
        </Tab>
        <Tab eventKey={2} title="Advanced">
          <ConditionEditor
            keys={advancedConditionKeys}
            value={condition.advanced}
            onChange={handleAdvancedFilterChange}
          />
        </Tab>
      </Tabs>
    </StyledDiv>
  );
};

export default ConditionFrame;
