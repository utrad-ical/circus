import classnames from 'classnames';
import React, { type FC, type ReactNode } from 'react';
import styles from './Panel.module.css';

type Props = { className?: string; children: ReactNode };

/**
 * A box with optional header, body, list and footer sections.
 */
const Panel: FC<Props & { variant?: 'primary' }> = props => {
  const { variant, className, children } = props;
  return (
    <section
      className={classnames(
        styles.panel,
        variant && styles[variant],
        className
      )}
    >
      {children}
    </section>
  );
};

export const PanelHeader: FC<Props> = props => {
  const { className, children } = props;
  return <div className={classnames(styles.header, className)}>{children}</div>;
};

export const PanelBody: FC<Props> = props => {
  const { className, children } = props;
  return <div className={classnames(styles.body, className)}>{children}</div>;
};

export const PanelFooter: FC<Props> = props => {
  const { className, children } = props;
  return <div className={classnames(styles.footer, className)}>{children}</div>;
};

export const PanelList: FC<Props> = props => {
  const { className, children } = props;
  return <ul className={classnames(styles.list, className)}>{children}</ul>;
};

export const PanelListItem: FC<
  Props & { variant?: 'info' | 'danger' }
> = props => {
  const { variant, className, children } = props;
  return (
    <li className={classnames(variant && styles[variant], className)}>
      {children}
    </li>
  );
};

export default Panel;
