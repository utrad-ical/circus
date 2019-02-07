import inquirer from 'inquirer';
import password from 'node-php-password';

export function help() {
  console.log(
    "Generates a hash that is compatible with PHP's password_hash().\n"
  );
  console.log('Use this to reset/modify the password of a user.');
}

export async function exec() {
  const res = await inquirer.prompt([
    {
      type: 'password',
      name: 'pwd1',
      message: 'Input raw password:'
    },
    {
      type: 'password',
      name: 'pwd2',
      message: 'Retype the same password'
    }
  ]);

  const { pwd1, pwd2 } = res;
  if (pwd1 !== pwd2) {
    throw new Error('Password mismatch.');
  }

  console.log(password.hash(pwd1, undefined, undefined));
}
