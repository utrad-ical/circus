import React from 'react';
import CaseSearchResults from 'pages/search/CaseSearchResults';
import CaseSearchCondition from 'pages/search/CaseSearchCondition';
import Icon from 'components/Icon';

export default class CaseSearch extends React.Component {
  render() {
    return (
      <div>
        <h1>
          <Icon icon="circus-case" /> Case Search
        </h1>
        <CaseSearchCondition />
        <CaseSearchResults />
      </div>
    );
  }
}
