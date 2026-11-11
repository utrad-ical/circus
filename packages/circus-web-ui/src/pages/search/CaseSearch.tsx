import React from 'react';
import CaseSearchResults from '#pages/search/CaseSearchResults.tsx';
import CaseSearchCondition from '#pages/search/CaseSearchCondition.tsx';
import Icon from '#components/Icon.tsx';

const CaseSearch: React.FC<{}> = props => {
  return (
    <div>
      <h1>
        <Icon icon="circus-case" /> Case Search
      </h1>
      <CaseSearchCondition />
      <CaseSearchResults searchName="case" />
    </div>
  );
};

export default CaseSearch;
