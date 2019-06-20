export default interface Configuration {
  [service: string]: {
    type?: string;
    options?: any;
  };
}
