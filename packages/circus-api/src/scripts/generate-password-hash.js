import * as readline from 'readline';
import * as password from 'node-php-password';

export function help() {
  console.log(
    "Generates a hash that is compatible with PHP's password_hash().\n"
  );
  console.log('Use this to reset/modify the password of a user.');
}

export async function exec() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Raw password? ', ans => {
    console.log(password.hash(ans, undefined, undefined));
    rl.close();
  });
}
