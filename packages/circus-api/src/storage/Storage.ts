export default interface Storage {
  read: (key: string) => Promise<Buffer>;
  write: (key: string, data: Buffer) => Promise<void>;
  remove: (key: string) => Promise<void>;
  exists: (key: string) => Promise<boolean>;
}
