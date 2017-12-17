import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

// The redux store should contain only information shared across pages,
// such as the login user information.

/**
 * Reducer for login user.
 */
function loginUser(state = { isFetching: false, data: null }, action) {
	switch (action.type) {
		case 'LOAD_FULL_LOGIN_INFO':
			return { isFetching: false, data: action.loginUser };
		case 'CONFIRM_LOGIN_INFO':
			return { ...state, isFetching: false };
		case 'REQUEST_LOGIN_INFO':
			return { ...state, isFetching: true };
		case 'LOGGED_OUT':
			return { isFetching: false, data: null };
	}
	return state;
}

/**
 * Reducer for message boxes.
 */
function messages(state = [], action) {
	switch (action.type) {
		case 'MESSAGE_ADD': {
			let boxes;
			if (typeof action.tag === 'string') {
				boxes = state.filter(box => box.tag !== action.tag);
			} else {
				boxes = [...state];
			}
			boxes.push({
				id: action.id,
				message: action.message,
				tag: typeof action.tag === 'string' ? action.tag : null,
				style: action.style ? action.style : 'info'
			});
			return boxes;
		}
		case 'MESSAGE_DISMISS_PAGE_CHANGE':
			return state.filter(box => box.dismissOnPageChange === true);
		case 'MESSAGE_DISMISS':
			return state.filter(box => box.id !== action.id);
	}
	return state;
}

/**
 * Reducer for search results and queries.
 */
function searches(state = {}, action) {
	switch (action.type) {
		case 'START_SEARCH_QUERY':
			state = {
				...state,
				[action.name]: {
					...(state[action.name] || {}),
					isFetching: true,
				}
			};
			break;
		case 'LOAD_SEARCH_RESULTS':
			state = {
				...state,
				[action.name]: {
					isFetching: false,
					resource: action.resource,
					filter: action.filter,
					sort: action.sort,
					page: action.page,
					per: action.per,
					items: action.items,
					totalItems: action.totalItems
				}
			};
			break;
		case 'DELETE_SEARCH':
			state = { ...state };
			delete(state[action.name]);
			break;
	}
	return state;
}

const reducer = combineReducers({
	loginUser,
	messages,
	searches
});

export const store = createStore(
	reducer,
	applyMiddleware(thunk)
);