/* eslint-disable arrow-body-style */
import React, { useState, useMemo, useCallback } from 'react';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { toaster } from "../../../actions/app-actions";
import styles from './body.module.scss';

export const ModalBody = ({ children }) => {
  return (
    <div className={styles.modalBodyWrapper}>
      {children}
    </div>
  );
}

const processKey = (key) => {
  key = key.replaceAll('@', '').replaceAll('_', ' ').split(' ').map((word) => {
    if (['cve', 'cvss', 'id'].includes(word.toLowerCase())) {
      return word.toUpperCase();
    }
    return word;
  }).join(' ');
  const firstLetter = key[0];
  return `${firstLetter.toUpperCase()}${key.slice(1)}`;
}

const stringifyValue = (value) => {
  if (typeof value === 'string') {
    value = value.trim();
    if (!value.length) return '-';
    return value;
  }
  if (typeof value === 'undefined') {
    return '-';
  }
  // try to stringify the value
  try {
    return JSON.stringify(value, null, 2);
  } catch (e) {
    console.error('cannot stringify value', value);
    return '-'
  }

}

const MAX_VAL_LEN = 40;
const KVPair = (props) => {
  const dispatch = useDispatch;
  const { k } = props;
  let { value } = props;
  value = stringifyValue(value);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const truncatedValue = useMemo(() => {
    if (value.length >= MAX_VAL_LEN) {
      setIsTruncated(true);
      return `${value.substring(0, MAX_VAL_LEN - 3)}...`;
    }
    return value;
  }, [value]);

  const copyToClipboard = useCallback(() => {
    navigator?.clipboard?.writeText(value).then(() => {
      dispatch(toaster('Value copied to clipboard'));
    }).catch((error) => {
      console.log(error);
      dispatch(toaster('ERROR: There was an error copying to the clipboard'));
    });
  }, []);

  return (
    <div className={styles.kvPairWrapper} style={{
      gridColumn: isTruncated ? '1 / span 3' : undefined
    }}>
      <div className={styles.kvPairTitle}>
        {processKey(k)}
        {
          isTruncated && !isExpanded ? (
            <i className='fa fa-expand' onClick={() => { setIsExpanded(true) }} />
          ) : null
        }
        {
          isTruncated && isExpanded ? (
            <i className='fa fa-compress' onClick={() => { setIsExpanded(false) }} />
          ) : null
        }
      </div>
      <div className={classNames(styles.kvPairValue, {
        [styles.codeValue]: isTruncated
      })}>
        {(isTruncated && isExpanded) || !isTruncated ? value : truncatedValue}
        <i className="fa fa-copy" onClick={copyToClipboard} />
      </div>
    </div>
  );
}

const LinksKVPair = ({ k, value }) => {
  if (!value) return null;
  return (<div className={styles.kvPairWrapper} style={{
    gridColumn: '1 / span 3'
  }}>
    <div className={styles.kvPairTitle}>
      {processKey(k)}
    </div>
    <div className={classNames(styles.kvPairValue, {
      [styles.codeValue]: true
    })}>
      {value}
    </div>
  </div>);
}


export const renderCorrelatedAlertLink = minimalAlert => {
  const docId = minimalAlert.doc_id;
  // check id docId present to make it into a link
  // else return the object as it is
  if (docId) {
    return (
      <div key={docId}>
        <Link className="link" target="_blank" to={`/alert/${docId}`}>
          {docId}
        </Link>
      </div>
    );
  }
  return null;
};

export const renderAlertLink = link => (
  <a href={`${link}`} className="link" target="_blank" rel="noreferrer" >
    {link}
  </a>
);


// data is an array of keys and values
export const KeyValueContent = ({ data, topRightVisualization }) => {
  return (
    <div className={styles.kvPairsWrapper}>
      {
        data && data.length ? (
          data.map((kvPair) => {
            if (kvPair.key === 'correlated_alerts') return <LinksKVPair k={kvPair.key} value={kvPair.value?.length ? kvPair.value.map((minimalAlert) => renderCorrelatedAlertLink(minimalAlert)) : '-'} key={kvPair.key} />;
            if (kvPair.key === 'ip_reputation') return <LinksKVPair k={kvPair.key} value={kvPair.value ? renderAlertLink(kvPair.value) : '-'} key={kvPair.key} />;
            // eslint-disable-next-line react/jsx-no-duplicate-props
            return <KVPair k={kvPair.key} value={kvPair.value} key={kvPair.key} />
          })
        ) : null
      }
      {
        topRightVisualization ? (
          <div className={styles.topRightVisualizationWrapper}>
            <div className={styles.kvPairTitle}>{topRightVisualization.title}</div>
            <div>{topRightVisualization.visualization}</div>
          </div>
        ) : null
      }
    </div>
  )
}


export const Severiety = ({
  severiety,
  text
}) => {
  return <div className={classNames(styles.severiety, `modal-${severiety}`)}>{text ?? severiety}</div>
}
