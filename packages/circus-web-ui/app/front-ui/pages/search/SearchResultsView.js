import React from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import { Pagination } from 'components/react-bootstrap';
import { changeSearchPage, changeSearchSort } from 'actions';

export default class SearchResultsView extends React.Component {
	sortChange(sort) {
		changeSearchSort(this.props.name, sort);
	}

	pageClick(page) {
		if (page === this.props.page) return;
		changeSearchPage(this.props.name, page);
	}

	makeSortOptions(sortKeys) {
		const options = {};
		Object.keys(sortKeys).forEach(k => {
			options[`${k} desc`] = `${sortKeys[k]} desc`;
			options[`${k} asc`] = `${sortKeys[k]} asc`;
		});
		this.sortOptions = options;
	}

	renderItem(item) {
		// dumb default renderer
		return <div>{JSON.stringify(item)}</div>;
	}

	render() {
		if (!this.props.items) return null;

		const { totalItems, per, items, page, sort } = this.props;
		const pages = Math.ceil(totalItems / per);
		return <div className='search-results-container'>
			<div className='search-results-header'>
				{totalItems + ' Result' + (totalItems === 1 ? '' : 's')}
				&emsp;
				Sort: <ShrinkSelect options={this.sortOptions}
					value={sort}
					onChange={this.sortChange.bind(this)}
				/>
			</div>
			<div className='search-results'>
				{items.map(item => this.renderItem(item))}
			</div>
			<div className='search-results-pager'>
				<Pagination prev next first last ellipsis
					items={pages} maxButtons={10} activePage={page}
					onSelect={this.pageClick.bind(this)}
				/>
			</div>
		</div>;
	}
}
