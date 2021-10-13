/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { setGraphView, setTableView} from '../actions/app-actions';

import {
  GRAPH_VIEW_MODE,
  TABLE_VIEW_MODE,
} from '../constants/naming';

class ViewModeSelector extends React.Component {
  renderItem(label, viewMode, setViewModeAction, isEnabled = true) {
    const isSelected = (this.props.topologyViewMode === viewMode);

    const className = classNames('view-mode-selector-action', {
      'view-mode-selector-action-selected': isSelected,
    });
    const onClick = () => {
      setViewModeAction();
    };

    return (
      <div
        className={className}
        disabled={!isEnabled}
        onClick={isEnabled && onClick}
        title={`View ${label.toLowerCase()}`}
        aria-hidden="true">
        {label}
      </div>
    );
  }

  render() {
    return (
      <div className="view-mode-selector">
        <div className="view-mode-selector-wrapper">
          {this.renderItem('Graph', GRAPH_VIEW_MODE, this.props.setGraphView)}
          {this.renderItem('Table', TABLE_VIEW_MODE, this.props.setTableView)}
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    topologyViewMode: state.get('topologyViewMode'),
    currentTopology: state.get('currentTopology'),
  };
}

export default connect(
  mapStateToProps,
  { setGraphView, setTableView}
)(ViewModeSelector);
