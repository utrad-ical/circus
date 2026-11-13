import classnames from 'classnames';
import React, {
  createContext,
  type FC,
  type ReactNode,
  useContext
} from 'react';
import styles from './Panel.module.css';

type Props = { className?: string; children: ReactNode };

const CollapsibleContext = createContext(false);

/**
 * A box with optional header, body, list and footer sections.
 * A collapsible panel is toggled by clicking its header.
 */
const Panel: FC<
  Props & {
    variant?: 'primary';
    collapsible?: boolean;
    defaultExpanded?: boolean;
  }
> = props => {
  const { variant, collapsible, defaultExpanded, className, children } = props;
  const classNames = classnames(
    styles.panel,
    variant && styles[variant],
    className
  );
  if (!collapsible) return <section className={classNames}>{children}</section>;
  return (
    <details className={classNames} open={defaultExpanded}>
      <CollapsibleContext.Provider value={true}>
        {children}
      </CollapsibleContext.Provider>
    </details>
  );
};

export const PanelHeader: FC<Props> = props => {
  const { className, children } = props;
  const Tag = useContext(CollapsibleContext) ? 'summary' : 'div';
  return <Tag className={classnames(styles.header, className)}>{children}</Tag>;
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
