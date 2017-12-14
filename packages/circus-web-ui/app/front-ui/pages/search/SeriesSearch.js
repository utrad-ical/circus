import React from 'react';
import SeriesSearchCondition from './SeriesSearchCondition';
import SeriesSearchResults from './SeriesSearchResults';
import SearchCommon from './SearchCommon';

const nullCondition = () => {
	return {
		type: 'basic',
		basicFilter: { modality: 'all', sex: 'all' },
		advancedFilter: { $and: [ { keyName: 'modality', op: '==', value: 'CT' } ] }
	};
};

export default class SeriesSearch extends React.Component {
	render() {
		return <SearchCommon
			title='Series Search'
			icon='circus-series'
			searchName='series'
			resource='series'
			defaultSort='{"createdAt":-1}'
			conditionComp={SeriesSearchCondition}
			resultComp={SeriesSearchResults}
			nullCondition={nullCondition}
		/>;
	}
}
