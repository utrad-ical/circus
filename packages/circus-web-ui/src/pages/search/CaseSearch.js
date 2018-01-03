import React from 'react';
import CaseSearchResults from 'pages/search/CaseSearchResults';
import CaseSearchCondition from 'pages/search/CaseSearchCondition';
import Icon from 'components/Icon';

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
