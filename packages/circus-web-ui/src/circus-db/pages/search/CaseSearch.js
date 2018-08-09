import React from 'react';
import CaseSearchResults from './CaseSearchResults';
import CaseSearchCondition from './CaseSearchCondition';
import Icon from 'shared/components/Icon';

const CaseSearch = props => (
  <div>
    <h1>
      <Icon icon="circus-case" /> Case Search
    </h1>
    <CaseSearchCondition presetName={props.params.presetName} />
    <CaseSearchResults />
  </div>
);

export default CaseSearch;
