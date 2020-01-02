declare module 'glob-promise' {
  export default function glob(pattern: string): Promise<string[]>;
}
