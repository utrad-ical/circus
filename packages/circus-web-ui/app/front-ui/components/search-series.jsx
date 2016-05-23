import React from 'react';
import { SeriesSearchCondition } from './search-condition-series.jsx';
import { SeriesSearchResults } from './search-results-series.jsx';

export class SeriesSearch extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			seriesCondition: {
				projects: [],
				type: 'basic',
				basicFilter: {},
				advancedFilter: { $and: [] }
			},
			seriesSearchResults: null
		};
	}

	conditionChange(newCondition) {
		this.setState({ seriesCondition: newCondition });
	};

	search(condition) {
		const params = { data: { filter: condition } };
		api('series', params).then(results => {
			console.log(results);
			this.setState({ seriesSearchResults: results });
		});
	}

	render() {
		return <div>
			<SeriesSearchCondition condition={this.state.seriesCondition}
				projects={this.state.projectList}
				onSearch={this.search.bind(this)}
				onChange={this.conditionChange.bind(this)} />
			{ Array.isArray(this.state.seriesSearchResults) ?
				<SeriesSearchResults items={this.state.seriesSearchResults} />
			: null }
		</div>;
	}
};
