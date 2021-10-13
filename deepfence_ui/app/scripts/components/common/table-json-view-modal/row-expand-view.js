/* eslint-disable react/destructuring-assignment */
import React from 'react';

import JSONView from './json-view';

class RowExpandView extends React.Component {
  constructor() {
    super();
    this.state = {
      isJSONViewVisible: false
    };
    this.toggleView = this.toggleView.bind(this);
  }

  toggleView() {
    if (this.state.isJSONViewVisible) {
      this.setState({isJSONViewVisible: false});
    } else {
      this.setState({isJSONViewVisible: true});
    }
  }

  render() {
    const valueWidth = {
      width: '82%',
      textAlign: 'left',
      padding: '2px 10px'
    };
    const iconStyles = {
      cursor: 'pointer'
    };
    return (
      <div style={valueWidth}>
        { this.state.isJSONViewVisible
          ? <div className="fa fa-minus-square" style={iconStyles} aria-hidden="true" onClick={this.toggleView} />
          : <div className="fa fa-plus-square" style={iconStyles} aria-hidden="true" onClick={this.toggleView} />
        }
        { this.state.isJSONViewVisible && <JSONView data={this.props.data} /> }
      </div>
    );
  }
}

export default RowExpandView;
