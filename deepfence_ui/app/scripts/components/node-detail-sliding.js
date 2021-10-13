import React from 'react';

import SlidingPanel from 'react-sliding-side-panel';
import { NodeDetails } from './node-details';

export const NodeDetailSliding = ({ isOpen }) => (
  <SlidingPanel
    type="right"
    isOpen={isOpen}
    size={24}
    noBackdrop
    panelContainerClassName="slidingPanelContainer"
    panelClassName="slidingPanel"
  >
    <div style={{ justifyContent: 'space-between' }}>
      <NodeDetails />
    </div>
  </SlidingPanel>
);
