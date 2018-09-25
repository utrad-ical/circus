import React, { Fragment } from 'react';
import { Button, Modal } from 'components/react-bootstrap';
import PropertyEditor from 'rb/PropertyEditor';
import MultiRange from 'multi-integer-range';
import * as et from 'rb/editor-types';
import * as pvu from 'utils/partialVolumeDescriptorUtils';

export default class PartialVolumeDescriptorEditor extends React.PureComponent {
  constructor(props) {
    super(props);
    const mr = new MultiRange(props.images);

    this.state = {
      useDescriptor: true,
      descriptor: props.initialValue
        ? props.initialValue
        : { start: mr.min(), end: mr.max(), delta: 1 }
    };

    this.properties = [
      { key: 'start', editor: et.number({ min: 1, max: mr.max() }) },
      { key: 'end', editor: et.number({ min: 1, max: mr.max() }) },
      { key: 'delta', editor: et.number({ min: 1, max: 10 }) }
    ];
  }

  handleCancelClick = () => {
    const { onResolve } = this.props;
    onResolve(null);
  };

  handleRemoveClick = () => {
    const { onResolve } = this.props;
    onResolve({ descriptor: null });
  };

  handleOkClick = () => {
    const { onResolve } = this.props;
    onResolve({ descriptor: this.state.descriptor });
  };

  handleChange = value => {
    this.setState({ descriptor: value });
  };

  render() {
    const { descriptor } = this.state;
    return (
      <Fragment>
        <Modal.Body>
          <PropertyEditor
            properties={this.properties}
            value={descriptor}
            onChange={this.handleChange}
          />
          <hr />
          <b>Preview:</b> {pvu.describePartialVolumeDescriptor(descriptor)}
        </Modal.Body>
        <Modal.Footer>
          <Button bsStyle="link" onClick={this.handleCancelClick}>
            Cancel
          </Button>
          <Button onClick={this.handleRemoveClick}>
            Remove Partial Volume
          </Button>
          <Button
            onClick={this.handleOkClick}
            disabled={!pvu.isValidPartialVolumeDescriptor(descriptor)}
            bsStyle="primary"
          >
            OK
          </Button>
        </Modal.Footer>
      </Fragment>
    );
  }
}
