import { store } from 'store';

/*
 * Adds/hides message boxes.
 * By default, message boxes are not closed unless manually dismissed.
 * 'Short' messages are automatically dismissed after 5 seconds.
 */

export function showMessage(
	message,
	style,
	{ tag, short = false } = {}
) {
	const id = Math.random().toString(); // random message id
	store.dispatch({
		type: 'MESSAGE_ADD',
		id,
		tag,
		message,
		style
	});
	if (short) {
		setTimeout(() => dismissMessage(id), 5000);
	}
}

export function dismissMessage(id) {
	store.dispatch({
		type: 'MESSAGE_DISMISS',
		id
	});
}
