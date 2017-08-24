import React from 'react';
import { Button, Glyphicon, Panel } from 'components/react-bootstrap';
import { PropertyEditor } from 'components/property-editor';
import { api } from 'utils/api.js';

export class EditorPage extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			items: [],
			target: null,
			targetID: null,
			editing: null,
			complaints: null
		};
	}

	async commitItem(item) {
		if (!(await this.preCommitHook(this.editing, item))) return;

		let endPoint = this.endPoint;
		if (this.state.target) {
			endPoint += '/' + encodeURIComponent(this.state.editing[this.primaryKey]);
		}
		const args = {
			method: this.state.target ? 'put' : 'post',
			data: item,
			handleErrors: [400]
		};
		try {
			await api(endPoint, args);
			this.setState({ target: null, editing: null });
			this.loadItems();
		} catch (err) {
			this.setState({ complaints: err.data.errors });
		}
	}

	async loadItems() {
		const items = await api(this.endPoint);
		this.setState({ items });
	}

	/**
	 * Subclasses can override this method and cancel saving.
	 */
	async preCommitHook(before, after) {
		return true;
	}

	componentDidMount() {
		this.loadItems();
	}

	targetName(item) {
		return item[this.primaryKey];
	}

	editStart(item) {
		this.setState({
			target: this.targetName(item),
			editing: item,
			complaints: null
		});
	}

	cancelEditItem(item) {
		this.setState({ editing: null, complaints: null });
	}

	createItem() {
		this.setState({
			target: null,
			editing: this.makeEmptyItem()
		});
	}

	editorFooter() {
		return null;
	}

	render() {
		return <div className="admin-editor">
			<h1>
				<Glyphicon glyph={this.glyph} />
				&ensp;{this.title}
			</h1>
			<List
				items={this.state.items}
				active={this.state.editing}
				listColumns={this.listColumns}
				onEditClick={this.editStart.bind(this)}/>
			<p className="text-right">
				<Button bsStyle="primary" bsSize="small" onClick={this.createItem.bind(this)}>
					<Glyphicon glyph="plus"/>&ensp;
					Create new
				</Button>
			</p>
			{ this.state.editing ?
				<Editor
					item={this.state.editing}
					complaints={this.state.complaints}
					target={this.state.target}
					properties={this.editorProperties}
					onSaveClick={item => this.commitItem(item)}
					onCancelClick={() => this.cancelEditItem()}
				/>
			: null }
			{this.editorFooter()}
		</div>
	}
}

const List = props => {
	const headerColumns = props.listColumns.map(col => (
		<th key={col.label}>{col.label}</th>
	));

	const items = props.items.map((item, i) => {
		const columns = props.listColumns.map(col => {
			if (col.key) {
				return <td key={col.label}>{item[col.key]}</td>;
			} else {
				return <td key={col.label}>{col.data(item)}</td>;
			}
		});
		const active = props.active === item;
		return <tr key={i} className={active ? 'info' : null}>
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

	return <table className="table table-hover table-condensed">
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
		const item = {};
		for (let p of props.properties) {
			// Remove keys not in the editor property list
			item[p.key] = props.item[p.key];
		}
		this.state = { item };
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
		const header = this.props.target ?
				<span>Updating: <strong>{this.props.target}</strong></span>
				: 'Creating new item';
		const footer = <div className="text-center">
			<Button bsStyle="link" onClick={this.props.onCancelClick}>
				Cancel
			</Button>
			<Button bsStyle="primary" onClick={this.onSaveClick.bind(this)}>
				Save
			</Button>
		</div>;
		return <Panel header={header} footer={footer} bsStyle="primary">
			<PropertyEditor
				value={this.state.item}
				complaints={this.props.complaints}
				properties={this.props.properties}
				onChange={this.onChange.bind(this)}
			/>
		</Panel>;
	}
};
