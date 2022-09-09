import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import Tippy from '@tippyjs/react';
import { useDispatch, useSelector } from 'react-redux';
import RulesTable from './rules-table';
import styles from './styles.module.scss';
import {
  hideModal,
  startComplianceScanAction,
  toaster,
  complianceScheduleScanAction,
  clearStartComplianceScanErrrorAction,
} from '../../../actions/app-actions';

export const StartScanModalContent = props => {
  const { cloudType, nodeId } = props;
  const [selectedCheckTypeIds, setSelectedCheckTypeIds] = useState([]);
  const [activeCheckTypeId, setActiveCheckTypeId] = useState(null);
  const [intervalValue, setIntervalValue] = useState('');
  const dispatch = useDispatch();

  const { scanMessage, scheduleScanMessage, scanErrorMessage, ScheduledScanErrorMessage } = useSelector(state => {
    return {
      scanMessage: state.get('compliance_start_scan'),
      scheduleScanMessage: state.get('compliance_schedule_scan'),
      scanErrorMessage: state.get('compliance_start_scan_error'),
      ScheduledScanErrorMessage: state.get('compliance_schedule_scan_error'),
    };
  });

  useEffect(() => {
    if (scanMessage) {
      dispatch(toaster(scanMessage));
      dispatch(hideModal());
      dispatch(clearStartComplianceScanErrrorAction());
    }
  }, [scanMessage]);

  useEffect(() => {
    if (scheduleScanMessage) {
      dispatch(toaster(scheduleScanMessage));
      dispatch(hideModal());
      dispatch(clearStartComplianceScanErrrorAction());
    }
  }, [scheduleScanMessage]);

  const startScan = () => {
    if (selectedCheckTypeIds.length) {
      dispatch(
        startComplianceScanAction({
          cloudType,
          nodeId,
          checkTypes: selectedCheckTypeIds,
        })
      );
    }
  };

  const startScheduledScan = () => {
    if (selectedCheckTypeIds.length && intervalValue.length) {
      dispatch(
        complianceScheduleScanAction({
          cloudType,
          nodeId,
          checkTypes: selectedCheckTypeIds,
          scheduleScanIntervel: intervalValue,
        })
      );
    }
  };

  return (
    <div className={styles.modalContentWrapper}>
      {
        scanErrorMessage || ScheduledScanErrorMessage ? (
          <div className={styles.errorMessage}>
            {scanErrorMessage || ScheduledScanErrorMessage}
          </div>
        ) : null
      }
      <div className={styles.tabFormWrapper}>
        <ComplianceTypeTabs
          cloudType={cloudType}
          selectedCheckTypeIds={selectedCheckTypeIds}
          setSelectedCheckTypeIds={setSelectedCheckTypeIds}
          activeCheckTypeId={activeCheckTypeId}
          setActiveCheckTypeId={setActiveCheckTypeId}
        />
        <div className={styles.scanButtonsWrapper}>
          <input
            type="number"
            id="schedule_scan"
            name="Schedule Scan"
            min={1}
            placeholder="Scan Interval in days (optional)"
            value={intervalValue}
            onChange={e => {
              setIntervalValue(e.target.value);
            }}
          />
          <button
            className="primary-btn large"
            type="submit"
            disabled={!intervalValue.length || !selectedCheckTypeIds.length}
            onClick={e => {
              e.preventDefault();
              startScheduledScan();
            }}
          >
            Start Schedule Scan
          </button>
          <button
            disabled={!selectedCheckTypeIds.length}
            className="primary-btn large"
            type="submit"
            onClick={e => {
              e.preventDefault();
              startScan();
            }}
          >
            Start Scan
          </button>
        </div>
      </div>
      {activeCheckTypeId ? (
        <RulesTable
          checkType={activeCheckTypeId}
          cloudType={cloudType}
          nodeId={nodeId}
        />
      ) : (
        <NoSelectionText />
      )}
    </div>
  );
};

