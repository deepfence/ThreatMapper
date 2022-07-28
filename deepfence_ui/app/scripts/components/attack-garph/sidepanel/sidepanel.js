import { DialogContent, DialogOverlay } from '@reach/dialog';
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAttackGraphNodeInfoAction } from '../../../actions/app-actions';
import { ShimmerLoaderRow } from '../../shimmer-loader/shimmer-row';
import styles from './sidepanel.module.scss';
import S3Icon from '../../../../images/cloud-icons/aws/Res_Amazon-Simple-Storage-Service_Bucket_48_Dark.svg';
import BugIcon from '../../../../images/attack-graph-icons/attack_graph_bug.svg';
import ChecklistIcon from "../../../../images/attack-graph-icons/attack_graph_checklist.svg";
import PasswordIcon from "../../../../images/attack-graph-icons/attack_graph_password.svg";

export const Sidepanel = props => {
  const {
    model: { id },
    onDismiss,
  } = props;
  const dispatch = useDispatch();

  const { nodeData, nodeDataLoading } = useSelector(state => {
    return {
      nodeData: state.getIn(['attackGraph', 'nodeInfo', id, 'data'], null),
      nodeDataLoading: state.getIn(
        ['attackGraph', 'nodeInfo', id, 'loading'],
        true
      ),
    };
  });


  useEffect(() => {
    if (id) {
      dispatch(
        getAttackGraphNodeInfoAction({
          nodeId: id,
        })
      );
    }
  }, [id]);

  return (
    <DialogOverlay
      className={styles.reachOverlay}
      isOpen
      onDismiss={() => {
        onDismiss();
      }}
      dangerouslyBypassScrollLock
    >
      <DialogContent className={styles.reachContent} aria-label="test">
        <DialogHeader
          title={nodeData?.label ? `${nodeData?.label} (${Object.keys(nodeData?.nodes ?? {})?.length})` : 'Loading...'}
          onCloseClick={() => {
            onDismiss();
          }}
        />
        <DialogData nodeData={nodeData} nodeDataLoading={nodeDataLoading} />
      </DialogContent>
    </DialogOverlay>
  );
};

function DialogHeader({ title, onCloseClick }) {
  return (
    <div className={styles.headerWrapper}>
      <span className={styles.titleWrapper}>
        <Icon resourceId="TODO" size="28px" />
        {title}
      </span>
      <span className={styles.dismissBtn} onClick={onCloseClick}>
        <i className="fa fa-times" />
      </span>
    </div>
  );
}

const DialogData = ({ nodeData, nodeDataLoading }) => {
  if (nodeDataLoading) {
    return (
      <div className={styles.contentWrapper}>
        <ShimmerLoaderRow numberOfRows={3} />
      </div>
    );
  }

  if (!nodeData) {
    return (
      <div className={styles.contentWrapper}>
        Error getting resource details. Please try again later.
      </div>
    );
  }
  return (
    <div className={styles.contentWrapper}>
      {Object.keys(nodeData?.nodes ?? {})?.map?.((nodeKey, index) => {
        const node = nodeData.nodes?.[nodeKey];
        return (
          <div key={nodeKey} className={styles.assetCardWrapper}>
            {index !== 0 ? <hr className={styles.assetCardSeparator} /> : null}
            <div className={styles.assetCardTitle}>{node?.name}</div>
            {node?.image_name ? (
              <div
                className={styles.assetCardSubTitle}
                title={node?.image_name}
              >
                Image: {node?.image_name}
              </div>
            ) : null}
            {node?.node_id ? (
              <div className={styles.assetCardSubTitle} title={node?.node_id}>
                {node?.node_id}
              </div>
            ) : null}
            <div className={styles.statsWrapper}>
              {node?.vulnerability_count ? (
                <div className={styles.stat}>
                  <div className={styles.count}>
                    <img src={BugIcon} className={styles.countIcon} alt="vulnerability icon" />
                    {node.vulnerability_count}
                  </div>
                  <div className={styles.label}>Vunlerabilities</div>
                </div>
              ) : null}
              {node?.compliance_count ? (
                <div className={styles.stat}>
                  <div className={styles.count}>
                    <img src={ChecklistIcon} className={styles.countIcon} alt="compliance icon" />
                    {node.compliance_count}
                  </div>
                  <div className={styles.label}>Compliance Issues</div>
                </div>
              ) : null}
              {node?.secrets_count ? (
                <div className={styles.stat}>
                  <div className={styles.count}>
                    <img src={PasswordIcon} className={styles.countIcon} alt="secrets icon" />
                    {node.secrets_count}
                  </div>
                  <div className={styles.label}>Secrets</div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Icon = ({ resourceId, size }) => {
  return (
    <div
      style={{
        height: size,
        width: size,
      }}
      className={styles.iconWrapper}
    >
      <img src={S3Icon} className={styles.iconImage} alt="service icon" />
    </div>
  );
};
