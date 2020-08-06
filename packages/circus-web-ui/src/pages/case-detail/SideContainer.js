import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import { Glyphicon } from 'components/react-bootstrap';

const StyledSideBar = styled.div`
  overflow: hidden;
  height: 100%;
  flex: 0 0 30px;
  display: flex;
  flex-direction: column;
  .bar {
    text-align: right;
  }
  &.open {
    overflow-x: hidden;
    overflow-y: auto;
    flex: 1 1 auto;
    > .bar > .triangle {
      transform: rotate(180deg);
    }
  }
`;

export default class SideContainer extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { open: true };
  }

  handleToggle = () => {
    this.setState({ open: !this.state.open });
  };

  render() {
    const { open } = this.state;
    return (
      <StyledSideBar className={classNames({ open })}>
        <div className="bar" onClick={this.handleToggle}>
          <Glyphicon className="triangle" glyph="triangle-right" />
        </div>
        {open && this.props.children}
      </StyledSideBar>
    );
  }
}
