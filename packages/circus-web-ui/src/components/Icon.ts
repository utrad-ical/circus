import React from 'react';
import { createIconComponent } from '@smikitky/rb-components/lib/Icon';

const Icon: React.FC<any> = createIconComponent({
  'glyphicon-': 'glyphicon glyphicon-',
  'circus-': 'circus-icon circus-icon-',
  'rs-': 'rs-icon-',
  default: 'glyphicon glyphicon-'
});

export default Icon;
