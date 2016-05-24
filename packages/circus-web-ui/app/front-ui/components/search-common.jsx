import React from 'react';

export class SearchCommon extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			condition: {
				type: 'basic',
				basicFilter: {},
				advancedFilter: { $and: [] }
			},
			query: { filter: null, sort: 'createTime asc', page: 1 },
			sort: 'createTime asc',
			page: 1,
			per: 2,
			searchResults: null,
			totalItems: null
		};
	}

	conditionChange(newCondition) {
		this.setState({ condition: newCondition });
	};

	searchClick(condition) {
		this.setState({ page: 1 });
		this.requestSearch({
			...this.state.query,
			filter: condition,
			page: 1
		});
	}

	sortChange(sort) {
		this.setState({ sort });
		this.requestSearch({ ...this.state.query, sort });
	}

	pageClick(page) {
		this.requestSearch({ ...this.state.query, page });
	}

	requestSearch(query) {
		this.setState({ query });
		const params = { data: query };
		api('series', params).then(results => {
			// console.log(results);
			this.setState({
				page: results.page,
				searchResults: results.items,
				totalItems: results.totalItems
			});
		});
	}

	render() {
		const ConditionComp = this.conditionComp;
		const ResultComp = this.resultComp;
		return <div>
			<ConditionComp condition={this.state.condition}
				onSearch={this.searchClick.bind(this)}
				onChange={this.conditionChange.bind(this)} />
			{ Array.isArray(this.state.searchResults) ?
				<ResultComp
					items={this.state.searchResults}
					sort={this.state.sort}
					totalItems={this.state.totalItems}
					per={this.state.per}
					page={this.state.page}
					onSortChange={this.sortChange.bind(this)}
					onPageClick={this.pageClick.bind(this)}
				/>
			: null }
		</div>;
	}
};
