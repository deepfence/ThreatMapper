/* eslint-disable */
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DFTable from '../../common/df-table/index';
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

  const settingsList = useSelector(state => state.get('global_settings'));

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

  const renderFormModal = row => {
    let domainName = row.row.value;
    const id = row.row.id;
    const handleEditSubmit = e => {
      e.preventDefault();
      const params = {
        key: 'console_url',
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
              Domain Name
            </div>
            <div>
              <div>
                <input
                  id="domain_name"
                  type="text"
                  name="domain_name"
                  defaultValue={row.row.value}
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
      <DFTable
        data={settingsList}
        columns={[
          {
            Header: 'Setting',
            accessor: 'setting',
            Cell: row => (
              <div style={{ textAlign: 'centre', textTransform: 'uppercase' }}>
                {row.original.label}
                <span
                  style={{ marginLeft: '10px' }}
                  className="label-info fa fa-info-circle"
                  title={`${row.original.description}`}
                />
              </div>
            ),
          },
          {
            Header: 'Value',
            accessor: 'value',
            Cell: row => (
              <div style={{ textAlign: 'centre' }}>{row.original.value}</div>
            ),
          },
          {
            Header: 'Action',
            accessor: 'id',
            Cell: row => (
              <div className="action-control">
                <i
                  className="fa fa-pencil"
                  style={{ cursor: 'pointer', marginRight: '10px' }}
                  onClick={() => handleEditFile(row.original)}
                />
              </div>
            ),
            style: { textAlign: 'centre' },
            sortable: false,
          },
        ]}
      />
    </div>
  );
};

export default GlobalSettings;
