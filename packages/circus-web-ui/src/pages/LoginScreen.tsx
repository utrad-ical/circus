import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import classnames from 'classnames';
import Icon from '#components/Icon.tsx';
import {
  Button,
  FormControl,
  FormGroup,
  Panel
} from '#components/react-bootstrap.ts';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLoginManager } from '#utils/loginManager.ts';
import useLoginUser from '#utils/useLoginUser.ts';

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
  .critical {
    background-color: red;
    color: white;
    margin-bottom: 10px;
    padding: 15px;
    border-radius: 7px;
  }
`;

const LoginScreen: React.FC<{}> = props => {
  const [serverAlive, setServerAlive] = useState<boolean | undefined>();
  const [input, setInput] = useState({ id: '', password: '' });
  const [error, setError] = useState<string>();
  const [loginSucceeded, setLoginSucceeded] = useState(false);
  const [criticalError, setCriticalError] = useState(false);
  const loginManager = useLoginManager();
  const user = useLoginUser();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const alive = await loginManager.checkServerIsLive();
      setServerAlive(alive);
      if (!alive) setCriticalError(true);
    })();
  }, [loginManager]);

  useEffect(() => {
    if (loginSucceeded) {
      navigate('/home');
    }
  }, [loginSucceeded, navigate]);

  // Set while logging in on this page, during which the user is loaded
  const loggingIn = useRef(false);

  // Force logout when user shows this page
  useEffect(() => {
    if (user && !loginSucceeded && !loggingIn.current) {
      const logout = async () => {
        await loginManager.logout();
      };
      logout();
    }
  }, [loginManager, loginSucceeded, user]);

  const handleChange = (key: string, val: string) => {
    setInput({ ...input, [key]: val });
  };

  const handleLoginClick = async () => {
    try {
      loggingIn.current = true;
      await loginManager.tryAuthenticate(input.id, input.password);
      setLoginSucceeded(true);
    } catch (err: any) {
      loggingIn.current = false;
      if (err.response && err.response.status === 401) {
        setError('Invalid user ID or password.');
      } else {
        setCriticalError(true);
        console.error(err);
      }
    }
  };

  const disabled = input.id.length === 0 || input.password.length === 0;

  if (serverAlive === undefined) return <LoadingIndicator delay={1000} />;

  return (
    <StyledDiv className={classnames({ 'has-error': error || criticalError })}>
      {criticalError && (
        <div className="critical">
          <Icon icon="material-block" />
          &nbsp; The CIRCUS API server does not seem to be responding. Please
          consult the administrator.
        </div>
      )}
      <Panel bsStyle="primary">
        <Panel.Body>
          <h1 className="text-center">
            <Icon icon="circus-logo" />
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
              onKeyDown={ev => ev.key === 'Enter' && handleLoginClick()}
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
            <Icon icon="material-check_circle" />
            &ensp;Login
          </Button>
        </Panel.Footer>
      </Panel>
    </StyledDiv>
  );
};

export default LoginScreen;
