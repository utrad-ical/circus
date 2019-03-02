import React, { useState } from 'react';
import { useApiManager } from 'utils/api';
import {
  Row,
  Col,
  Panel,
  FormControl,
  FormGroup,
  Button,
  Glyphicon
} from 'components/react-bootstrap';
import { connect } from 'react-redux';
import styled from 'styled-components';
import browserHistory from 'browserHistory';

const StyledDiv = styled.div`
  .login-panel {
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
  }
`;

const LoginScreenView = props => {
  const [input, setInput] = useState({ id: '', password: '' });
  const [error, setError] = useState();
  const apiManager = useApiManager();

  const change = (key, val) => {
    setInput({ ...input, [key]: val });
  };

  const loginClick = async () => {
    try {
      await apiManager.tryAuthenticate(input.id, input.password);
      await apiManager.refreshUserInfo(true);
      browserHistory.push('/home');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError('Invalid user ID or password.');
      } else {
        setError('Critical server error. Plese consult the administrator.');
        console.error(err);
      }
    }
  };

  const disabled = input.id.length === 0 || input.password.length === 0;

  return (
    <StyledDiv>
      <Row className={'login-panel' + (error ? ' has-error' : '')}>
        <Col sm={6} smOffset={3}>
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
                  value={input.id}
                  onChange={ev => change('id', ev.target.value)}
                />
                <FormControl
                  placeholder="Password"
                  type="password"
                  value={input.password}
                  onChange={ev => change('password', ev.target.value)}
                  onKeyDown={ev => ev.keyCode == 13 && loginClick()}
                />
              </FormGroup>
              {error && <p className="text-danger">{error}</p>}
            </Panel.Body>
            <Panel.Footer className="text-center">
              <Button
                disabled={disabled}
                bsStyle="primary"
                bsSize="lg"
                onClick={() => loginClick()}
              >
                <Glyphicon glyph="ok-sign" />&ensp;Login
              </Button>
            </Panel.Footer>
          </Panel>
        </Col>
      </Row>
    </StyledDiv>
  );
};

const LoginScreen = connect()(LoginScreenView);

export default LoginScreen;
