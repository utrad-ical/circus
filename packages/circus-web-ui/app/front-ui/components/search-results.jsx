import React from 'react';
import { ShrinkSelect } from './shrink-select.jsx';
import { Pagination } from './react-bootstrap';

export const SearchResults = props => {
	const defaultRenderer = props => <div>{JSON.stringify(props.item)}</div>;
	const renderer = props.renderer || defaultRenderer;
	const pages = Math.ceil(props.totalItems / props.per);

	return <div>
		<div className="text-right">
			{props.totalItems + ' Result' + (props.totalItems > 1 ? 's' : '')}
			&emsp;
			Sort: <ShrinkSelect options={props.sortOptions} value="age" />
		</div>
		<div className="search-results">
			{props.items.map((item, i) => (
				React.createElement(renderer, {...item, key: i})
			))}
		</div>
		<div className="text-center">
			<Pagination prev next first last ellipsis
				items={pages} maxButtons={10} activePage={props.page}
				onSelect={props.onPageSelect}
			/>
		</div>
	</div>
};
