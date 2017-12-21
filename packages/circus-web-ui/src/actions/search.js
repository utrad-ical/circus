import { api } from 'utils/api';

function beginQuery(params) {
	return async (dispatch, getState) => {
		const state = getState();
		const name = params.name;
		const search = state.searches[name];
		if (search && search.isFetching) {
			throw new Error('Previous search not finished');
		}
	
		const resource = params.resource || search.resource;
		const filter = params.filter || search.filter;
		const condition = params.condition || search.condition;
		const page = params.page || search.page;
		const sort = params.sort || search.sort;
		const per = params.per || search.per;

		try {
			dispatch({
				type: 'SET_SEARCH_QUERY_BUSY',
				name,
				isFetching: true
			});
			const query = { filter, sort, page };
			const result = await api(resource, { params: query });
			dispatch({
				type: 'LOAD_SEARCH_RESULTS',
				name,
				resource,
				filter,
				condition,
				sort,
				per,
				page: result.page,
				items: result.items,
				totalItems: result.totalItems
			});
		} finally {
			dispatch({
				type: 'SET_SEARCH_QUERY_BUSY',
				name,
				isFetching: false
			});
		}
	};
}

export function startNewSearch(name, resource, filter, condition, sort) {
	// 'filter' is a query object sent to the server.
	// 'conditon' represents a state of a search condition panel,
	// from which `filter` is constructed.
	return beginQuery({ name, resource, filter, condition, page: 1, per: 20, sort });
}

export function changeSearchPage(name, page) {
	return beginQuery({ name, page });
}

export function changeSearchSort(name, sort) {
	return beginQuery({ name, sort });
}
