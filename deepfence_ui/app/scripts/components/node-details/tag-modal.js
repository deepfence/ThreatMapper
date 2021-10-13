import React from 'react';
import {Map} from 'immutable';
import {connect} from 'react-redux';
import TagAddForm from './tag-add-form';
import TagDeleteForm from './tag-delete-form';
import {
  addUserDefinedTagsAction,
  deleteUserDefinedTagsAction,
  clearUserDefinedTagsAction,
} from '../../actions/app-actions';

class TagModal extends React.PureComponent {
  constructor(props) {
    super(props);
    this.addUserDefinedTags = this.addUserDefinedTags.bind(this);
    this.deleteUserDefinedTags = this.deleteUserDefinedTags.bind(this);
  }

  componentDidMount() {
    const {
      nodeId,
      clearUserDefinedTagsAction: clearAction,
    } = this.props;
    clearAction({nodeId, });
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    const {
      nodes,
      nodeId,
      clearUserDefinedTagsAction: clearAction,
    } = this.props;

    const {
      nodes: newNodes,
    } = newProps;

    const oldNode = nodes.get(nodeId);
    const metadata = oldNode.get('metadata');
    const metadataIndex = metadata.reduce((acc, meta) => {
      acc[meta.get('id')] = meta.get('value');
      return acc;
    }, {});

    const newNode = newNodes.get(nodeId);
    const newMetadataIndex = newNode.get('metadata').reduce((acc, meta) => {
      acc[meta.get('id')] = meta.get('value');
      return acc;
    }, {});

    if (metadataIndex.user_defined_tags !== newMetadataIndex.user_defined_tags) {
      clearAction({nodeId});
    }
  }

  addUserDefinedTags(valuesImmutable) {
    const {
      addUserDefinedTagsAction: action,
      nodeId,
      nodeType,
    } = this.props;

    let values = {};
    if (valuesImmutable.toJS) {
      values = valuesImmutable.toJS();
    }

    const {
      tag,
    } = values;

    const params = {
      taglist: [tag],
      nodeId,
      nodeType,
    };

    const promise = action(params);
    return promise;
  }

  deleteUserDefinedTags(valuesImmutable) {
    const {
      deleteUserDefinedTagsAction: action,
      nodeId,
      nodeType,
    } = this.props;

    let values = {};
    if (valuesImmutable.toJS) {
      values = valuesImmutable.toJS();
    }

    const {
      tags,
    } = values;

    const params = {
      taglist: tags,
      nodeId,
      nodeType,
    };

    const promise = action(params);
    return promise;
  }

  render() {
    const {
      nodeId, // node prop is invoked only on click; it won't update on updating on node topology
      nodes, // we need nodes from redux store to update modal when the tags are updated
      userDefinedTagStore,
    } = this.props;

    const selectedNodeIm = nodes.get(nodeId);
    const selectedNode = selectedNodeIm.toJS();
    const {metadata} = selectedNode;
    const metadataIndex = metadata.reduce((acc, meta) => {
      acc[meta.id] = meta.value;
      return acc;
    }, {});
    const tagsStr = metadataIndex.user_defined_tags;
    let tags = [];
    if (tagsStr) {
      tags = tagsStr.split(',');
    }

    const {
      [nodeId]: {
        addView: {
          message: addMessage,
          error: {
            message: addErrorMessage,
          } = {},
        } = {},
        deleteView: {
          message: deleteMessage,
          error: {
            message: deleteErrorMessage,
          } = {},
        } = {},
      } = {},
    } = userDefinedTagStore;

    return (
      <div className="user-defined-tags">
        <TagAddForm
          onSubmit={this.addUserDefinedTags}
        />
        {tagsStr && (
        <TagDeleteForm
          onSubmit={this.deleteUserDefinedTags}
          tags={tags}
        />
        )}
        {addMessage && <span>{addMessage}</span>}
        {deleteMessage && <span>{deleteMessage}</span>}
        {addErrorMessage && <span className="error-message">{addErrorMessage}</span>}
        {deleteErrorMessage && <span className="error-message">{deleteErrorMessage}</span>}
      </div>
    );
  }
}

const mapStateToProps = state => ({
  nodes: state.get('nodes'),
  userDefinedTagStore: state.get('userDefinedTags', Map()).toJS(),
});

export default connect(mapStateToProps, {
  addUserDefinedTagsAction,
  deleteUserDefinedTagsAction,
  clearUserDefinedTagsAction,
})(TagModal);
