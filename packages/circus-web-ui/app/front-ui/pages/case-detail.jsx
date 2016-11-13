import React from 'react';
import { api } from '../utils/api';

export class CaseDetail extends React.Component {
	constructor(props) {
		super(props);
		this.state = { caseData: null };
	}

	async componentDidMount() {
		const caseID = this.props.params.cid;
		const caseData = await api('case/' + caseID);
		this.setState({ caseData });
	}

	render() {
		const cid = this.props.params.cid;
		return <div>
			<h1>
				<span className="circus-icon-case" />
				Case Detail: {cid}
			</h1>
			<pre>{JSON.stringify(this.state.caseData, null, 2)}</pre>
		</div>;
	}
}
