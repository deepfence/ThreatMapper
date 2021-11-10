import React from 'react';
import { connect } from 'react-redux';
import GoogleChronicleList from './list';

class GoogleChronicleListContainer extends React.PureComponent {

  render() {
    const { googleChronicleList } = this.props;

    return (
      <GoogleChronicleList
        {...this.props}
        googleChronicleList={googleChronicleList}
      />
    );
  }
}

function mapStateToProps(state) {
  return {
    googleChronicleList: state.get('availableGoogleChronicleIntegrations'),
  };
}

const connectedGoogleChronicleListContainer = connect(mapStateToProps)(
  GoogleChronicleListContainer);

export default connectedGoogleChronicleListContainer;