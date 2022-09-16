/* eslint-disable react/no-unused-state */
import React from 'react';
import { DfTableV2 } from '../common/df-table-v2';
import { dateTimeFormat } from '../../utils/time-utils';
import {
  showModal,
  deleteScanActions,
  toaster,
} from '../../actions/app-actions';
import NotificationToaster from '../common/notification-toaster/notification-toaster';

class HostReportRowDetail extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { tableAction: false, cellValue: 0, page: 0 };
    this.handleDeleteDialogScans = this.handleDeleteDialogScans.bind(this);
    this.deleteScanActions = this.deleteScanActions.bind(this);
    this.handleActionEditDelete = this.handleActionEditDelete.bind(this);
    this.tableChangeHandler = this.tableChangeHandler.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
  }

  tableChangeHandler(params = {}) {
    // pollable: on any change in the DF Table params, update the polling params,
    // which will update and restart polling with new params.
    const { updatePollParams } = this.props;
    updatePollParams(params);
  }

  handlePageChange(pageNumber) {
    this.setState({ page: 0 }, () => {
      this.tableChangeHandler({
        page: pageNumber,
      });
    });
  }

  handleDeleteDialogScans(scanId) {
    const params = {
      dialogTitle: 'Delete Results ?',
      dialogBody: 'Are you sure you want to delete?',
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      onConfirmButtonClick: () => this.deleteScanActions(scanId),
      contentStyles: {
        width: '375px',
      },
    };
    this.props.dispatch(showModal('DIALOG_MODAL', params));
  }

  handleActionEditDelete(cellID) {
    this.setState(prev => {
      return {
        tableAction: !prev.tableAction,
        cellValue: cellID,
      };
    });
  }

  handleResetEditDeleteActionState() {
    this.setState({
      tableAction: false,
      cellValue: 0,
    });
  }

  deleteScanActions(scanId) {
    const params = {
      scan_id: scanId,
      doc_type: 'compliance',
      time_unit: 'all',
      number: '0',
    };
    const successHandler = response => {
      const { success, error: apiError } = response;
      if (success) {
        this.props.dispatch(toaster('Successfully deleted'));
        setTimeout(this.props.onDelete, 2000);
      } else {
        this.props.dispatch(toaster(`ERROR: ${apiError.message}`));
      }
    };
    const apiErrorHandler = () => {
      this.props.dispatch(toaster('Something went wrong'));
    };
    return this.props
      .dispatch(deleteScanActions(params))
      .then(successHandler, apiErrorHandler);
  }

  render() {
    const {
      data,
      testValueColumns,
      rowClickHandler,
      handleDownload,
      isToasterVisible,
      scanType,
      totalRows,
    } = this.props;
    return (
      <div style={{ paddingTop: '64px' }}>
        <DfTableV2
          page={this.state.page}
          data={data}
          showPagination
          totalRows={totalRows}
          defaultPageSize={10}
          onPageChange={this.handlePageChange}
          manual
          onRowClick={row => {
            rowClickHandler(
              row.original.node_id,
              row.original.scan_id,
              scanType
            );
          }}
          columns={[
            {
              Header: 'Timestamp',
              accessor: row => dateTimeFormat(row.time_stamp),
              id: 'timestamp',
            },
            {
              Header: 'Status',
              accessor: 'scan_status',
              Cell: cell => (
                <div
                  className={
                    cell.value === 'COMPLETED'
                      ? 'status-success'
                      : 'status-failed'
                  }
                >
                  {cell.value}
                </div>
              ),
            },
            {
              Header: 'Compliance %',
              id: 'compliancePercentage',
              maxWidth: 40,
              width: 40,
              minWidth: 40,
              Cell: row => {
                return (
                  <div>
                    {row.row?.original?.result?.compliance_percentage
                      ? Number(
                          row.row?.original?.result?.compliance_percentage
                        )?.toFixed?.(0)
                      : '0'}
                    %
                  </div>
                );
              },
            },
            ...testValueColumns,
            {
              Header: '',
              maxWidth: 40,
              width: 40,
              minWidth: 40,
              accessor: 'scan_id',
              Cell: cell => (
                <div>
                  <i
                    className="fa fa-download"
                    style={{ marginRight: '10px' }}
                    onClick={e => {
                      e.stopPropagation();
                      handleDownload(cell.value, scanType);
                    }}
                  />
                  <i
                    className="fa fa-trash-o red cursor"
                    onClick={e => {
                      e.stopPropagation();
                      this.handleDeleteDialogScans(cell.value);
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
        {isToasterVisible && <NotificationToaster />}
      </div>
    );
  }
}

export default HostReportRowDetail;
