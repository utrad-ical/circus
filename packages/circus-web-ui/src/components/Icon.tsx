import classnames from 'classnames';
import React, { createElement, type FC } from 'react';
import styles from './Icon.module.css';
import icons from './icons.ts';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/**
 * Renders an SVG icon by name (`material-*` or `circus-*`).
 * Unknown names render nothing.
 */
const Icon: FC<{
  icon: string;
  size?: IconSize;
  className?: string;
}> = ({ icon, size = 'md', className }) => {
  const data = icons[icon];
  if (!data) return null;
  return (
    <svg
      viewBox={data.viewBox}
      aria-hidden
      focusable="false"
      data-icon
      className={classnames(
        styles.icon,
        size !== 'md' && styles[size],
        // Some styles still select CIRCUS icons by this class
        icon.startsWith('circus-') && 'circus-icon',
        className
      )}
    >
      {data.shapes.map(([tag, attributes], i) =>
        createElement(tag, { key: i, ...attributes })
      )}
    </svg>
  );
};

export default Icon;
