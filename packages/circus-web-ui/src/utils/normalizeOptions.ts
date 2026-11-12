export type SelectOptions =
  | string[]
  | { [key: string]: string | { caption: string; [prop: string]: any } };

export type NormalizedOption = { caption: string; [prop: string]: any };

const normalizeOptions = (
  options: SelectOptions
): { [key: string]: NormalizedOption } =>
  Array.isArray(options)
    ? Object.fromEntries(options.map(opt => [opt, { caption: opt }]))
    : Object.fromEntries(
        Object.entries(options).map(([key, opt]) => [
          key,
          typeof opt === 'string' ? { caption: opt } : opt
        ])
      );

export default normalizeOptions;
