import React from 'react';
import PropertyEditor from 'rb/PropertyEditor';
import * as et from 'rb/editor-types';
import { api } from 'utils/api';
import { showMessage, refreshUserInfo } from 'actions';
import { Button } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';
import { connect } from 'react-redux';

const PresetDeleteEditor = props => {
  const { value, onChange } = props;

  const handleDeleteClick = presetName => {
    const newValue = value.filter(preset => preset.name !== presetName);
    onChange(newValue);
  };

  if (!Array.isArray(value) || !value.length) {
    return <div className="form-control-static text-muted">(no presets)</div>;
  }

  return (
    <ul className="list-unstyled">
      {value.map(preset => {
        return (
          <li key={preset.name} className="form-control-static">
            {preset.name}{' '}
            <IconButton
              bsSize="xs"
              bsStyle="primary"
              icon="remove"
              onClick={() => handleDeleteClick(preset.name)}
            >
              Delete
            </IconButton>
          </li>
        );
      })}
    </ul>
  );
};

class PreferencesView extends React.Component {
  constructor(props) {
    super(props);
    this.state = { settings: null };
  }

  loadSettings = async () => {
    const settings = await api('preferences');
    this.setState({ settings });
  };

  componentDidMount() {
    this.loadSettings();
  }

  propertyChange(value) {
    this.setState({ settings: value });
  }

  saveClick = async () => {
    const { dispatch } = this.props;
    await api('preferences', {
      method: 'patch',
      data: this.state.settings
    });
    showMessage('Your preference was saved.', 'success', { short: true });
    dispatch(refreshUserInfo(true));
    this.loadSettings();
  };

  render() {
    if (this.state.settings === null) return <div />;

    const properties = [
      {
        caption: 'Color Theme',
        key: 'theme',
        editor: et.shrinkSelect({ mode_white: 'White', mode_black: 'Black' })
      },
      {
        caption: 'Show Personal Info',
        key: 'personalInfoView',
        editor: et.checkbox({ label: 'show' })
      },
      {
        caption: 'Case Search Presets',
        key: 'caseSearchPresets',
        editor: PresetDeleteEditor
      },
      {
        caption: 'Series Search Presets',
        key: 'seriesSearchPresets',
        editor: PresetDeleteEditor
      }
    ];

    return (
      <div>
        <h1>
          <span className="circus-icon circus-icon-preference" />&ensp;
          Preferences
        </h1>
        <PropertyEditor
          value={this.state.settings}
          properties={properties}
          onChange={this.propertyChange.bind(this)}
        />
        <p className="text-center">
          <Button bsStyle="primary" onClick={this.saveClick}>
            Save
          </Button>
          <Button bsStyle="link" onClick={this.loadSettings}>
            Cancel
          </Button>
        </p>
      </div>
    );
  }
}

const Preferences = connect()(PreferencesView);

export default Preferences;
