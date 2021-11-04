import React, { useState } from 'react';
import { useLoginManager } from 'utils/loginManager';
import {
  Panel,
  FormControl,
  FormGroup,
  Button,
  Glyphicon
} from 'components/react-bootstrap';
import styled from 'styled-components';
import browserHistory from '../browserHistory';
import classnames from 'classnames';

const StyledDiv = styled.div`
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  .panel {
    box-shadow: 3px 3px 30px silver;
  }
  margin-top: 3em;
  h1 {
    text-shadow: 2px 2px 3px silver;
    font-size: 36px;
    border: none;
  }
  input.form-control {
    margin: 1em 0;
    background-color: #d0e6e4;
    border-radius: 7px;
  }
`;

const LoginScreen: React.FC<{}> = props => {
  const [input, setInput] = useState({ id: '', password: '' });
  const [error, setError] = useState<string>();
  const loginManager = useLoginManager();

  const handleChange = (key: string, val: string) => {
    setInput({ ...input, [key]: val });
  };

  const handleLoginClick = async () => {
    try {
      await loginManager.tryAuthenticate(input.id, input.password);
      await loginManager.refreshUserInfo(true);
      browserHistory.push('/home');
    } catch (err: any) {
      if (err.response && err.response.status === 400) {
        setError('Invalid user ID or password.');
      } else {
        setError(
          'Critical server error. The CIRCUS API server is not responding. Please consult the administrator.'
        );
        console.error(err);
      }
    }
  };

  const disabled = input.id.length === 0 || input.password.length === 0;

  return (
    <StyledDiv className={classnames({ 'has-error': error })}>
      <Panel bsStyle="primary">
        <Panel.Body>
          <h1 className="text-center">
            <span className="circus-icon-logo" />
            <span hidden>CIRCUS DB</span>
          </h1>
          <FormGroup>
            <FormControl
              placeholder="User ID or E-mail"
              autoFocus
              type="text"
              value={input.id}
              onChange={(ev: React.BaseSyntheticEvent) =>
                handleChange('id', ev.target.value)
              }
            />
            <FormControl
              placeholder="Password"
              type="password"
              value={input.password}
              onChange={(ev: React.BaseSyntheticEvent) =>
                handleChange('password', ev.target.value)
              }
              onKeyDown={ev => ev.keyCode == 13 && handleLoginClick()}
            />
          </FormGroup>
          {error && <p className="text-danger">{error}</p>}
        </Panel.Body>
        <Panel.Footer className="text-center">
          <Button
            disabled={disabled}
            bsStyle="primary"
            bsSize="lg"
            onClick={handleLoginClick}
          >
            <Glyphicon glyph="ok-sign" />
            &ensp;Login
          </Button>
        </Panel.Footer>
      </Panel>
    </StyledDiv>
  );
};

export default LoginScreen;
