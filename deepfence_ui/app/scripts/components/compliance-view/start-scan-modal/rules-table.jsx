import React from 'react';
import { connect } from 'react-redux';
import {
  getComplianceTestsAction,
  updateComplianceTestsAction,
  toaster,
  getComplianceRulesAction,
} from '../../../actions/app-actions';
import DFTable from '../../common/df-table/index';
import withMultiSelectColumn from '../../common/df-table/with-multi-select-column';

class RulesTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      filteredData: props.complianceRules?.rules,
      searchInput: '',
    };
    this.updateComplianceTests = this.updateComplianceTests.bind(this);
    this.enableRules = this.enableRules.bind(this);
    this.disableRules = this.disableRules.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.globalSearch = this.globalSearch.bind(this);
  }

  handleChange(event) {
    this.setState({ searchInput: event.target.value }, () => {
      this.globalSearch();
    });
  }

  globalSearch() {
    const { searchInput } = this.state;
    const data = this.props.complianceRules?.rules;
    if (searchInput) {
      const filteredData = data.filter(value =>
        value.test_desc.toLowerCase().includes(searchInput.toLowerCase())
      );
      this.setState({ filteredData });
    } else {
      this.setState({ filteredData: this.props.complianceRules?.rules });
    }
  }

  componentDidMount() {
    const { cloudType, checkType, nodeId } = this.props;
    this.props.dispatch(
      getComplianceRulesAction({
        cloudType,
        checkType,
        nodeId,
      })
    );
    const { registerActions } = this.props;
    const actionList = [
      {
        name: 'Enable',
        icon: <i className="fa fa-eye cursor" />,
        onClick: this.enableRules,
        postClickSuccess: this.getComplianceTests,
        showConfirmationDialog: false,
        confirmationDialogParams: {
          dialogTitle: 'Enable Rule?',
          dialogBody: 'Are you sure you want to Enable the selected rule?',
          confirmButtonText: 'Yes, Enable',
          cancelButtonText: 'No, Keep',
        },
      },
      {
        name: 'Disable',
        icon: <i className="fa fa-eye-slash cursor" />,
        onClick: this.disableRules,
        postClickSuccess: this.getComplianceTests,
        showConfirmationDialog: false,
        confirmationDialogParams: {
          dialogTitle: 'Disable Rule?',
          dialogBody: 'Are you sure you want to Disable the selected rule?',
          confirmButtonText: 'Yes, Disable',
          cancelButtonText: 'No, Keep',
        },
      },
    ];
    registerActions(actionList);
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    const { info: newInfo, error: newError, cloudType, checkType, nodeId } = newProps;
    if (this.props.checkType !== newProps.checkType) {
      this.props.dispatch(
        getComplianceRulesAction({
          cloudType,
          checkType,
          nodeId
        })
      );
    }
    const {
      info: currentInfo,
      error: currentError,
      toaster: toasterAction,
    } = this.props;

    if (newInfo || newError) {
      if (currentInfo !== newInfo) {
        toasterAction(newInfo);
      }
      if (currentError !== newError) {
        toasterAction(newError);
      }
    }
  }

  enableRules(selectedIndex) {
    const idList = Object.keys(selectedIndex);
    const idListInt = idList.map(i => Number(i));
    return this.updateComplianceTests('enable', idListInt);
  }

  disableRules(selectedIndex) {
    const idList = Object.keys(selectedIndex);
    const idListInt = idList.map(i => Number(i));
    return this.updateComplianceTests('disable', idListInt);
  }

  updateComplianceTests(action, idListInt) {
    const { complianceChecktype, nodeId } = this.props;
    const params = {
      action,
      node_id: nodeId,
      rule_id_list: idListInt,
      checkType: complianceChecktype,
    };
    const {
      updateComplianceTestsAction: updateAction,
      cloudType,
      checkType,
    } = this.props;
    return updateAction(params).then(
      this.props.dispatch(getComplianceRulesAction({ cloudType, checkType, nodeId }))
    );
  }

  render() {
    const {
      complianceRules = [],
      multiSelectColumn,
      checkType
    } = this.props;
    const { filteredData, searchInput } = this.state;
    let complianceSearchResults = [];
    if (searchInput) {
      complianceSearchResults = filteredData;
    } else {
      complianceSearchResults = complianceRules?.rules;
    }
    return (
      <>
        <div style={{
          marginTop: '16px',
          marginBottom: '16px',
        }}>
          <p>Configure Compliance Controls for {checkType?.toUpperCase()}</p>
          <input
            type="text"
            size="large"
            name="searchInput"
            value={searchInput || ''}
            onChange={this.handleChange}
            label="Search"
            placeholder="Search"
          />
        </div>
        <DFTable
          showPagination
          defaultPageSize={50}
          // eslint-disable-next-line max-len
          data={complianceSearchResults || []}
          minRows={0}
          style={{
            marginLeft: '-25px',
          }}
          getTrProps={(state, rowInfo) => ({
            style: {
              opacity: rowInfo && rowInfo.original.is_enabled ? 1 : 0.5,
            },
          })}

          columns={[
            {
              Header: '#',
              id: 'id',
              Cell: row => <div> {row.index + 1} </div>,
              maxWidth: 100,
            },
            {
              Header: 'Category',
              accessor: 'test_category',
              maxWidth: 250,
            },
            {
              Header: 'Description',
              accessor: 'test_desc',
              minWidth: 300,
            },
            {
              Header: 'Status',
              id: 'status',
              maxWidth: 100,
              accessor: row => {
                if (row.is_enabled) {
                  return 'Active';
                }
                return 'Inactive';
              },
            },
            multiSelectColumn,
          ]}
        />
      </>
    );
  }
}

const mapStateToProps = (state, { complianceChecktype }) => ({
  complianceRules: state.get('compliance_rules'),
  complianceTests: state.getIn(
    ['compliance', 'compliance_tests', 'data', complianceChecktype],
    []
  ),
  error: state.getIn([
    'compliance',
    'compliance_tests',
    'error',
    complianceChecktype,
  ]),
  info: state.getIn([
    'compliance',
    'compliance_tests',
    'info',
    complianceChecktype,
  ]),
});

export default connect(mapStateToProps, {
  getComplianceTestsAction,
  updateComplianceTestsAction,
  toaster,
})(
  withMultiSelectColumn({
    name: 'compliance-tests',
    column: {
      name: 'Action',
      accessor: 'id',
      maxWidth: 140,
    },
  })(RulesTable)
);
