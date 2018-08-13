import React from 'react';
import { Alert } from 'components/react-bootstrap';
import ShrinkSelect from 'rb/ShrinkSelect';
import { connect } from 'react-redux';
import { FileUpload } from 'components/FileUpload';
import { apiCaller } from 'utils/api';

class ImportSeriesView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      uploadDomain: props.loginUser ? props.loginUser.domains[0] : null
    };
  }

  domainChange = domain => {
    this.setState({ uploadDomain: domain });
  };

  componentWillReceiveProps(props) {
    if (this.state.uploadDomain === '' && props.loginUser) {
      this.setState({ uploadDomain: props.loginUser.defaultDomain });
    }
  }

  uploaded = () => {
    // console.log(res);
  };

  render() {
    const user = this.props.loginUser;
    const { uploadDomain } = this.state;

    if (!Array.isArray(user.domains) || user.domains.length === 0) {
      return (
        <Alert bsStyle="warning">
          You do not belong to any domain. Uploading is not allowed.
        </Alert>
      );
    }

    return (
      <div>
        <h1>
          <span className="circus-icon-series-import" /> Series Import
        </h1>
        <p>
          Choose DICOM files to upload. (Maximum size: {user.uploadFileSizeMax},
          up to {user.uploadFileMax} files).
        </p>
        <p>Zipped DICOM files are also supported.</p>
        <FileUpload
          multiple={true}
          targetResource="import-series"
          uploadFileMax={user.uploadFileMax}
          uploadFileSizeMax={user.uploadFileSizeMax}
          url={`series/domain/${encodeURIComponent(uploadDomain)}`}
          apiCaller={apiCaller}
          onUploaded={this.uploaded}
        >
          <div>
            Upload Domain:&ensp;
            <ShrinkSelect
              options={user.domains}
              value={this.state.uploadDomain}
              onChange={this.domainChange}
            />
          </div>
          <hr />
        </FileUpload>
      </div>
    );
  }
}

const ImportSeries = connect(state => ({ loginUser: state.loginUser.data }))(
  ImportSeriesView
);

export default ImportSeries;
