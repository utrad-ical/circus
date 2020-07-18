import { CircusIconDefinition } from 'components/BodyPartIcon';

interface Plugin {
  pluginId: string;
  pluginName: string;
  version: string;
  type: string;
  description: string;
  runConfiguration: {
    timeout?: number;
    gpus?: string;
  };
  icon: CircusIconDefinition;
  displayStrategy: any[];
}

export default Plugin;
