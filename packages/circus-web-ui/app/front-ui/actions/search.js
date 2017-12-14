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
		const page = params.page || search.page;
		const sort = params.sort || search.sort;
		const per = params.per || search.per;
	
		dispatch({
			type: 'START_SEARCH_QUERY',
			name
		});
		const query = { filter, sort, page };
		const result = await api(resource, { params: query });
		dispatch({
			type: 'LOAD_SEARCH_RESULTS',
			name,
			resource,
			filter,
			sort,
			per,
			page: result.page,
			items: result.items,
			totalItems: result.totalItems
		});
	};
}

export function startNewSearch(name, resource, filter, sort) {
	return beginQuery({ name, resource, filter, page: 1, per: 20, sort });
}

export function changeSearchPage(name, page) {
	return beginQuery({ name, page });
}

export function changeSearchSort(name, sort) {
	return beginQuery({ name, sort });
}
