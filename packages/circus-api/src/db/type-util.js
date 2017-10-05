/**
 * Converts all Date's in the given object into an ISO string
 */
export function dateToString(input) {
	const out = {};
	for (const key in input) {
		if (input.hasOwnProperty(key)) {
			if (input[key] instanceof Date) {
				out[key] = input[key].toISOString();
			} else 	if (typeof input[key] === 'object') {
				out[key] = dateToString(input[key]);
			} else {
				out[key] = input[key];
			}
		}
	}
	return out;
}
