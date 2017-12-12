import React from 'react';
import { Button, Panel } from 'components/react-bootstrap';
import IconButton from 'rb/IconButton';
import PropertyEditor from 'rb/PropertyEditor';
import { api } from 'utils/api.js';
import AdminContainer from './AdminContainer';

export default class EditorPage extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			items: [],
			target: null,
			targetID: null,
			editing: null,
			complaints: {}
		};
		this.createItem = this.createItem.bind(this);
		this.editStart = this.editStart.bind(this);
		this.cancelEditItem = this.cancelEditItem.bind(this);
	}

	async commitItem(item) {
		if (this.props.preCommitHook) {
			if (!(await this.props.preCommitHook(this.state.target))) return;
		}

		let endPoint = this.props.endPoint;
		if (this.state.target) {
			endPoint += '/' + encodeURIComponent(this.state.editing[this.props.primaryKey]);
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
		const items = (await api(this.props.endPoint)).items;
		this.setState({ items });
	}

	componentDidMount() {
		this.loadItems();
	}

	targetName(item) {
		if (this.props.targetName) return this.props.targetName(item);
		return item[this.props.primaryKey];
	}

	editStart(item) {
		this.setState({
			target: this.targetName(item),
			editing: item,
			complaints: {}
		});
	}

	cancelEditItem() {
		this.setState({ editing: null, complaints: {} });
	}

	createItem() {
		this.setState({
			target: null,
			editing: this.props.makeEmptyItem()
		});
	}

	render() {
		const { title, icon } = this.props;

		return <AdminContainer
			title={title}
			icon={icon}
			className='admin-editor'
		>
			<List
				items={this.state.items}
				active={this.state.editing}
				listColumns={this.props.listColumns}
				onEditClick={this.editStart}
			/>
			<p className='text-right'>
				<IconButton
					icon='plus'
					bsStyle='primary'
					bsSize='small'
					onClick={this.createItem}
				>
					Create new
				</IconButton>
			</p>
			{ this.state.editing &&
				<Editor
					item={this.state.editing}
					complaints={this.state.complaints}
					target={this.state.target}
					properties={this.props.editorProperties}
					onSaveClick={item => this.commitItem(item)}
					onCancelClick={this.cancelEditItem}
				/>
			}
		</AdminContainer>;
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
				<IconButton bsSize='xs' bsStyle='primary' icon='edit'
					onClick={props.onEditClick.bind(null, item)}
				/>
			</td>
		</tr>;
	});

	return <table className='table table-hover table-condensed'>
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
		this.state = {
			item: this.pickProperties(props.properties, props.item)
		};
		this.handleSave = this.handleSave.bind(this);
	}

	pickProperties(properties, item) {
		// Remove keys not in the editor property list
		const result = {};
		for (const p of properties) {
			result[p.key] = item[p.key];
		}
		return result;
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.properies !== this.props.properties ||
			nextProps.item !== this.props.item
		) {
			this.setState({
				item: this.pickProperties(nextProps.properties, nextProps.item)
			});
		}
	}

	onChange(item) {
		this.setState({ item });
	}

	handleSave() {
		this.props.onSaveClick && this.props.onSaveClick(this.state.item);
	}

	render() {
		const header = this.props.target ?
			<span>Updating: <strong>{this.props.target}</strong></span>
			: 'Creating new item';
		const footer = <div className='text-center'>
			<Button bsStyle='link' onClick={this.props.onCancelClick}>
				Cancel
			</Button>
			<Button bsStyle='primary' onClick={this.handleSave}>
				Save
			</Button>
		</div>;
		return <Panel header={header} footer={footer} bsStyle='primary'>
			<PropertyEditor
				value={this.state.item}
				complaints={this.props.complaints}
				properties={this.props.properties}
				onChange={this.onChange.bind(this)}
			/>
		</Panel>;
	}
}
