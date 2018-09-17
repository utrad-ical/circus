import React from 'react';
import { login } from 'actions';
import {
  Row,
  Col,
  Panel,
  FormControl,
  FormGroup,
  Button,
  Glyphicon
} from 'components/react-bootstrap';
import styled from 'styled-components';

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

export default class LoginScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = { id: '', password: '' };
  }

  change(key, val) {
    this.setState({ [key]: val });
  }

  async loginClick() {
    try {
      await login(this.state.id, this.state.password);
    } catch (err) {
      if (err.status === 401) {
        this.setState({ error: err.data.errors });
      } else {
        this.setState({
          error: 'Critical server error. Plese consult the administrator.'
        });
      }
    }
  }

  render() {
    const disabled =
      this.state.id.length === 0 || this.state.password.length === 0;

    return (
      <StyledDiv>
        <Row className={'login-panel' + (this.state.error ? ' has-error' : '')}>
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
                    value={this.state.id}
                    onChange={ev => this.change('id', ev.target.value)}
                  />
                  <FormControl
                    placeholder="Password"
                    type="password"
                    value={this.state.password}
                    onChange={ev => this.change('password', ev.target.value)}
                    onKeyDown={ev => ev.keyCode == 13 && this.loginClick()}
                  />
                </FormGroup>
                {this.state.error ? (
                  <p className="text-danger">{this.state.error}</p>
                ) : null}
              </Panel.Body>
              <Panel.Footer className="text-center">
                <Button
                  disabled={disabled}
                  bsStyle="primary"
                  bsSize="lg"
                  onClick={() => this.loginClick()}
                >
                  <Glyphicon glyph="ok-sign" />&ensp;Login
                </Button>
              </Panel.Footer>
            </Panel>
          </Col>
        </Row>
      </StyledDiv>
    );
  }
}
