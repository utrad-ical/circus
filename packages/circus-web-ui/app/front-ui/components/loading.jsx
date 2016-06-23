import React from 'react';

/**
 * Spinning loading indicator.
 * Using the 'delay' option, the actual indicator will be displayed shortly
 * after the componend is mounted.
 */
export class Loading extends React.Component {
	constructor(props) {
		super(props);
		this.state = { showing: false, timerID: null };
	}

	componentDidMount() {
		const { delay = 500 } = this.props;
		if (delay > 0) {
			const timerID = setTimeout(() => {
				this.setState({ showing: true, timerID: null });
			}, delay);
			this.setState({ timerID });
		} else {
			this.setState({ showing: true });
		}
	}

	componentWillUnmount() {
		if (this.state.timerID) clearTimeout(this.state.timerID);
	}

	render() {
		if (!this.state.showing) return null;
		return (
			<span className="glyphicon glyphicon-refresh loading" />
		);
	}
}
