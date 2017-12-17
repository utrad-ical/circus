import React from 'react';
import { OverlayTrigger, Button, FormControl, Popover } from './react-bootstrap';

export class StringListEditor extends React.Component {

	constructor(props) {
		super(props);
		const value = this.props.value || [];
		this.state = { text: value.join('\n') };
	}

	change(text) {
		this.setState({ text });
	}

	commit() {
		const strings = this.state.text
			.split('\n').map(s => s.trim()).filter(t => t.length > 0);
		this.props.onChange && this.props.onChange(strings);
	}

	render() {
		const message = this.props.message ? this.props.message : 'Input string list';
		const overlay = <Popover className='string-list-editor-popover'
			id='string-list-editor-popover'
		>
			<div>{message}</div>
			<FormControl componentClass='textarea' value={this.state.text}
				onChange={ev => this.change(ev.target.value)}
			/>
		</Popover>;

		let caption = (this.props.value || []).join(', ');
		if (caption === '') caption = '(None)';

		return <OverlayTrigger overlay={overlay} trigger='click' placement='bottom' rootClose
			onExited={this.commit.bind(this)}
		>
			<Button>{caption}</Button>
		</OverlayTrigger>;
	}

}
