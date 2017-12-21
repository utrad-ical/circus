import React from 'react';

/**
 * Simple div which accepts file drop.
 */
export class FileDroppable extends React.Component {
  constructor(props) {
    super(props);
    this.state = { active: false };
    this.dragEnter = this.dragEnter.bind(this);
    this.dragOver = this.dragOver.bind(this);
    this.drop = this.drop.bind(this);
    this.dragLeaveEnd = this.dragLeaveEnd.bind(this);
  }

  dragEnter(event) {
    event.preventDefault();
  }

  dragOver(event) {
    event.preventDefault(); // accepts file drop
    this.setState({ active: true });
  }

  drop(event) {
    this.setState({ active: false });
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (typeof this.props.onDropFile === 'function') {
      this.props.onDropFile(files);
    }
  }

  dragLeaveEnd() {
    this.setState({ active: false });
  }

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
