import React from 'react';
import CaseSearchResults from 'pages/search/CaseSearchResults';
import CaseSearchCondition from 'pages/search/CaseSearchCondition';
import Icon from 'components/Icon';
import { useParams } from 'react-router-dom';

const CaseSearch: React.FC<{}> = props => {
  const presetName = useParams<any>().presetName;
  return (
    <div>
      <h1>
        <Icon icon="circus-case" /> Case Search
      </h1>
      <CaseSearchCondition presetName={presetName} />
      <CaseSearchResults />
    </div>
  );
};

export default CaseSearch;
