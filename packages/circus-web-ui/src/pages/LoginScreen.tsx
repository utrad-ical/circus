import u from '#components/utilities.module.css';
import Panel, { PanelBody, PanelFooter } from '#components/Panel.tsx';
import Button from '#components/Button.tsx';
import LoadingIndicator from '#components/LoadingIndicator.tsx';
import Icon from '#components/Icon.tsx';
import Input from '#components/Input.tsx';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLoginManager } from '#utils/loginManager.ts';
import useLoginUser from '#utils/useLoginUser.ts';

const StyledDiv = styled.div`
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  .login-panel {
    box-shadow: 3px 3px 30px silver;
  }
  margin-top: 3em;
  h1 {
    text-shadow: 2px 2px 3px silver;
    font-size: 36px;
    border: none;
  }
  .login-input {
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
    <StyledDiv>
      {criticalError && (
        <div className="critical">
          <Icon icon="material-block" />
          &nbsp; The CIRCUS API server does not seem to be responding. Please
          consult the administrator.
        </div>
      )}
      <Panel variant="primary" className="login-panel">
        <PanelBody>
          <h1 className={u.textCenter}>
            <Icon icon="circus-logo" />
            <span hidden>CIRCUS DB</span>
          </h1>
          <div>
            <Input
              className="login-input"
              placeholder="User ID or E-mail"
              autoFocus
              value={input.id}
              onChange={ev => handleChange('id', ev.target.value)}
            />
            <Input
              className="login-input"
              placeholder="Password"
              type="password"
              value={input.password}
              onChange={ev => handleChange('password', ev.target.value)}
              onKeyDown={ev => ev.key === 'Enter' && handleLoginClick()}
            />
          </div>
          {error && <p className={u.danger}>{error}</p>}
        </PanelBody>
        <PanelFooter className={u.textCenter}>
          <Button
            disabled={disabled}
            variant="primary"
            size="large"
            onClick={handleLoginClick}
            icon="material-check_circle"
          >
            Login
          </Button>
        </PanelFooter>
      </Panel>
    </StyledDiv>
  );
};

export default LoginScreen;
