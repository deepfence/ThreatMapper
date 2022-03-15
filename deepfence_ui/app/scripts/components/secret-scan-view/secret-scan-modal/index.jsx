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

export const SecretScanModal = ({ data, onRequestClose }) => {
  let source = data?._source?._source;
  source = { ...source, ...source?.Match, severity_level: source?.Severity?.level, severity_score: source?.Severity?.score }
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
            key: <div>Rule</div>,
            value: <div className="truncate">{source?.Rule?.name ?? ''}</div>,
            valueAsText: source?.Rule?.name ?? '',
          },
          {
            key: <div>Severity</div>,
            value: (
              <Severiety
                severiety={source?.Severity?.level?.toLowerCase?.() ?? ''}
              />
            ),
            valueAsText: source?.Severity?.level?.toLowerCase?.() ?? '',
          },
          {
            key: <div>Last Seen At</div>,
            value: (
              <div>
                {source['@timestamp']
                  ? moment(source['@timestamp']).fromNow()
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
                  'time_stamp',
                  'relative_ending_index',
                  'relative_starting_index',
                  'starting_index',
                  'Severity'
                ],
                [
                  'host_name',
                  'node_type',
                  'node_name',
                  'full_filename',
                  'matched_content',
                  'severity_level',
                  'severity_score',
                  'Rule',
                  'node_id',
                  'scan_id'
                ]
              )}
            />
          </div>
        </div>
      </ModalBody>
    </DetailModal>
  );
};
