import classnames from 'classnames';
import React from 'react';
import styles from './Section.module.css';

const Section: React.FC<{
  title: string | React.ReactElement<any>;
}> = props => {
  const { title, children } = props;
  return (
    <section className={styles.root}>
      <div className={classnames('section-header', styles.header)}>{title}</div>
      <div className={classnames('section-content', styles.content)}>
        {children}
      </div>
    </section>
  );
};

export default Section;
