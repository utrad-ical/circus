import CaseSearchCondition from './CaseSearchCondition';
import CaseSearchResults from './CaseSearchResults';
import SearchCommon from './SearchCommon';

export default class CaseSearch extends SearchCommon {
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
