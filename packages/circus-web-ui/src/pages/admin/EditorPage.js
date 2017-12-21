import React from 'react';
import { Button, Panel } from 'components/react-bootstrap';
import IconButton from 'rb/IconButton';
import PropertyEditor from 'rb/PropertyEditor';
import { api } from 'utils/api.js';
import AdminContainer from './AdminContainer';
import { refreshUserInfo } from 'actions';
import { store } from 'store';
import DataGrid from 'components/DataGrid';

export default class EditorPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
      target: null,
      editing: null,
      complaints: {}
    };
    this.createItem = this.createItem.bind(this);
    this.editStart = this.editStart.bind(this);
    this.cancelEditItem = this.cancelEditItem.bind(this);
  }

  async commitItem(item) {
    if (this.props.preCommitHook) {
      if (!await this.props.preCommitHook(this.state.target)) return;
    }

    let endPoint = this.props.endPoint;
    if (this.state.target) {
      endPoint +=
        '/' + encodeURIComponent(this.state.editing[this.props.primaryKey]);
    }

    if (this.state.target && this.props.primaryKey in item) {
      item = { ...item };
      delete item[this.props.primaryKey];
    }

    const args = {
      method: this.state.target ? 'put' : 'post',
      data: item,
      handleErrors: [400]
    };
    try {
      await api(endPoint, args);
      this.setState({ target: null, editing: null });
      await this.loadItems();
      store.dispatch(refreshUserInfo(true)); // Full user data refresh
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

  editStart(index, item) {
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

    return (
      <AdminContainer title={title} icon={icon} className="admin-editor">
        <DataGrid
          value={this.state.items}
          active={this.state.editing}
          columns={this.props.listColumns}
          onRowClick={this.editStart}
        />
        <p className="text-right">
          <IconButton
            icon="plus"
            bsStyle="primary"
            bsSize="small"
            onClick={this.createItem}
          >
            Create new
          </IconButton>
        </p>
        {this.state.editing && (
          <Editor
            item={this.state.editing}
            complaints={this.state.complaints}
            target={this.state.target}
            properties={this.props.editorProperties}
            excludeProperty={this.state.target ? this.props.primaryKey : null}
            onSaveClick={item => this.commitItem(item)}
            onCancelClick={this.cancelEditItem}
          />
        )}
      </AdminContainer>
    );
  }
}

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
    if (
      nextProps.properies !== this.props.properties ||
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
    const properties = this.props.properties.filter(
      p => !this.props.excludeProperty || this.props.excludeProperty !== p.key
    );

    const header = this.props.target ? (
      <span>
        Updating: <strong>{this.props.target}</strong>
      </span>
    ) : (
      'Creating new item'
    );
    const footer = (
      <div className="text-center">
        <Button bsStyle="link" onClick={this.props.onCancelClick}>
          Cancel
        </Button>
        <Button bsStyle="primary" onClick={this.handleSave}>
          Save
        </Button>
      </div>
    );
    return (
      <Panel header={header} footer={footer} bsStyle="primary">
        <PropertyEditor
          value={this.state.item}
          complaints={this.props.complaints}
          properties={properties}
          onChange={this.onChange.bind(this)}
        />
      </Panel>
    );
  }
}
