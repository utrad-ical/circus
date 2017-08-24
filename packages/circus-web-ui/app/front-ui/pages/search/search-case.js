import React from 'react';
import { CaseSearchCondition } from './search-condition-case';
import { CaseSearchResults } from './search-results-case';
import { SearchCommon } from './search-common';

export class CaseSearch extends SearchCommon {
	constructor(props) {
		super(props);
		this.title = 'Case Search';
		this.glyph = 'case';
		this.searchName = 'case';
		this.defaultSort = 'createTime desc';
		this.conditionComp = CaseSearchCondition;
		this.resultComp = CaseSearchResults;
		this.state.condition = this.conditionComp.nullCondition();
	}
}
