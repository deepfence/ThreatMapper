/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React from 'react';
import { useDispatch } from 'react-redux';
import Tippy from '@tippyjs/react';
import { dateTimeFormat } from '../../utils/time-utils';
import { DfTableV2 } from '../common/df-table-v2';
import {
  deleteScanActions,
  showModal,
  toaster,
} from '../../actions/app-actions';
import NotificationToaster from '../common/notification-toaster/notification-toaster';
import MORE_IMAGE from '../../../images/more.svg';

const SecretScanImageReportDetails = props => {
  const dispatch = useDispatch();

  const handleDeleteDialogScans = scanId => {
    const params = {
      dialogTitle: 'Delete Results ?',
      dialogBody: 'Are you sure you want to delete?',
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      onConfirmButtonClick: () => deleteScan(scanId),
      contentStyles: {
        width: '375px',
      },
    };
    dispatch(showModal('DIALOG_MODAL', params));
  };

  const deleteScan = scanId => {
    const params = {
      scan_id: scanId,
      doc_type: 'secret-scan',
      time_unit: 'all',
      number: '0',
    };
    const successHandler = response => {
      const { success, error: apiError } = response;
      if (success) {
        dispatch(toaster('Successfully deleted'));
        setTimeout(props.onDelete, 2000);
      } else {
        dispatch(toaster(`ERROR: ${apiError.message}`));
      }
    };
    const apiErrorHandler = () => {
      dispatch(toaster('Something went wrong'));
    };
    return dispatch(deleteScanActions(params)).then(
      successHandler,
      apiErrorHandler
    );
  };

  const { data, rowClickHandler, isToasterVisible } = props;

  return (
    <div>
      <DfTableV2
        data={data}
        onRowClick={row => rowClickHandler(row.original.scan_id)}
        enableSorting
        columns={[
          {
            Header: '',
            accessor: 'scan_message',
            minWidth: 178,
            Cell: row => (
              <div className="truncate" title={row.value}>
                {row.value}
              </div>
            ),
          },
          {
            Header: 'Timestamp',
            accessor: row => dateTimeFormat(row.time_stamp),
            id: 'timestamp',
          },
          {
            Header: 'Status',
            accessor: 'scan_status',
            minWidth: 120,
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
            Header: 'Active Containers',
            accessor: 'active_containers',
            maxWidth: 120,
            sortType: 'number',
          },
          {
            Header: 'Total',
            accessor: 'total',
            maxWidth: 80,
            sortType: 'number',
          },
          {
            Header: 'High',
            accessor: 'severity.high',
            Cell: row => (
              <div>
                <div className="cve-severity-box-wrap-high value">
                  {row.value || 0}
                </div>
              </div>
            ),
            maxWidth: 80,
            sortType: 'number',
          },
          {
            Header: 'Medium',
            accessor: 'severity.medium',
            Cell: row => (
              <div>
                <div className="cve-severity-box-wrap-medium value">
                  {row.value || 0}
                </div>
              </div>
            ),
            maxWidth: 80,
            sortType: 'number',
          },
          {
            Header: 'Low',
            accessor: 'severity.low',
            Cell: row => (
              <div>
                <div className="cve-severity-box-wrap-low value">
                  {row.value || 0}
                </div>
              </div>
            ),
            maxWidth: 80,
            sortType: 'number',
          },
          {
            Header: '',
            width: 60,
            accessor: 'scan_id',
            disableSortBy: true,
            Cell: cell => (
              <Tippy
                arrow
                interactive
                trigger="click"
                hideOnClick
                placement="bottom"
                zIndex={1}
                allowHTML
                content={
                  <div className="table-row-actions-popup">
                    <i
                      className="fa fa-lg fa-trash-o"
                      style={{ color: 'red' }}
                      onClick={ev => {
                        ev.stopPropagation();
                        handleDeleteDialogScans(cell.value);
                      }}
                    />
                  </div>
                }
              >
                <img
                  src={MORE_IMAGE}
                  alt="more"
                  className="table-row-actions-target"
                  onClick={e => {
                    e.stopPropagation();
                  }}
                />
              </Tippy>
            ),
          },
        ]}
      />
      {isToasterVisible && <NotificationToaster />}
    </div>
  );
};

export default SecretScanImageReportDetails;
