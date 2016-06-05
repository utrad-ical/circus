import React from 'react';
import { dismissMessage } from 'actions';
import { connect } from 'react-redux';
import { Alert } from 'components/react-bootstrap';

class MessageBoxView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			messages: []
		};
	}

	render() {
		return <div className="message-boxes">
			{this.props.messages.map(m => {
				const style = m.style ? m.style : 'success';
				return <Alert key={m.id}
					bsStyle={style}
					onDismiss={() => dismissMessage(m.id)}
				>
					{m.message}
				</Alert>;
			})}
		</div>
	}
}

export const MessageBox = connect(
	state => ({ messages: state.messages })
)(MessageBoxView);
