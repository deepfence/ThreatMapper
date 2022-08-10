import React from 'react';
import { connect} from 'react-redux';
import {formValueSelector} from 'redux-form/immutable';
import ComplianceTests from './tests';

class ComplianceTestsContainer extends React.PureComponent {
  render() {
    const {
      nodeId, checkType, hideMasked, ...rest
    } = this.props;
    return (
      <ComplianceTests
        hideMasked={hideMasked}
        {...rest}
      />
    );
  }
}

const maskFormSelector = formValueSelector('compliance-mask-filter-form');

function mapStateToProps(state) {
  const testList = state.getIn(['compliance', 'list_view']);
  return {
    testList,
    hideMasked: maskFormSelector(state, 'hideMasked'),
  };
}

export default connect(mapStateToProps)(ComplianceTestsContainer);
