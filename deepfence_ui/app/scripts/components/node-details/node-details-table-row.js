/* eslint-disable react/destructuring-assignment */
/* eslint-disable import/no-cycle */
import React from 'react';
import { connect } from 'react-redux';

import classNames from 'classnames';
import { groupBy, mapValues } from 'lodash';
import { intersperse } from '../../utils/array-utils';

import { NodeDetailsTableNodeLink } from './node-details-table-node-link';
import { NodeDetailsTableNodeMetricLink } from './node-details-table-node-metric-link';
import { formatDataType } from '../../utils/string-utils';
import TagModalTrigger from './tag-modal-trigger';

function getValuesForNode(node) {
  let values = {};
  ['metrics', 'metadata'].forEach(collection => {
    if (node[collection]) {
      node[collection].forEach(field => {
        const result = { ...field };
        result.valueType = collection;
        if (field.id === 'captureStatus') {
          const interfaceList =
            node[collection].filter(row => row.id === 'interfaceNames') || [];
          const { value = '' } = result;
          const match = value.match(/--input-raw ([^\s]+)/gm);
          let interfaceName = '';
          if (match && match.length >= 1) {
            const tempInterfaceName = match[0].split(' ')[1];
            const interfaceListArr = interfaceList[0].value || '';
            if (
              tempInterfaceName.trim().toLowerCase() === 'any' ||
              interfaceListArr.split(';').includes(tempInterfaceName)
            ) {
              interfaceName = tempInterfaceName;
            }
          }

          let captureStatusValue = 'Inactive';
          if (interfaceName) {
            captureStatusValue =
              interfaceName.trim().toLowerCase() !== 'any'
                ? `Active on ${interfaceName} interface`
                : 'Active on all interfaces';
          }
          values[field.id] = { ...result, value: captureStatusValue };
        } else if (field.id === 'user_defined_tags') {
          values[field.id] = {
            ...result,
            value: <TagModalTrigger value={result.value} node={node} />,
          };
        } else if (field.id === 'cloud_provider') {
          values[field.id] = {
            ...result,
            value: result.value || 'Private/On Prem',
          };
        } else {
          values[field.id] = result;
        }
      });
    }
  });

  if (node.parents) {
    const byTopologyId = groupBy(node.parents, parent => parent.topologyId);
    const relativesByTopologyId = mapValues(
      byTopologyId,
      (relatives, topologyId) => ({
        id: topologyId,
        label: topologyId,
        value: relatives.map(relative => relative.label).join(', '),
        valueType: 'relatives',
        relatives,
      })
    );

    values = {
      ...values,
      ...relativesByTopologyId,
    };
  }

  return values;
}

function renderValues(
  node,
  columns = [],
  columnStyles = [],
  timestamp = null,
  topologyId = null
) {
  const fields = getValuesForNode(node);
  return columns.map(({ id }, i) => {
    const field = fields[id];
    const style = columnStyles[i];
    if (field) {
      if (field.valueType === 'metadata') {
        const { value, title } = formatDataType(field, timestamp);
        return (
          <td
            className="node-details-table-node-value truncate"
            title={title}
            style={style}
            key={field.id}
          >
            {field.dataType === 'link' ? (
              <a
                rel="noopener noreferrer"
                target="_blank"
                className="node-details-table-node-link"
                href={value}
              >
                {value}
              </a>
            ) : (
              value
            )}
          </td>
        );
      }
      if (field.valueType === 'relatives') {
        return (
          <td
            className="node-details-table-node-value truncate"
            title={field.value}
            style={style}
            key={field.id}
          >
            {intersperse(
              field.relatives.map(relative => (
                <NodeDetailsTableNodeLink
                  key={relative.id}
                  linkable
                  nodeId={relative.id}
                  {...relative}
                />
              )),
              ' '
            )}
          </td>
        );
      }
      // valueType === 'metrics'
      return (
        <NodeDetailsTableNodeMetricLink
          style={style}
          key={field.id}
          topologyId={topologyId}
          {...field}
        />
      );
    }
    // empty cell to complete the row for proper hover
    return (
      <td className="node-details-table-node-value" style={style} key={id} />
    );
  });
}

/**
 * Table row children may react to onClick events but the row
 * itself does detect a click by looking at onMouseUp. To stop
 * the bubbling of clicks on child elements we need to dismiss
 * the onMouseUp event.
 */
export const dismissRowClickProps = {
  onMouseUp: ev => {
    ev.preventDefault();
    ev.stopPropagation();
  },
};

class NodeDetailsTableRow extends React.Component {
  constructor(props, context) {
    super(props, context);

    //
    // We watch how far the mouse moves when click on a row, move to much and we assume that the
    // user is selecting some data in the row. In this case don't trigger the onClick event which
    // is most likely a details panel popping open.
    //
    this.state = { focused: false };
    this.mouseDragOrigin = [0, 0];

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
  }

  onMouseEnter() {
    this.setState({ focused: true });
    if (this.props.onMouseEnter) {
      this.props.onMouseEnter(this.props.index, this.props.node);
    }
  }

  onMouseLeave() {
    this.setState({ focused: false });
    if (this.props.onMouseLeave) {
      this.props.onMouseLeave();
    }
  }

  onMouseDown(ev) {
    const { pageX, pageY } = ev;
    this.mouseDragOrigin = [pageX, pageY];
  }

  onMouseUp(ev) {
    const [originX, originY] = this.mouseDragOrigin;
    const { pageX, pageY } = ev;
    const thresholdPx = 2;
    const movedTheMouseTooMuch =
      Math.abs(originX - pageX) > thresholdPx ||
      Math.abs(originY - pageY) > thresholdPx;
    if (movedTheMouseTooMuch) {
      return;
    }
    this.props.onClick(ev, this.props.node);
  }

  render() {
    const {
      node,
      nodeIdKey,
      topologyId,
      columns,
      onClick,
      colStyles,
      timestamp,
    } = this.props;
    const [firstColumnStyle, ...columnStyles] = colStyles;
    const values = renderValues(
      node,
      columns,
      columnStyles,
      timestamp,
      topologyId
    );
    const nodeId = node[nodeIdKey];
    const { nodeSeverity } = this.props;
    const className = classNames('node-details-table-node', {
      selected: this.props.selected,
      focused: this.state.focused,
    });

    return (
      <tr
        onMouseDown={onClick && this.onMouseDown}
        onMouseUp={onClick && this.onMouseUp}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        className={className}
      >
        <td
          className="node-details-table-node-label truncate"
          style={firstColumnStyle}
        >
          {this.props.renderIdCell(
            Object.assign(node, { topologyId, nodeId, nodeSeverity })
          )}
        </td>
        {values}
      </tr>
    );
  }
}

function mapStateToProps(state) {
  return {
    nodeSeverity: state.get('nodeSeverity'),
  };
}

export default connect(mapStateToProps)(NodeDetailsTableRow);

NodeDetailsTableRow.defaultProps = {
  renderIdCell: props => <NodeDetailsTableNodeLink {...props} />,
};
