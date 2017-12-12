import React from 'react';
import CaseSearchCondition from './CaseSearchCondition';
import CaseSearchResults from './CaseSearchResults';
import SearchCommon from './SearchCommon';

export default class CaseSearch extends React.Component {
	render() {
		return <SearchCommon
			title='Case Search'
			icon='circus-case'
			searchName='case'
			resource='cases'
			defaultSort='{"createTime":-1}'
			conditionComp={CaseSearchCondition}
			resultComp={CaseSearchResults}
			defaultCondition={CaseSearchCondition.nullCondition()}
		/>;
	}
}
