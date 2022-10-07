
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './agent-setup.module.scss';

export const AgentSetup = () => {
  return (
    <div className={styles.wrapper}>
      <div>
        <Link
          style={{
            cursor: 'pointer',
            color: 'white',
            marginBottom: 0,
          }}
          className="name heading"
          to="/onboard/cloud-agent/?host"
        >
          Docker Setup Instructions
        </Link>
      </div>
      <div>
        <Link
          style={{
            cursor: 'pointer',
            color: 'white',
            marginBottom: 0,
          }}
          className="name heading"
          to="/onboard/cloud-agent/?k8s"
        >
          K8s Setup Instructions
        </Link>
      </div>
    </div>
  )
}
