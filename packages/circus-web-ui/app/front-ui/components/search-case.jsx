import React from 'react';
import { CaseSearchCondition } from './search-condition-case.jsx';
import { SeriesSearchResults } from './search-results-series.jsx';
import { SearchCommon } from './search-common.jsx';

export class CaseSearch extends SearchCommon {
	constructor(props) {
		super(props);
		this.conditionComp = CaseSearchCondition;
		this.resultComp = SeriesSearchResults;
		this.setInitialCondition();
	}
};
