import React from 'react';
import { dismissMessage } from 'store/messages';
import { Alert } from 'components/react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';

const MessageBox: React.FC<{}> = React.memo(props => {
  const messages = useSelector(state => state.messages);
  const dispatch = useDispatch();

  if (!messages.length) return null;
  return (
    <div className="message-boxes">
      {messages.map(m => {
        const style = m.style ? m.style : 'success';
        return (
          <Alert
            key={m.id}
            bsStyle={style}
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