export const ComplianceTypeTabs = props => {
  const {
    selectedCheckTypeIds,
    setSelectedCheckTypeIds,
    activeCheckTypeId,
    setActiveCheckTypeId,
  } = props;
  const { cloudType } = props;
  const checks = checkTypes[cloudType];
  const dropdownChecks = checks.filter(
    check => !selectedCheckTypeIds.includes(check.id)
  );
  const tabs = selectedCheckTypeIds.map(selectedCheckTypeId => {
    return checks.find(check => check.id === selectedCheckTypeId);
  });

  return (
    <div className={styles.tabsWrapper}>
      {tabs.map(check => {
        return (
          <div
            className={classNames(styles.tabWrapper, {
              [styles.active]: check.id === activeCheckTypeId,
            })}
            key={check.id}
            onClick={() => {
              setActiveCheckTypeId(check.id);
            }}
          >
            <div>{check.displayName}</div>
            <button
              type="button"
              className={classNames(
                styles.removeTabButton,
                styles.unstyledButton
              )}
              onClick={e => {
                e.stopPropagation();
                setSelectedCheckTypeIds(prev => {
                  return prev.filter(id => id !== check.id);
                });
                setActiveCheckTypeId(prev => {
                  if (prev === check.id) {
                    return tabs.find(tab => tab.id !== check.id)?.id ?? null;
                  }
                  return prev;
                });
              }}
            >
              <i className={classNames('fa fa-times')} />
            </button>
          </div>
        );
      })}
      {dropdownChecks.length ? (
        <div className={styles.addTabButtonWrapper}>
          <Tippy
            interactive
            trigger="click"
            hideOnClick
            placement="right-end"
            zIndex={1}
            allowHTML
            content={
              <div className={styles.scanTypeSelectWrapper}>
                {dropdownChecks.map(check => {
                  return (
                    <div
                      key={check.id}
                      className={styles.scanTypeSelectItem}
                      onClick={() => {
                        setSelectedCheckTypeIds(prev => {
                          return [...prev, check.id];
                        });
                        setActiveCheckTypeId(prev => {
                          if (prev) return prev;
                          return check.id;
                        });
                      }}
                    >
                      {check.displayName}
                    </div>
                  );
                })}
              </div>
            }
          >
            <button
              type="button"
              className={classNames(styles.addTabButton, styles.unstyledButton)}
            >
              <i className={classNames('fa fa-plus')} />
              &nbsp; Add
            </button>
          </Tippy>
        </div>
      ) : null}
    </div>
  );
};

const NoSelectionText = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '250px',
      }}
    >
      Please select at-least one check type using &quot;Add&quot; button above.
    </div>
  );
};

const checkTypes = {
  aws: [
    {
      id: 'cis',
      displayName: 'CIS',
    },
    {
      id: 'gdpr',
      displayName: 'GDPR',
    },
    {
      id: 'hipaa',
      displayName: 'HIPAA',
    },
    {
      id: 'pci',
      displayName: 'PCI',
    },
    {
      id: 'soc2',
      displayName: 'SOC2',
    },
    {
      id: 'nist',
      displayName: 'NIST',
    },
  ],
  azure: [
    {
      id: 'cis',
      displayName: 'CIS',
    },
    {
      id: 'hipaa',
      displayName: 'HIPAA',
    },
    {
      id: 'nist',
      displayName: 'NIST',
    },
  ],
  linux: [
    {
      id: 'hipaa',
      displayName: 'HIPAA',
    },
    {
      id: 'gdpr',
      displayName: 'GDPR',
    },
    {
      id: 'pci',
      displayName: 'PCI',
    },
    {
      id: 'nist',
      displayName: 'NIST',
    },
  ],
  kubernetes: [
    {
      id: 'cis',
      displayName: 'CIS',
    },
  ],
  gcp: [
    {
      id: 'cis',
      displayName: 'CIS',
    },
  ],
};
