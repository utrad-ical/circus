import React from 'react';
import { ShrinkSelect } from 'components/shrink-select';
import { Pagination } from 'components/react-bootstrap';
import { api } from 'utils/api';

const defaultRenderer = props => <div>{JSON.stringify(props.item)}</div>;

export class SearchResults extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			filter: null,
			items: null,
			sort: 'createTime asc',
			isFetching: false,
			per: 20,
			page: 1,
		};
	}

	sortChange(sort) {
		this.requestSearch({ sort });
	}

	pageClick(page) {
		if (page === this.state.page) return;
		this.requestSearch({ page });
	}

	async requestSearch({
		filter = this.state.filter,
		sort = this.state.sort,
		page = this.state.page
	}) {
		if (filter === null) {
			this.setState({
				filter: null,
				page: 1,
				items: null,
				isFetching: false
			});
			return;
		}
		this.setState({ isFetching: true });
		const query = { filter, sort, page };
		const results = await api('series', { data: query });
		this.setState({
			isFetching: false,
			filter,
			sort: sort,
			page: results.page,
			items: results.items,
			totalItems: results.totalItems
		});
	}

	componentWillReceiveProps(newProps) {
		if (this.props.filter !== newProps.filter) {
			this.requestSearch({ filter: newProps.filter, page: 1 });
		}
	}

	componentWillMount() {
		this.requestSearch({ filter: this.props.filter });
	}

	renderItem(item) {
		// dumb default renderer
		return <div>{JSON.stringify(item)}</div>;
	}

	render() {
		if (this.state.items === null) return null;

		const { totalItems, per, items, page, sort } = this.state;
		const pages = Math.ceil(totalItems / per);
		return <div className="search-results-container">
			<div className="search-results-header">
				{totalItems + ' Result' + (totalItems === 1 ? '' : 's')}
				&emsp;
				Sort: <ShrinkSelect options={this.sortOptions}
					value={sort}
					onChange={this.sortChange.bind(this)} />
			</div>
			<div className="search-results">
				{items.map(item => this.renderItem(item))}
			</div>
			<div className="search-results-pager">
				<Pagination prev next first last ellipsis
					items={pages} maxButtons={10} activePage={page}
					onSelect={this.pageClick.bind(this)}
				/>
			</div>
		</div>;
	}
}
