import React from 'react';
import { ShrinkSelect } from './shrink-select.jsx';
import { Pagination } from './react-bootstrap';

export const SearchResults = props => {
	const defaultRenderer = props => <div>{JSON.stringify(props.item)}</div>;
	const Renderer = props.renderer || defaultRenderer;
	const pages = Math.ceil(props.totalItems / props.per);

	return <div className="search-results-container">
		<div className="search-results-header">
			{props.totalItems + ' Result' + (props.totalItems === 1 ? '' : 's')}
			&emsp;
			Sort: <ShrinkSelect options={props.sortOptions}
				value={props.sort} onChange={props.onSortChange} />
		</div>
		<div className="search-results">
			{props.items.map((item, i) => <Renderer {...item} key={i} />)}
		</div>
		<div className="search-results-pager">
			<Pagination prev next first last ellipsis
				items={pages} maxButtons={10} activePage={props.page}
				onSelect={props.onPageClick}
			/>
		</div>
	</div>
};
