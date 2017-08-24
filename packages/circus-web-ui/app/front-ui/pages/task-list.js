import React from 'react';
import { Button } from 'components/react-bootstrap';
import { api} from 'utils/api';

export class TaskList extends React.Component {
	constructor(props) {
		super(props);
		this.state = { downloadList: null };
	}

	async refresh() {
		const items = await api('task/downloadable');
		this.setState({ downloadList: items });
	}

	componentDidMount() {
		this.refresh();
	}

	render() {
		if (!Array.isArray(this.state.downloadList)) {
			return <div />;
		}
		return <div>
			<h1>Tasks</h1>
			<TaskItems items={this.state.downloadList} />
		</div>;
	}
}

const TaskItems = props => {
	const table = <table className='table'>
		<thead>
			<tr>
				<th>Task ID</th>
				<th>Status</th>
				<th>Public</th>
				<th>Date</th>
				<th>Download</th>
			</tr>
		</thead>
		<tbody>
			{props.items.map(item => (
				<tr>
					<td>{item.taskID}</td>
					<td>{item.status}</td>
					<td>{item.publicDownload ? 'Yes' : '-'}</td>
					<td>{item.updateTime}</td>
					<td>
						<a href={'download/' + item.taskID}>
							<Button>Download</Button>
						</a>
					</td>
				</tr>
			))}
		</tbody>
	</table>;

	const count = props.items.length;
	const countStr = count === 1 ? `${count} result.` : `${count} results.`;

	return <div>
		<p>{countStr}</p>
		{table}
	</div>;
};
