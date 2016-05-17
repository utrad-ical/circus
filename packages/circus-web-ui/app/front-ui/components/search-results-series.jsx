import React from 'react';
import { SearchResults } from './search-results.jsx';

const SeriesInfoRenderer = props => {
	return <div className="search-result series">
		<input type="checkbox" />
		<div className="modality">{props.modality}</div>
		<div className="series-uid">{props.seriesUID}</div>
	</div>;
};

const sortOptions = {
	age: 'Age',
	seriesUID: 'Series instance UID'
};

export const SearchResultsForSeries = props => {
	return <SearchResults
		renderer={SeriesInfoRenderer}
		sortOptions={sortOptions}
		{...props}
	/>;
};
