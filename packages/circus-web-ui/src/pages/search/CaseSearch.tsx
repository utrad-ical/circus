import React from 'react';
import CaseSearchResults from 'pages/search/CaseSearchResults';
import CaseSearchCondition from 'pages/search/CaseSearchCondition';
import Icon from 'components/Icon';

const CaseSearch: React.FC<{}> = props => {
  return (
    <div>
      <h1>
        <Icon icon="circus-case" /> Case Search
      </h1>
      <CaseSearchCondition />
      <CaseSearchResults />
    </div>
  );
};

export default CaseSearch;
