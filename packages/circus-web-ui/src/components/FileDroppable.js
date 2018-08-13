import React from 'react';

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
      <div
        className={'file-droppable' + (this.state.active ? ' active' : '')}
        onDragEnter={this.dragEnter}
        onDragOver={this.dragOver}
        onDrop={this.drop}
        onDragLeave={this.dragLeaveEnd}
        onDragEnd={this.dragLeaveEnd}
      >
        {this.props.children}
      </div>
    );
  }
}
