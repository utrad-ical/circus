import React from 'react';
import { dismissMessage } from '#store/messages.ts';
import Alert, { type AlertVariant } from '#components/Alert.tsx';
import { useSelector, useDispatch } from 'react-redux';
import styles from './MessageBox.module.css';

const MessageBox: React.FC<{}> = React.memo(props => {
  const messages = useSelector(state => state.messages);
  const dispatch = useDispatch();

  if (!messages.length) return null;
  return (
    <div className={styles.root}>
      {messages.map(m => {
        return (
          <Alert
            key={m.id}
            variant={(m.style || 'success') as AlertVariant}
            onDismiss={() => dispatch(dismissMessage({ id: m.id }))}
          >
            {m.message}
          </Alert>
        );
      })}
    </div>
  );
});

export default MessageBox;
