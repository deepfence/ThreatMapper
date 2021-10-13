/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { connect } from 'react-redux';

import NodeDetailsHealthItem from './node-details-health-item';
import { getMetricColor } from '../../utils/metric-utils';

class NodeDetailsHealthLinkItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hovered: false
    };

    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
  }

  onMouseOver() {
    this.setState({hovered: true});
  }

  onMouseOut() {
    this.setState({hovered: false});
  }

  render() {
    const {
      id, url, pausedAt, ...props
    } = this.props;
    const metricColor = getMetricColor(id);

    return (
      <NodeDetailsHealthItem
        {...props}
        hovered={this.state.hovered}
        metricColor={metricColor}
        />
    );
  }
}

function mapStateToProps(state) {
  return {
    pausedAt: state.get('pausedAt'),
  };
}

export default connect(mapStateToProps)(NodeDetailsHealthLinkItem);
