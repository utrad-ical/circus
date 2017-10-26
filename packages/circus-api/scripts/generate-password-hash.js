const readline = require('readline');
const password = require('node-php-password');

// Generates a hash that is compatible with PHP's password_hash().

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.question('Raw password? ', ans => {
	console.log(password.hash(ans));
	rl.close();
});