/* eslint-disable no-nested-ternary */
/* eslint-disable no-unused-vars */
/* eslint-disable arrow-body-style */
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import moment from 'moment';
import { DetailModal } from '../../common/detail-modal';
import { DetailModalHeader } from '../../common/detail-modal/header';
import {
  KeyValueContent,
  ModalBody,
  Severiety,
} from '../../common/detail-modal/body';
import styles from './index.module.scss';
import { toaster } from '../../../actions/app-actions';
import { convertDocumentToKeyValuePairs } from '../../common/detail-modal/utils';

export const ComplianceTestModal = ({ data, onRequestClose }) => {
  const source = data;
  const dispatch = useDispatch();

  const copyToClipboard = useCallback(() => {
    navigator?.clipboard
      ?.writeText(JSON.stringify(source))
      .then(() => {
        dispatch(toaster('JSON copied to clipboard'));
      })
      .catch(error => {
        console.log(error);
        dispatch(toaster('ERROR: There was an error copying to the clipboard'));
      });
  }, []);

  return (
    <DetailModal isOpen onRequestClose={onRequestClose}>
      <DetailModalHeader
        onRequestClose={onRequestClose}
        data={[
          {
            key: <div>{source?.reason ? 'Reason' : 'Description'}</div>,
            value: source?.reason || source.description,
            valueAsText: source?.reason ?? '',
          },
          {
            key: <div>Status</div>,
            value: (
              <Severiety
                severiety={
                  source?.status === 'alarm'
                    ? 'critical'
                    : source?.status === 'warn'
                    ? 'critical'
                    : source?.status === 'ok'
                    ? 'pass'
                    : source?.status === 'pass'
                    ? 'pass'
                    : source?.status === 'skip'
                    ? 'medium'
                    : source?.status === 'note'
                    ? 'medium'
                    : 'low'
                }
                text={source?.status}
              />
            ),
            valueAsText: source?.status ?? '',
          },
          {
            key: <div>Timestamp</div>,
            value: (
              <div>
                {source?.['@timestamp']
                  ? moment(source?.['@timestamp']).fromNow()
                  : ''}
              </div>
            ),
            valueAsText: source?.['@timestamp'] ?? '',
          },
        ]}
        actions={[
          {
            title: 'Copy as JSON',
            onClick: copyToClipboard,
            label: 'Copy as JSON',
            icon: <i className="fa fa-copy" />,
          },
        ]}
      />
      <ModalBody>
        <div className={styles.modalBodyColumnsWrapper}>
          <div className={styles.modalBodyColumn}>
            <KeyValueContent
              data={convertDocumentToKeyValuePairs(
                source,
                [
                  '@timestamp',
                  '@version',
                  'doc_id',
                  'date',
                  'status',
                  'time_stamp',
                ],
                ['type', 'compliance_check_type', 'test_category']
              )}
            />
          </div>
        </div>
      </ModalBody>
    </DetailModal>
  );
};
