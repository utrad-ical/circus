import React from 'react';
import { dismissMessage } from 'actions';
import { Alert } from 'components/react-bootstrap';
import { useSelector } from 'react-redux';

const MessageBox: React.FC<{}> = props => {
  const messages = useSelector(state => state.messages);

  if (!messages.length) return null;
  return (
    <div className="message-boxes">
      {messages.map(m => {
        const style = m.style ? m.style : 'success';
        return (
          <Alert
            key={m.id}
            bsStyle={style}
            onDismiss={() => dismissMessage(m.id)}
          >
            {m.message}
          </Alert>
        );
      })}
    </div>
  );
};

export default MessageBox;
