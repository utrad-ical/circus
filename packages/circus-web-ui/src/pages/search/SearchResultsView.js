import React from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import { Pagination } from 'components/react-bootstrap';
import { changeSearchPage, changeSearchSort } from 'actions';
import { store } from 'store';

export const makeSortOptions = sortKeys => {
	const options = {};
	Object.keys(sortKeys).forEach(k => {
		options[`{"${k}":-1}`] = `${sortKeys[k]} desc`;
		options[`{"${k}":1}`] = `${sortKeys[k]} asc`;
	});
	return options;
};

export default class SearchResultsView extends React.Component {
	constructor(props) {
		super(props);
		this.handlePageClick = this.handlePageClick.bind(this);
		this.handleSortChange = this.handleSortChange.bind(this);
	}

	handleSortChange(sort) {
		store.dispatch(changeSearchSort(this.props.name, sort));
	}

	handlePageClick(page) {
		if (page === this.props.page) return;
		store.dispatch(changeSearchPage(this.props.name, page));
	}

	render() {
		const { totalItems, per, items, page, sort, sortOptions, dataView: DataView } = this.props;
		const pages = Math.ceil(totalItems / per);
		return <div className='search-results-container'>
			<div className='search-results-header'>
				{totalItems + ' Result' + (totalItems === 1 ? '' : 's')}
				&emsp;
				Sort: <ShrinkSelect
					options={sortOptions}
					value={sort}
					onChange={this.handleSortChange}
				/>
			</div>
			{ items && items.length && <DataView items={items} /> }
			<div className='search-results-pager'>
				<Pagination
					prev next first last ellipsis
					items={pages} maxButtons={10} activePage={page}
					onSelect={this.handlePageClick}
				/>
			</div>
		</div>;
	}
}