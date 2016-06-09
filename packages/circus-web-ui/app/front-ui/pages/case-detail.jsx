import React from 'react';

export class CaseDetail extends React.Component {
	constructor(props) {
		super(props);
	}

	async componentDidMount() {
		const caseID = this.props.params.id;
		const caseData = await api('case/' + caseID);
		this.setState({ caseData });
	}

	render() {
		const uid = this.props.params.uid;
		return <div>
			<h1>
				<span className="circus-icon-case" />
				Case
			</h1>
			<p>Series: {uid}</p>
		</div>;
	}
}
