import React from 'react';
import { dismissMessage } from 'actions';
import { Alert } from 'components/react-bootstrap';
import { useSelector } from 'react-redux';

const mapState = state => state.messages;

const MessageBox = props => {
  const messages = useSelector(mapState);

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
