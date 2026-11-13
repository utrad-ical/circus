import Button from '#components/Button.tsx';
import Icon from '#components/Icon.tsx';
import React from 'react';
import { Link } from 'react-router-dom';
import type { MyList } from '#store/loginUser.ts';
import styles from './MyListArray.module.css';

const MyListArray: React.FC<{
  value: MyList[];
  toUrl: (myListId: string) => string;
  onRenameClick: (myListId: string) => void;
  onDeleteClick: (myListId: string) => void;
}> = props => {
  const { value, toUrl, onRenameClick, onDeleteClick } = props;

  return (
    <ul className={styles.root}>
      {value.map(list => (
        <li key={list.myListId}>
          <Link to={toUrl(list.myListId)}>
            <Icon size="xxl" icon="material-folder_open" />
            <span className={styles.name}>{list.name}</span>
            <div className={styles.menu}>
              <Button
                size="xsmall"
                variant="primary"
                onClick={ev => {
                  ev.preventDefault();
                  onRenameClick(list.myListId);
                }}
              >
                Rename
              </Button>
              &ensp;
              <Button
                size="xsmall"
                variant="danger"
                onClick={ev => {
                  ev.preventDefault();
                  onDeleteClick(list.myListId);
                }}
              >
                Delete
              </Button>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default MyListArray;
