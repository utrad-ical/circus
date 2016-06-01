import { createStore, combineReducers } from 'redux';

function loginUser(state = null, action) {
	switch (action.type) {
		case 'LOAD_LOGIN_INFO':
			return action.loginUser;
	}
	return null;
}

const reducer = combineReducers({
	loginUser
});

export const store = createStore(reducer);
