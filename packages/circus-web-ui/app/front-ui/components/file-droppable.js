import React from 'react';

/**
 * Simple div which accepts file drop.
 */
export class FileDroppable extends React.Component {
	constructor(props) {
		super(props);
		this.state = { active: false };
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
	};

	dragLeaveEnd(event) {
		this.setState({ active: false });
	}

	render() {
		return (
			<div className={'file-droppable' + (this.state.active ? ' active' : '')}
				onDragEnter={this.dragEnter.bind(this)}
				onDragOver={this.dragOver.bind(this)}
				onDrop={this.drop.bind(this)}
				onDragLeave={this.dragLeaveEnd.bind(this)}
				onDragEnd={this.dragLeaveEnd.bind(this)}
			>
				{this.props.children}
			</div>
		);
	}
}