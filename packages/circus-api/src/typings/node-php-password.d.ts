declare module 'node-php-password' {
  export function verify(password: string, hash: string): boolean;
  export function hash(password: string): boolean;
}
