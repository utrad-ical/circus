import type { UserPreferences } from '@utrad-ical/circus-api-schema';

type SearchPresetKey = Extract<keyof UserPreferences, `${string}SearchPresets`>;
type SearchPreset = NonNullable<UserPreferences[SearchPresetKey]>[number];

export type PresetSearchName =
  SearchPresetKey extends `${infer Name}SearchPresets` ? Name : never;

export const namedSearchPresets = (presets: SearchPreset[] = []) =>
  presets.filter(
    (preset): preset is SearchPreset & { name: string } =>
      typeof preset.name === 'string'
  );
