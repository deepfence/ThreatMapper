/* eslint-disable react/no-access-state-in-setstate */
import React from 'react';

/* import ShowMore from '../show-more'; */
import NodeDetailsHealthLinkItem from './node-details-health-link-item';

export default class NodeDetailsHealth extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      expanded: false
    };
    this.handleClickMore = this.handleClickMore.bind(this);
  }

  handleClickMore() {
    const {expanded} = this.state;
    this.setState({expanded: !expanded});
  }

  render() {
    const {
      metrics = [],
      topologyId,
    } = this.props;
    const { expanded } = this.state;
    const primeCutoff = 2;
    let primeMetrics = metrics.filter(m => !m.valueEmpty).slice(0, primeCutoff);
    let emptyMetrics = metrics.filter(m => m.valueEmpty);

    if (primeMetrics.length === 0 && emptyMetrics.length > 0) {
      primeMetrics = emptyMetrics;
      emptyMetrics = [];
    }

    const shownWithData = expanded ? primeMetrics : primeMetrics.slice(0, 3);
    const shownEmpty = expanded ? emptyMetrics : [];
    /*  const notShown = metrics.length - shownWithData.length - shownEmpty.length; */

    return (
      <div className="node-details-health" style={{ justifyContent: 'space-around' }}>
        <div className="node-details-health-wrapper">
          {shownWithData.map(item => (
            <NodeDetailsHealthLinkItem
              {...item}
              key={item.id}
              topologyId={topologyId}
          />
          ))}
        </div>
        <div className="node-details-health-wrapper">
          {shownEmpty.map(item => (
            <NodeDetailsHealthLinkItem
              {...item}
              key={item.id}
              topologyId={topologyId}
          />
          ))}
        </div>
        {/*
        <ShowMore
          handleClick={this.handleClickMore} collection={metrics}
          expanded={this.state.expanded} notShown={notShown} hideNumber={this.state.expanded}
        />
        */}
      </div>
    );
  }
}
