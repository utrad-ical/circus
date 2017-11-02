import randomstring from 'randomstring';

export async function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateProjectId() {
	return randomstring.generate({ length: 32, charset: 'hex' });
}