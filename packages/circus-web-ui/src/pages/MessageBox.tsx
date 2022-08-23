import React from 'react';
import { dismissMessage } from 'store/messages';
import { Alert } from 'components/react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';

const MessageBox: React.FC<{}> = React.memo(props => {
  const messages = useSelector(state => state.messages);
  const dispatch = useDispatch();

  if (!messages.length) return null;
  return (
    <StyledDiv>
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
    </StyledDiv>
  );
});

const StyledDiv = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 90%;
  max-width: 400px;
  gap: 10px;
  top: 50px;
  right: 25px;
  z-index: 2000;
`;

export default MessageBox;
