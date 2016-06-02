import { createStore, combineReducers } from 'redux';

// This store should contain only information shared across pages,
// such as the login user information.

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
