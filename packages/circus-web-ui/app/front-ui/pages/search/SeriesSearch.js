import React from 'react';
import SeriesSearchCondition from './SeriesSearchCondition';
import SeriesSearchResults from './SeriesSearchResults';
import SearchCommon from './SearchCommon';

export default class SeriesSearch extends React.Component {
	render() {
		return <SearchCommon
			title='Series Search'
			icon='circus-series'
			searchName='series'
			defaultSort='createTime desc'
			conditionComp={SeriesSearchCondition}
			resultComp={SeriesSearchResults}
			defaultCondition={SeriesSearchCondition.nullCondition()}
		/>;
	}
}
