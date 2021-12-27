/* eslint-disable */
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ReactTooltip from 'react-tooltip';
import { DfTableV2 } from '../../common/df-table-v2';
import {
  getGlobalSettingsAction,
  addGlobalSettingsAction,
  showModal,
  hideModal,
} from '../../../actions/app-actions';

const GlobalSettings = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getGlobalSettingsAction());
  }, []);

  const settingsList = useSelector(state => state.get('global_settings')) || [];
  const handleEditFile = row => {
    const modalProps = {
      title: 'Edit Setting',
      modalContent: renderFormModal,
      modalContentProps: { row },
      contentStyles: {
        width: '400px',
      },
    };
    dispatch(showModal('GENERIC_MODAL', modalProps));
  };

  const renderFormModal = ({ row }) => {
    let domainName = row.row.original.value;
    const id = row.row.original.id;
    const handleEditSubmit = e => {
      e.preventDefault();
      const params = {
        key: row.row.original.key,
        value: domainName,
        id,
      };
      dispatch(addGlobalSettingsAction(params));
      dispatch(hideModal());
      dispatch(getGlobalSettingsAction());
    };

    const handleFormChange = e => {
      e.preventDefault();
      domainName = e.target.value;
    };
    return (
      <div>
        <form className="df-modal-form clustering-rule" autoComplete="off">
          <div className="form-field">
            <div className="label" for="domain_name">
              {row.row.original.label}
            </div>
            <div>
              <div>
                <input
                  id="domain_name"
                  type="text"
                  name="domain_name"
                  defaultValue={row.row.original.value}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            <div className="form-field" style={{ marginTop: '2rem' }}>
              <button
                className="primary-btn"
                type="submit"
                onClick={e => handleEditSubmit(e)}
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div style={{ paddingTop: '40px' }}>
      <DfTableV2
        data={settingsList}
        columns={[
          {
            Header: 'Setting',
            accessor: 'label',
            Cell: row => {
              return (
                <div style={{ textAlign: 'centre', textTransform: 'uppercase' }}>
                  {row.value}
                  <span
                    data-tip
                    data-event='click focus'
                    data-for="settings-info"
                    style={{ marginLeft: '10px' }}
                    className="label-info fa fa-info-circle"
                  />
                  <ReactTooltip globalEventOff='click' id="settings-info" type= 'dark' effect= 'solid' place= 'bottom'>
                    {`${row.row.original.description}`}
                  </ReactTooltip>
                </div>
              );
            },
          },
          {
            Header: 'Value',
            accessor: 'value',
            Cell: row => (
              <div style={{ textAlign: 'centre' }}>{row.value}</div>
            ),
          },
          {
            Header: 'Action',
            accessor: 'id',
            disableSortBy: true,
            Cell: row => (
              <div className="action-control">
                <i
                  className="fa fa-pencil"
                  style={{ cursor: 'pointer', marginRight: '10px' }}
                  onClick={() => handleEditFile(row)}
                />
              </div>
            ),
            style: { textAlign: 'centre' },
          },
        ]}
        enableSorting
      />
    </div>
  );
};

export default GlobalSettings;
