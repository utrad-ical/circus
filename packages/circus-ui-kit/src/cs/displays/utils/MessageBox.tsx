import React, { type CSSProperties, type FC, type ReactNode } from 'react';

const colors = { danger: 'var(--danger, #c00)', info: 'var(--theme, #037d70)' };

/**
 * A message box of the built-in displays, colored with the host's tokens.
 */
export const MessageBox: FC<{
  variant: 'danger' | 'info';
  preformatted?: boolean;
  children: ReactNode;
}> = props => {
  const { variant, preformatted, children } = props;
  const color = colors[variant];
  const style: CSSProperties = {
    margin: '0 0 2px',
    padding: '10px 15px',
    border: `1px solid color-mix(in oklch, ${color} 40%, var(--bg, white))`,
    backgroundColor: `color-mix(in oklch, ${color} 15%, var(--bg, white))`,
    color: 'var(--text, black)',
    font: 'inherit',
    whiteSpace: preformatted ? 'pre-wrap' : undefined
  };
  return (
    <div role="alert" style={style}>
      {children}
    </div>
  );
};
