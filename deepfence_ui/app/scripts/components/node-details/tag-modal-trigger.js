/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import classnames from 'classnames';
import injectModalTrigger from '../common/generic-modal/modal-trigger-hoc';
import TagModal from './tag-modal';

class TagModalTrigger extends React.PureComponent {
  constructor(props) {
    super(props);
    this.renderModalContent = this.renderModalContent.bind(this);
    this.mouseUpHandler = this.mouseUpHandler.bind(this);
  }

  renderModalContent() {
    const {
      nodeId,
      nodeType,
      value = '',
    } = this.props;

    return (
      <TagModal
        nodeId={nodeId}
        nodeType={nodeType}
        tags={value}
      />
    );
  }

  // Topology table view tracks mouse down and mouse up events
  // to open node details side panel.
  // We need to override mouse up event and stop propagation
  // to open user defined tags modal
  mouseUpHandler(ev) {
    ev.stopPropagation();
    const {
      triggerModal,
      node: {
        label = 'Node',
      } = {},
    } = this.props;
    const modalProps = {
      title: `${label} Tags`,
      modalContent: this.renderModalContent,
      contentStyles: {
        width: '500px',
      },
      onHide: () => {},
    };
    triggerModal('GENERIC_MODAL', modalProps);
  }

  render() {
    const {
      value = [],
    } = this.props;

    const isEmpty = value.length === 0;

    const classname = classnames('truncate', {
      'active-color': isEmpty,
    });

    const dispValue = isEmpty ? 'Add Tags' : value.join(', ');
    return (
      <div
        className={classname}
        onMouseUp={this.mouseUpHandler}
        onClick={e => e.stopPropagation()}
        title={dispValue}
      >
        {dispValue}
      </div>
    );
  }
}

export default injectModalTrigger(TagModalTrigger);
