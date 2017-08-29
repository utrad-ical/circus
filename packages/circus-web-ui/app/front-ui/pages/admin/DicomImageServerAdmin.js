import React from 'react';
import { Alert, Panel, ButtonToolbar, Glyphicon } from 'components/react-bootstrap';
import IconButton from 'rb/IconButton';
import LoadingIndicator from 'rb/LoadingIndicator';
import { api } from 'utils/api';
import axios from 'axios';
import { store } from 'store';

export default class DicomImageServerAdmin extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			isFetching: false,
			processStatus: <LoadingIndicator />,
			rsStatus: <LoadingIndicator />
		};
		this.sendStart = this.sendControl.bind(this, 'start');
		this.sendStop = this.sendControl.bind(this, 'stop');
		this.sendStatus = this.sendControl.bind(this, 'status');
	}

	async sendControl(command) {
		if (this.state.isFetching) return;
		const dicomImageServer = store.getState().loginUser.data.dicomImageServer;
		this.setState({ isFetching: true, noAuthorizationWarning: false });
		const data = await api('server/' + command, { method: 'post' });
		this.setState({ processStatus: data[0] });
		try {
			const status = (await axios.get(dicomImageServer + '/status')).data;
			this.setState({
				rsStatus: JSON.stringify(status, null, '    '),
				noAuthorizationWarning: status.authorization && status.authorization.enabled === false
			});
		} catch(err) {
			let message = 'The server did not respond. It may not be running.';
			if (typeof err.state === 'number') {
				message = `The server returned with ${err.state} error.`;
			}
			this.setState({ rsStatus: <em className='text-warning'>{message}</em> });
		}
		this.setState({ isFetching: false });
	}

	componentDidMount() {
		this.sendStatus();
	}

	render() {
		const { isFetching } = this.state;

		const header = <div>
			Control
			{ isFetching ? <span>&ensp;<LoadingIndicator /></span> : null }
		</div>;

		const LargeIconButton = props => {
			const { text, ...p } = props;
			return <IconButton {...p}
				bsSize='lg'
				disabled={isFetching}
			>{text}</IconButton>;
		};

		return <div>
			<h1><Glyphicon glyph='hdd' />&ensp;DICOM Image Server</h1>
			<Panel header={header}>
				<ButtonToolbar>
					<LargeIconButton
						bsStyle='success'
						icon='play'
						text='Start'
						onClick={this.sendStart}
					/>
					<LargeIconButton
						bsStyle='danger'
						icon='stop'
						text='Stop'
						onClick={this.sendStop}
					/>
					<LargeIconButton
						bsStyle='default'
						icon='refresh'
						text='Refresh'
						onClick={this.sendStatus}
					/>
				</ButtonToolbar>
			</Panel>
			<div className={'server-status' + (isFetching ? ' pending' : '')}>
				<p>Process Status:</p>
				<pre>{this.state.processStatus}</pre>
				<p>CIRCUS RS Status:</p>
				<pre>{this.state.rsStatus}</pre>
				{ this.state.noAuthorizationWarning &&
					<Alert bsStyle='danger'>
						<strong>RS Server running without authorization enabled!</strong>&ensp;
						This can be a security risk. Use this only for debugging purposes.
					</Alert>
				}
			</div>
		</div>;
	}
}
