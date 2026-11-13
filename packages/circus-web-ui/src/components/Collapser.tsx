import React, { useState } from 'react';
import classnames from 'classnames';
import Icon from '#components/Icon.tsx';
import styles from './Collapser.module.css';

interface Props {
  onToggleClick?: () => void;
  title: React.ReactNode;
  className?: string;
  framed?: boolean;
  noPadding?: boolean;
}

export const ControlledCollapser: React.FC<
  Props & {
    open?: boolean;
  }
> = props => {
  const { open, onToggleClick, title, children, className, framed, noPadding } =
    props;
  return (
    <div
      className={classnames(
        styles.collapser,
        {
          [styles.framed]: framed,
          [styles.noPadding]: noPadding,
          [styles.open]: open
        },
        className
      )}
    >
      <a className={styles.header} onClick={onToggleClick}>
        {title}
        &ensp;
        <Icon className={styles.triangle} icon="material-arrow_right" />
      </a>
      {open && <div className={styles.body}>{children}</div>}
    </div>
  );
};

const Collapser: React.FC<
  Props & {
    defaultOpen?: boolean;
  }
> = props => {
  const { defaultOpen = true, onToggleClick, ...rest } = props;
  const [open, setOpen] = useState(!!defaultOpen);

  const handleToggleClick = () => {
    setOpen(open => !open);
    onToggleClick && onToggleClick();
  };

  return (
    <ControlledCollapser
      open={open}
      onToggleClick={handleToggleClick}
      {...rest}
    />
  );
};

export default Collapser;
