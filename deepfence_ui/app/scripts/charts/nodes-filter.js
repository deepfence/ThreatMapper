/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { connect } from 'react-redux';
import { reduxForm, Field } from 'redux-form/immutable';
import DFSelectField from '../components/common/multi-select/app-searchable-field';
import {
  enumerateFiltersAction,
} from '../actions/app-actions';

const visibleFiltersPerType = {
  host: 'host_name,vulnerability_scan_status,kubernetes_cluster_name,pseudo',
  container: 'docker_container_state,vulnerability_scan_status,host_name,pseudo',
  container_image: 'vulnerability_scan_status,image_name,image_tag,pseudo',
};

const DEFAULT_FORM_ID = 'nodes-filter';

class NodesFilter extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.getFilters = this.getFilters.bind(this);
    this.renderOne = this.renderOne.bind(this);
  }

  getFilters(params = {}) {
    const {
      enumerateFiltersAction: action,
      // extraArgs are used to pass some specific information to the
      // API query params.
      extraArgs,
      formId
    } = this.props;

    const topologyId = params.currentTopologyNodeType || this.props.currentTopologyNodeType;
    const resourceType = params.resourceType || this.props.resourceType;
    const type = params.type || resourceType || topologyId;
    let apiparams = {
      node_type: topologyId,
      filters: visibleFiltersPerType[type],
      ...extraArgs,
      formId
    };
    // override node_type if resourceType is passed explicitly
    if (resourceType) {
      apiparams = {
        ...apiparams,
        node_type: '',
        resource_type: resourceType,
        formId
      };
    }
    return action(apiparams);
  }

  renderOne(filter) {
    const {
      something = '',
    } = this.props;
    // Hack to avoid field nesting by redux form.
    // Replacing dot with hyphen.
    const fieldName = filter.name.replace('.', '-');
    const {
      multi_select: isMulti = true,
    } = filter;
    if (filter.type === 'bool') {
      filter.options = [true, false];
    }
    return (
      <div className="nodes-filter-item" key={fieldName}>
        <Field
          something={something}
          name={fieldName}
          component={DFSelectField}
          options={filter.options.map(option => ({
            label: String(option),
            value: option,
          }))}
          buttonLabel={filter.label}
          placeholder="search"
          isMulti={isMulti}
          dropdownExpandDirection="left"
        />
      </div>
    );
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    const {
      currentTopologyNodeType,
      resourceType,
    } = this.props;

    const type = resourceType || currentTopologyNodeType;

    const {
      currentTopologyNodeType: newNodeType,
      resourceType: newResourceType,
    } = newProps;

    const newType = newResourceType || newNodeType;

    if (newType !== type) {
      this.getFilters({
        type: newType,
        resourceType: newResourceType,
        currentTopologyNodeType: newNodeType,
      });
    }
  }

  componentDidMount() {
    this.getFilters();
  }

  render() {
    const {
      topologyFilters: allFilters,
      currentTopologyNodeType,
      resourceType,
      formId
    } = this.props;

    const type = resourceType || currentTopologyNodeType;

    const topologyFilters = formId ? allFilters.getIn([type, formId], []) : allFilters.getIn([type], []);

    return (
      <div className="df-modal-form-slim">
        <form onSubmit={this.submitClickHandler}>
          <div className="nodes-filter">
            {topologyFilters && topologyFilters.map(filter => this.renderOne(filter))}
          </div>
        </form>
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  return {
    topologyFilters: state.getIn(['nodesView', 'topologyFilters']),
    currentTopologyNodeType: ownProps.nodeType || state.get('currentTopologyNodeType'),
    form: ownProps.formId ?? DEFAULT_FORM_ID,
  };
}


export default connect(mapStateToProps, {
  enumerateFiltersAction,
})(reduxForm({})(NodesFilter));
