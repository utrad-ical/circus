import { store } from 'store';
import { api } from 'utils/api';
import { browserHistory } from 'react-router';

/**
 * Loads the user information.
 */
export async function refreshUserInfo(full = false) {
	store.dispatch({ type: 'REQUEST_LOGIN_INFO' });
	let result;
	try {
		result = await api('login-info' + (full ? '/full' : ''));
		if (typeof result.userEmail !== 'string') {
			throw Error('Server did not respond with valid user data');
		}
	} catch (err) {
		store.dispatch({ type: 'LOGGED_OUT' });
	}
	if (full) {
		store.dispatch({ type: 'LOAD_FULL_LOGIN_INFO', loginUser: result });
	} else {
		store.dispatch({ type: 'CONFIRM_LOGIN_INFO' });
	}
}

export async function login(id, password) {
	const result = await api('login', {
		data: { id, password },
		handleErrors: true
	});
	browserHistory.push('/home');
}

export async function logout() {
	const result = await api('logout');
	store.dispatch({ type: 'LOGGED_OUT' });
	browserHistory.push('/');
}
