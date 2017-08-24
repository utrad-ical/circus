import React from 'react';
import { SeriesSearchCondition } from './search-condition-series';
import { SeriesSearchResults } from './search-results-series';
import { SearchCommon } from './search-common';

export class SeriesSearch extends SearchCommon {
	constructor(props) {
		super(props);
		this.title = 'Series Search';
		this.glyph = 'series';
		this.searchName = 'series';
		this.defaultSort = 'createTime desc';
		this.conditionComp = SeriesSearchCondition;
		this.resultComp = SeriesSearchResults;
		this.state.condition = this.conditionComp.nullCondition();
	}
}
