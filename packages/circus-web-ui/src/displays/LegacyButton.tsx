import classNames from 'classnames';
import React, { forwardRef } from 'react';
import buttonIcons from './buttonIcons.ts';
import styles from './LegacyButton.module.css';

type Size = 'sm' | 'lg' | 'xs';

/**
 * The `Button` that ui-kit used to export, kept only for compatibility
 * with v1 plug-ins, which import it from `@utrad-ical/circus-ui-kit`.
 * Do not use it in Web UI; use `components/Button.tsx` instead.
 */
export const Button: React.FC<{
  color?: string;
  icon?: string;
  size?: Size;
  className?: string;
  selected?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler;
}> = forwardRef((props, ref) => {
  const {
    color,
    icon,
    size,
    className,
    selected,
    disabled,
    style,
    onClick,
    children
  } = props;

  const iconSvg = icon ? buttonIcons[icon] : undefined;
  const buttonStyle = color
    ? ({ ...style, '--button-color': color } as React.CSSProperties)
    : style;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      onClick={onClick}
      disabled={disabled}
      style={buttonStyle}
      className={classNames(styles.button, size && styles[size], className, {
        selected
      })}
    >
      {iconSvg && (
        <span
          className={styles.icon}
          dangerouslySetInnerHTML={{ __html: iconSvg }}
        />
      )}
      {children}
    </button>
  );
});
