import SeriesSearchCondition from './SeriesSearchCondition';
import SeriesSearchResults from './SeriesSearchResults';
import SearchCommon from './SearchCommon';

export default class SeriesSearch extends SearchCommon {
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
