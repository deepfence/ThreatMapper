/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
import {fetchEula} from '../../../actions/app-actions';

class EULAView extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  componentDidMount() {
    this.getEula();
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (newProps.eulaContent) {
      this.setState({
        eulaContent: newProps.eulaContent
      });
    }
  }

  getEula() {
    this.props.dispatch(fetchEula());
  }

  render() {
    return (
      <div className="container eula-view-wrapper">
        <div className="eula-text-wrapper">
          <div className="eula-heading">end user licence agreement</div>
          <div className="eula-content">{this.state.eulaContent}</div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    eulaContent: state.get('eulaContent')
  };
}

export default connect(
  mapStateToProps
)(EULAView);
