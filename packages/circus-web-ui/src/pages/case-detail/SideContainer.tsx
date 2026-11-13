import React, { useState, useCallback } from 'react';
import classNames from 'classnames';
import Icon from '#components/Icon.tsx';
import styles from './SideContainer.module.css';

const SideContainer: React.FC<{}> = React.memo(props => {
  const [open, setOpen] = useState(true);

  const handleToggle = useCallback(() => {
    setOpen(!open);
  }, [open]);

  return (
    <div className={classNames(styles.sideBar, { [styles.open]: open })}>
      <div className={styles.bar} onClick={handleToggle}>
        <Icon className={styles.triangle} icon="material-arrow_right" />
      </div>
      {open && <div className={styles.scrollable}>{props.children}</div>}
    </div>
  );
});

export default SideContainer;
