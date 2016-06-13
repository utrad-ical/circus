import React from 'react';
import { api } from 'utils/api';

export class SearchCommon extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			condition: null,
			query: { filter: null, sort: 'createTime asc', page: 1 },
			sort: 'createTime asc',
			page: 1,
			per: 15,
			searchResults: null,
			totalItems: null
		};
	}

	setInitialCondition() {
		this.state.condition = this.conditionComp.nullCondition();
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
			<h1>
				<span className={'circus-icon-' + this.glyph} />&ensp;
				{this.title}
			</h1>
			<ConditionComp condition={this.state.condition}
				onSearch={this.searchClick.bind(this)}
				onChange={this.conditionChange.bind(this)} />
			{ /* <pre>{JSON.stringify(this.state.query, null, '  ')}</pre> */ }
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
