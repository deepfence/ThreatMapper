import React from 'react';
import { connect } from 'react-redux';
import AWSS3IntegrationList from './list';

class AWSS3IntegrationListContainer extends React.PureComponent {
  render() {
    const { awsS3IntegrationList } = this.props;

    return (
      <AWSS3IntegrationList
        {...this.props}
        awsS3IntegrationList={awsS3IntegrationList}
      />
    );
  }
}

function mapStateToProps(state) {
  return {
    awsS3IntegrationList: state.get('availableAWSS3Integrations'),
  };
}

const connectedAWSS3IntegrationListContainer = connect(mapStateToProps)(
  AWSS3IntegrationListContainer
);

export default connectedAWSS3IntegrationListContainer;
