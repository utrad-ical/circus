import React from 'react';
import { Button, Glyphicon, Panel } from '../react-bootstrap';
import { PropertyEditor } from '../property-editor.jsx';
import { api } from '../../utils/api.js';

export class EditorPage extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			items: [],
			target: null,
			editing: null
		};
	}

	async commitItem(item) {
		let endPoint = this.endPoint;
		if (this.state.target) endPoint += '/' + this.state.target;
		const args = {
			method: 'put',
			data: item
		}
		try {
			await api(endPoint, args);
			console.log('saved!');
		} catch (err) {
			// error400: function (res) {
			// 	if ($.isPlainObject(res.responseJSON)) {
			// 		editor.propertyeditor('complain', res.responseJSON.errors);
			// 	} else {
			// 		showMessage(res.responseText, true);
			// 	}
			// }
		}
	}

	async componentDidMount() {
		const items = await api(this.endPoint);
		this.setState({ items });
	}

	editStart(item) {
		this.setState({
			target: item[this.primaryKey],
			editing: item
		});
	}

	cancelEditItem(item) {
		this.setState({ editing: null });
	}

	render() {
		return <div>
			<h1>
				<Glyphicon glyph={this.glyph} />
				&ensp;{this.title}
			</h1>
			<List
				items={this.state.items}
				listColumns={this.listColumns}
				onEditClick={this.editStart.bind(this)}/>
			<p className="text-right">
				<Button bsStyle="primary" bsSize="small">
					<Glyphicon glyph="plus"/>&ensp;
					Create new
				</Button>
			</p>
			{ this.state.editing ?
				<Editor
					item={this.state.editing}
					properties={this.editorProperties}
					primaryKey={this.primaryKey}
					onSaveClick={item => this.commitItem(item)}
					onCancelClick={() => this.cancelEditItem()}
				/>
			: null }
		</div>
	}
}

const List = props => {
	const headerColumns = props.listColumns.map(col => (
		<th key={col.label}>{col.label}</th>
	));

	const items = props.items.map(item => {
		const columns = props.listColumns.map(col => {
			if (col.key) {
				return <td>{item[col.key]}</td>;
			} else {
				return <td>{col.data(item)}</td>;
			}
		});
		return <tr>
			{columns}
			<td>
				<Button bsSize="xs" bsStyle="primary"
					onClick={props.onEditClick.bind(null, item)}
				>
					<Glyphicon glyph="edit"/>
				</Button>
			</td>
		</tr>;
	});

	return <table className="table table-striped table-hover table-condensed">
		<thead><tr>
			{headerColumns}
			<th></th>
		</tr></thead>
		<tbody>{items}</tbody>
	</table>;
};

class Editor extends React.Component {
	constructor(props) {
		super(props);
		this.state = { item: { ... props.item } };
	}

	componentWillReceiveProps(props) {
		this.setState({ item: { ... props.item } });
	}

	onChange(item) {
		this.setState({ item });
	}

	onSaveClick() {
		this.props.onSaveClick && this.props.onSaveClick(this.state.item);
	}

	render() {
		const header = <span>
			Updating: <strong>{this.props.item[this.props.primaryKey]}</strong>
		</span>;
		return <Panel header={header} bsStyle="primary">
			<PropertyEditor
				value={this.state.item}
				properties={this.props.properties}
				onChange={this.onChange.bind(this)}
			/>
			<p className="text-center">
				<Button bsStyle="link" onClick={this.props.onCancelClick}>
					Cancel
				</Button>
				<Button bsStyle="primary" onClick={this.onSaveClick.bind(this)}>
					Save
				</Button>
			</p>
		</Panel>;
	}
};
