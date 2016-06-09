import { createStore, combineReducers } from 'redux';

// This store should contain only information shared across pages,
// such as the login user information.

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

function messages(state = [], action) {
	switch (action.type) {
		case 'MESSAGE_ADD':
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
		case 'MESSAGE_DISMISS':
			return state.filter(box => box.id !== action.id);
	}
	return state;
}

const reducer = combineReducers({
	loginUser,
	messages
});

export const store = createStore(reducer);
