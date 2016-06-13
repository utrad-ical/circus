import React from 'react';
import { CaseSearchCondition } from './search-condition-case';
import { SeriesSearchResults } from './search-results-series';
import { SearchCommon } from './search-common';

export class CaseSearch extends SearchCommon {
	constructor(props) {
		super(props);
		this.title = 'Case Search';
		this.glyph = 'case';
		this.conditionComp = CaseSearchCondition;
		this.resultComp = SeriesSearchResults;
		this.setInitialCondition();
	}
};
