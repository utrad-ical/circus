import React from 'react';
import styled from 'styled-components';

const StyledDiv = styled.div`
  border: 2px solid transparent;
  &.active {
    border-color: orange;
  }
`;

/**
 * Simple div which accepts file drop.
 */
export class FileDroppable extends React.Component {
  constructor(props) {
    super(props);
    this.state = { active: false };
  }

  dragEnter = event => {
    event.preventDefault();
  };

  dragOver = event => {
    event.preventDefault(); // accepts file drop
    this.setState({ active: true });
  };

  drop = event => {
    this.setState({ active: false });
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (typeof this.props.onDropFile === 'function') {
      this.props.onDropFile(files);
    }
  };

  dragLeaveEnd = () => {
    this.setState({ active: false });
  };

  render() {
    return (
      <StyledDiv
        className={this.state.active ? ' active' : ''}
        onDragEnter={this.dragEnter}
        onDragOver={this.dragOver}
        onDrop={this.drop}
        onDragLeave={this.dragLeaveEnd}
        onDragEnd={this.dragLeaveEnd}
      >
        {this.props.children}
      </StyledDiv>
    );
  }
}
