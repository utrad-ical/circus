import { createIconComponent } from 'rb/Icon';

const Icon = createIconComponent({
  'glyphicon-': 'glyphicon glyphicon-',
  'circus-': 'circus-icon circus-icon-',
  'rs-': 'rs-icon-',
  default: 'glyphicon glyphicon-'
});

export default Icon;
