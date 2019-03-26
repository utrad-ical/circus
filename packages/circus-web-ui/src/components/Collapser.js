import React from 'react';
import classnames from 'classnames';
import { Glyphicon } from 'components/react-bootstrap';
import styled from 'styled-components';

const StyledDiv = styled.div`
  .collapser-header {
    display: block;
    text-decoration: none;
    user-select: none;
    color: white;
    padding: 2px 5px;
    background-color: ${props => props.theme.brandPrimary};
    font-weight: bold;
    cursor: pointer;
    &:hover {
      background-color: ${props => props.theme.brandDark};
    }
    .triangle {
      transition: transform 0.1s linear;
    }
  }

  .collapser-body {
    padding: 15px;
    .property-editor {
      margin: 0 15px;
    }
  }

  &.open {
    .triangle {
      transform: rotate(90deg);
    }
  }

  &.framed {
    border: 1px solid ${props => props.theme.brandDark};
  }

  &.no-padding {
    .collapser-body {
      padding: 0;
    }
  }
`;

export const ControlledCollapser = props => {
  const {
    open,
    onToggleClick,
    title,
    children,
    className,
    framed,
    noPadding
  } = props;
  return (
    <StyledDiv
      className={classnames(
        'collapser',
        { framed, noPadding, open },
        className
      )}
    >
      <a className="collapser-header" onClick={onToggleClick}>
        {title}
        &ensp;
        <Glyphicon className="triangle" glyph="triangle-right" />
      </a>
      {open && <div className="collapser-body">{children}</div>}
    </StyledDiv>
  );
};

export default class Collapser extends React.Component {
  constructor(props) {
    super(props);
    this.state = { open: !!props.defaultOpen };
  }

  handleToggleClick = () => {
    this.setState({ open: !this.state.open });
  };

  render() {
    const { open } = this.state;
    return (
      <ControlledCollapser
        open={open}
        onToggleClick={this.handleToggleClick}
        {...this.props}
      />
    );
  }
}

Collapser.defaultProps = { defaultOpen: true };
