/* eslint-disable react/destructuring-assignment */
import React from 'react';
import withIntegrationForm from '../../../hoc/notification-integration';

class AWSS3IntegrationForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);

    this.state = {
      bucketName: '',
      s3FolderPath: '',
      awsAccessKey: '',
      awsSecretKey: '',
      awsRegion: '',
      integration_type: 's3',
    };
  }

  handleChange(e) {
    const { name, value } = e.target;
    this.setState({ [name]: value }, () => {
      const state = {
        ...this.state,
        s3_bucket: this.state.bucketName,
        folder_path: this.state.s3FolderPath,
        aws_access_key: this.state.awsAccessKey,
        aws_secret_key: this.state.awsSecretKey,
        region_name: this.state.awsRegion,
      };
      this.props.saveChildFormData(state);
    });
  }

  render() {
    const {
      bucketName, s3FolderPath, awsAccessKey, awsSecretKey, awsRegion
    } = this.state;
    const { submitted } = this.props;

    return (
      <div>
        <div className="row">
          <div className="col-md-4">
            <div className={`form-group ${(submitted && !bucketName ? 'has-error' : '')}`}>
              <label htmlFor="bucketName">
                <i className="fa fa-amazon" aria-hidden="true" />
                <input type="text" className="form-control" name="bucketName" placeholder="S3 Bucket Name" value={bucketName} onChange={this.handleChange} />
              </label>
              { submitted && !bucketName && <div className="field-error">S3 Bucket Name is required</div> }
            </div>
          </div>
          <div className="col-md-4">
            <div className={`form-group ${(submitted && !s3FolderPath ? 'has-error' : '')}`}>
              <label htmlFor="s3FolderPath">
                <i className="fa fa-folder" aria-hidden="true" />
                <input type="text" className="form-control" name="s3FolderPath" placeholder="S3 folder" value={s3FolderPath} onChange={this.handleChange} />
              </label>
              { submitted && !s3FolderPath && <div className="field-error">S3 folder is required</div> }
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-4">
            <div className={`form-group ${(submitted && !awsAccessKey ? 'has-error' : '')}`}>
              <label htmlFor="awsAccessKey">
                <i className="fa fa-key" aria-hidden="true" />
                <input
                  type="text"
                  className="form-control"
                  name="awsAccessKey"
                  placeholder="AWS Access Key"
                  value={awsAccessKey}
                  onChange={this.handleChange}
                  autoComplete="off"
                />
              </label>
              { submitted && !awsAccessKey && <div className="field-error">AWS Access Key is required</div> }
            </div>
          </div>
          <div className="col-md-4">
            <div className={`form-group ${(submitted && !awsSecretKey ? 'has-error' : '')}`}>
              <label htmlFor="awsSecretKey">
                <i className="fa fa-key" aria-hidden="true" />
                <input
                  type="text"
                  className="form-control"
                  name="awsSecretKey"
                  placeholder="AWS Secret Key"
                  value={awsSecretKey}
                  onChange={this.handleChange}
                  autoComplete="off"
                />
              </label>
              { submitted && !awsSecretKey && <div className="field-error">AWS Secret Key is required</div> }
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-4">
            <div className={`form-group ${(submitted && !awsRegion ? 'has-error' : '')}`}>
              <label htmlFor="awsRegion">
                <i className="fa fa-globe" aria-hidden="true" />
                <input
                  type="text"
                  className="form-control"
                  name="awsRegion"
                  placeholder="AWS Region"
                  value={awsRegion}
                  onChange={this.handleChange}
                  autoComplete="off"
                />
              </label>
              { submitted && !awsRegion && <div className="field-error">AWS Region is required</div> }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const SplunkIntegrationAdd = withIntegrationForm(AWSS3IntegrationForm);

export default SplunkIntegrationAdd;
