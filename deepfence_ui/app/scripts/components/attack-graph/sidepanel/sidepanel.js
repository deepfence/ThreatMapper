import { DialogContent, DialogOverlay } from '@reach/dialog';
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { animated, useTransition } from '@react-spring/web';
import { getAttackGraphNodeInfoAction } from '../../../actions/app-actions';
import { ShimmerLoaderRow } from '../../shimmer-loader/shimmer-row';
import styles from './sidepanel.module.scss';
import VulnerabilityIcon from '../../../../images/attack-graph-icons/attack_graph_vulnerability.svg';
import PostureIcon from '../../../../images/attack-graph-icons/attack_graph_posture.svg';
import SecretIcon from '../../../../images/attack-graph-icons/attack_graph_secret.svg';
import { getAssetIcon } from '../icons';

export const Sidepanel = props => {
  const {
    model: { id, nodeType },
    onDismiss,
    onStatClick,
  } = props;

  const [showDialog, setShowDialog] = useState(true);

  const dismissDialog = () => {
    setShowDialog(false);
  };

  const AnimatedDialogOverlay = animated(DialogOverlay);
  const AnimatedDialogContent = animated(DialogContent);

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

  const transitions = useTransition(showDialog, {
    from: { left: 0 },
    enter: { left: 500 },
    leave: { left: 0 },
    onDestroyed: () => {
      onDismiss();
    },
  });

  return transitions((transitionStyles, item) => {
    return (
      item && (
        <AnimatedDialogOverlay
          className={styles.reachOverlay}
          style={{
            left: transitionStyles.left.to(value => `calc(100vw - ${value}px)`),
          }}
          onDismiss={() => {
            dismissDialog();
          }}
          dangerouslyBypassScrollLock
        >
          <AnimatedDialogContent
            aria-label="details"
            className={styles.reachContent}
          >
            <DialogHeader
              title={
                nodeData?.label
                  ? `${nodeData?.label} (${
                      Object.keys(nodeData?.nodes ?? {})?.length
                    })`
                  : 'Loading...'
              }
              nodeType={nodeType}
              onCloseClick={() => {
                dismissDialog();
              }}
            />
            <DialogData
              nodeData={nodeData}
              nodeDataLoading={nodeDataLoading}
              onStatClick={onStatClick}
            />
          </AnimatedDialogContent>
        </AnimatedDialogOverlay>
      )
    );
  });
};

function DialogHeader({ title, onCloseClick, nodeType }) {
  return (
    <div className={styles.headerWrapper}>
      <span className={styles.titleWrapper}>
        <Icon nodeType={nodeType} size="28px" />
        {title}
      </span>
      <span className={styles.dismissBtn} onClick={onCloseClick}>
        <i className="fa fa-times" />
      </span>
    </div>
  );
}

const DialogData = ({ nodeData, nodeDataLoading, onStatClick }) => {
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
                <div
                  className={styles.stat}
                  onClick={() => {
                    node.top_exploitable = true;
                    onStatClick({
                      nodeData: node,
                      type: 'vulnerabilities',
                    });
                  }}
                >
                  <div className={styles.count}>
                    <img
                      src={VulnerabilityIcon}
                      className={styles.countIcon}
                      alt="vulnerability icon"
                    />
                    {node.vulnerability_count}
                  </div>
                  <div className={styles.label}>Vunlerabilities</div>
                </div>
              ) : null}
              {node?.compliance_count ? (
                <div
                  className={styles.stat}
                  onClick={() => {
                    onStatClick({
                      nodeData: node,
                      type: 'compliance',
                    });
                  }}
                >
                  <div className={styles.count}>
                    <img
                      src={PostureIcon}
                      className={styles.countIcon}
                      alt="compliance icon"
                    />
                    {node.compliance_count}
                  </div>
                  <div className={styles.label}>Compliance Issues</div>
                </div>
              ) : null}
              {node?.secrets_count ? (
                <div
                  className={styles.stat}
                  onClick={() => {
                    onStatClick({
                      nodeData: node,
                      type: 'secrets',
                    });
                  }}
                >
                  <div className={styles.count}>
                    <img
                      src={SecretIcon}
                      className={styles.countIcon}
                      alt="secrets icon"
                    />
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

const Icon = ({ nodeType, size }) => {
  return (
    <div
      style={{
        height: size,
        width: size,
      }}
      className={styles.iconWrapper}
    >
      <img src={getAssetIcon(nodeType)} className={styles.iconImage} alt="service icon" />
    </div>
  );
};
