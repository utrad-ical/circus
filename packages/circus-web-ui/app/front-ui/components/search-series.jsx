import React from 'react';
import { SeriesSearchCondition } from './search-condition-series.jsx';
import { SeriesSearchResults } from './search-results-series.jsx';
import { SearchCommon } from './search-common.jsx';

export class SeriesSearch extends SearchCommon {
	constructor(props) {
		super(props);
		this.conditionComp = SeriesSearchCondition;
		this.resultComp = SeriesSearchResults;
		this.setInitialCondition();
	}
};
