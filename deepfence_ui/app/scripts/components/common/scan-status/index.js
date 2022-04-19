import React from 'react';
import Tippy from '@tippyjs/react';

const humanizeString = str => str.replace(/(_)/g, ' ').replace(/^./, st => st.toUpperCase());
export const ScanStatus = ({ status, tooltipText }) => {
  const humanString = status ? humanizeString(status) : '';
  let label = '';
  if (status) {
    switch (status) {
      case 'running':
      case 'queued':
      case 'in_progress':
        label = <span className="scan-status running">{humanString}</span>;
        break;
      case 'never_scanned':
        label = <span className="scan-status never-scanned ">{humanString}</span>;
        break;
      case 'error':
        label = <span className="scan-status error">{humanString}</span>;
        break;
      case 'complete':
        label = <span className="scan-status complete">{humanString}</span>;
        break;
      default:
        label = <span className="scan-status error">{humanString}</span>;
        break;
    }
  }

  if (tooltipText) {
    return (
      <Tippy content={tooltipText} trigger="mouseenter">
        {label}
      </Tippy>
    );
  }

  return label;
};
