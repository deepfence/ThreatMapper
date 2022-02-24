/* eslint-disable no-unused-vars */
/* eslint-disable arrow-body-style */
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import moment from 'moment';
import { DetailModal } from '../../common/detail-modal';
import { DetailModalHeader } from '../../common/detail-modal/header';
import { KeyValueContent, ModalBody, Severiety } from '../../common/detail-modal/body';
import styles from './index.module.scss';
import { toaster } from "../../../actions/app-actions";
import { convertDocumentToKeyValuePairs } from '../../common/detail-modal/utils';


export const SecretScanModal = ({
  data,
  onRequestClose,
}) => {
  const source = data._source;
  const dispatch = useDispatch();

  const copyToClipboard = useCallback(() => {
    navigator?.clipboard?.writeText(JSON.stringify(source)).then(() => {
      dispatch(toaster('JSON copied to clipboard'));
    }).catch((error) => {
      console.log(error);
      dispatch(toaster('ERROR: There was an error copying to the clipboard'));
    });
  }, []);

  return (
    <DetailModal isOpen onRequestClose={onRequestClose}>
      <DetailModalHeader
        onRequestClose={onRequestClose}
        data={[{
          key: <div>ID</div>,
          value: <div className="truncate">{source?._id}</div>,
          valueAsText: source?._id ?? ''
        }, {
          key: <div>Severity</div>,
          value: <Severiety severiety={source?._source.Severity.level.toLowerCase()} />,
          valueAsText: source?._source.Severity.level ?? ''
        }, {
          key: <div>Last Seen At</div>,
          value: <div>{source?._source['@timestamp'] ? moment(source?._source['@timestamp']).fromNow() : ''}</div>,
          valueAsText: source?._source['@timestamp'] ?? ''
        }]}
        actions={[
          {
            title: 'Copy as JSON',
            onClick: copyToClipboard,
            label: 'Copy as JSON',
            icon: <i className='fa fa-copy' />
          }
        ]}
      />
      <ModalBody>
        <div className={styles.modalBodyColumnsWrapper}>
          <div className={styles.modalBodyColumn}>
            <KeyValueContent data={convertDocumentToKeyValuePairs(source, 
            ['@timestamp', '_type', '_score', 'sort'], 
            [
            ])}
            />
          </div>
        </div>
      </ModalBody>
    </DetailModal>
  )
}

