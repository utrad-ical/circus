// Utility modal dialogs.
// These can be used similary to standard dialogs like alert() and prompt(),
// but are non-blocking and have Promise support.

import React from 'react';
import ReactDOM from 'react-dom';

import { Modal, FormControl, Button, Glyphicon } from './react-bootstrap';

export const modal = (DialogClass, props) => {
	return new Promise((resolve, reject) => {
		let response = undefined;
		let container = document.createElement('div');
		document.body.appendChild(container);

		const exit = () => {
			setImmediate(() => {
				ReactDOM.unmountComponentAtNode(container);
				document.body.removeChild(container);
			});
			resolve(response);
		};

		const respond = res => {
			response = res;
		};

		ReactDOM.render(
			<DialogClass {...props} onExit={exit} onRespond={respond} />,
			container
		);
	});
};

export class DialogBase extends React.Component {
	constructor(props) {
		super(props);
		this.state = { show: true };
	}

	respond(response) {
		this.setState({ show: false });
		this.props.onRespond(response);
	}
}

/* Alert */

export const alert = (text, { title = 'Message', icon = 'info-sign' } = {}) => {
	const buttons = { OK: { response: true, style: 'primary' } };
	return modal(ChoiceDialog, { text, title, icon, buttons, closeButton: true });
};

/**
 * Opens a confirmation dialog.
 */
export const confirm = (text, { title = 'Confirm', icon = 'info-sign' } = {}) => {
	const buttons = {
		OK: { response: true, style: 'primary' },
		Cancel: { response: false, style: 'link' }
	};
	return modal(ChoiceDialog, { text, title, icon, buttons });
};

/*
 * Opens a dialog with arbitrary buttons.
 * choices: can be in one of the following forms:
 *  - ['Green', 'Black' ]
 *  - { Green: 'gr', Black: 'bl' }
 *  - { Green: { response: 'gr', style: 'primary' }, Black: { response: 'bl', style: 'warning' }}
 */
export const choice = (text, choices, { title = 'Choose', icon = 'info-sign' } = {}) => {
	if (Array.isArray(choices)) {
		let obj = {};
		choices.forEach(choice => obj[choice] = choice);
		choices = obj;
	}
	Object.keys(choices).forEach(key => {
		if (typeof choices[key] !== 'object')
			choices[key] = { response: choices[key], style: 'default' }
	});
	return modal(ChoiceDialog, { text, title, icon, buttons: choices });
}

class ChoiceDialog extends DialogBase {
	render() {
		const glyph = this.props.icon ? <span><Glyphicon glyph={this.props.icon} />&ensp;</span> : '';
		return <Modal show={this.state.show} onExit={this.props.onExit}>
			<Modal.Header>{glyph}{this.props.title}</Modal.Header>
			<Modal.Body>{this.props.text}</Modal.Body>
			<Modal.Footer>
				{Object.keys(this.props.buttons).map(key => {
					let b = this.props.buttons[key];
					return <Button bsStyle={b.style} onClick={() => this.respond(b.response)}>
						{key}
					</Button>;
				})}
			</Modal.Footer>
		</Modal>;
	}
}

/* Prompt */

export const prompt = (text, value, { title = 'Input', icon = 'info-sign' } = {}) => {
	return modal(PromptDialog, { text, value, title, icon });
};

class PromptDialog extends DialogBase {
	constructor(props) {
		super(props);
		this.state.value = props.value;
	}

	change(event) {
		this.setState({ value: event.target.value });
	}

	render() {
		const glyph = this.props.icon ? <span><Glyphicon glyph={this.props.icon} />&ensp;</span> : '';
		return <Modal show={this.state.show} onExit={this.props.onExit}>
			<Modal.Header>{glyph}{this.props.title}</Modal.Header>
			<Modal.Body>
				<div>{this.props.text}</div>
				<FormControl autoFocus value={this.state.value} onChange={ev => this.change(ev)} />
			</Modal.Body>
			<Modal.Footer>
				<Button bsStyle="primary" onClick={() => this.respond(this.state.value)}>OK</Button>
				<Button bsStyle="link" onClick={() => this.respond(null)}>Cancel</Button>
			</Modal.Footer>
		</Modal>;
	}
}
