import { CclOptions } from './createCclProcessor';
import { ErosionDilationOptions } from './createEdProcessor';
import { HoleFillingOptions } from './createHfProcessor';
import { IntersliceInterpolationOptions } from './createIiProcessor';

export type ProcessorDialogKey =
  | 'ccl'
  | 'filling'
  | 'erosion'
  | 'dilation'
  | 'interpolation'
  | 'section'
  | '';

export type SettingDialogProperty = {
  processorProgress: { value: number; label: string };
  onHide: () => void;
  onOkClick:
    | ((props: CclOptions) => void)
    | ((props: ErosionDilationOptions) => void)
    | ((props: HoleFillingOptions) => void)
    | ((props: IntersliceInterpolationOptions) => void);
};
