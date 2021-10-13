import React from 'react';
import { connect } from 'react-redux';
import HTTPEndpointList from './list';

class HTTPEndpointListContainer extends React.PureComponent {
  render() {
    const { httpEndpointList } = this.props;

    return (
      <HTTPEndpointList
        {...this.props}
        httpEndpointList={httpEndpointList}
      />
    );
  }
}

function mapStateToProps(state) {
  return {
    httpEndpointList: state.get('availableHTTPEndpoints'),
  };
}

const connectedHTTPEndpointListContainer = connect(mapStateToProps)(
  HTTPEndpointListContainer
);

export default connectedHTTPEndpointListContainer;
