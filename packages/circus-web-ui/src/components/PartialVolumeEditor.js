import React, { Fragment } from 'react';
import { Button, Modal } from 'components/react-bootstrap';
import PropertyEditor from 'rb/PropertyEditor';
import MultiRange from 'multi-integer-range';
import * as et from 'rb/editor-types';

const describePartialVolumeDescriptor = descriptor => {
  if (!isValidPartialVolumeDescriptor(descriptor)) return 'Invalid';
  const { start, end, delta } = descriptor;
  const count = (end - start) / delta + 1;
  if (count >= 6) {
    let result = '';
    for (let i = 0; i < 3; i++) {
      if (i > 0) result += ', ';
      result += start + delta * i;
    }
    return result + ', ..., ' + end;
  } else {
    let result = '';
    for (let i = 0; i <= count; i++) {
      if (i > 0) result += ', ';
      result += start + delta * i;
    }
    return result;
  }
};

const isValidPartialVolumeDescriptor = descriptor => {
  const { start, end, delta } = descriptor;
  const isNatural = value => Number.isInteger(value) && value > 0;
  if (descriptor.start > descriptor.end) return false;
  if (!isNatural(start)) return false;
  if (!isNatural(end)) return false;
  if (!isNatural(delta)) return false;
  if (!isNatural((end - start) / delta)) return false;
  return true;
};

export default class PartialVolumeEditor extends React.PureComponent {
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
          Partial volume Preview: {describePartialVolumeDescriptor(descriptor)}
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
            disabled={!isValidPartialVolumeDescriptor(descriptor)}
            bsStyle="primary"
          >
            OK
          </Button>
        </Modal.Footer>
      </Fragment>
    );
  }
}
