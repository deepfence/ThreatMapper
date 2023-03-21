import { truncate } from 'lodash-es';

import { DetailedNodeSummary } from '@/api/generated';
import CloudLogo from '@/assets/topology/cloud.png';
import CloudRegionLogo from '@/assets/topology/cloud-region.png';
import ContainerLogo from '@/assets/topology/container.png';
import HostLogo from '@/assets/topology/host.png';
import KubernetesClusterLogo from '@/assets/topology/kubernetes-cluster.png';
import PodLogo from '@/assets/topology/pod.png';
import ProcessLogo from '@/assets/topology/process.png';
import TheInternetLogo from '@/assets/topology/the-internet.png';
import { EnhancedDetailedNodeSummary, G6Node } from '@/features/topology/types/graph';

export const GraphPalette = {
  NODE_OUTLINE_DARK: '#E5E7EB',
  NODE_OUTLINE_LIGHT: '#1F2937',
  LABEL_TEXT_LIGHT: '#4B5563',
  LABEL_TEXT_DARK: '#D1D5DB',
  LABEL_BACKGROUND_LIGHT: 'white',
  LABEL_BACKGROUND_DARK: '#F9FAFB',
  EDGE_DARK: '#3F83F8',
  EDGE_LIGHT: '#1C64F2',
  COMBO_FILL_DARK: '#1F2937',
  COMBO_FILL_LIGHT: '#EBF5FF',
};

// TODO: remove these legacy colors
export const PALETTE = {
  BLUE: '#55c1e9',
  DEEP_BLUE: '#426ca9',
  DARK_BLUE: '#1D3372',
  DARK_BLUE_HEADLINE: '#1e3374',
  HOT_PINK: '#EA00F7',
  DEEP_PURPLE: '#8a1a9c',
  DEEP_GREY: '#696e72',
  DARK_GREY: '#7f888f',
  MID_GREY: '#909a9c',
  LIGHT_GREY: '#acb1b5',
  BLACK: '#231f20',
  ALERT_CRITICAL: '#f40197',
  ALERT_HIGH: '#9a00f4',
  ALERT_MEDIUM: '#4d01f2',
  ALERT_LOW: '#0080ff',
  ALERT_INFO: '#acb1b5',

  AWS_YELLOW: '#FF9900',
  GOOGLE_BLUE: '#4285F4',
  EDGE_BLUE: '#007fff',
  OFF_WHITE: '#fefefe',
};

export const COLORS = {
  NODE: PALETTE.DARK_GREY,
  NODE_OUTLINE: 'white',
  NODE_SEVERITY_HIGH: PALETTE.ALERT_HIGH,
  NODE_SEVERITY_MEDIUM: PALETTE.ALERT_MEDIUM,
  NODE_SEVERITY_LOW: PALETTE.ALERT_LOW,

  LABEL: 'white',

  EDGE: PALETTE.EDGE_BLUE,
  ACTIVE_EDGE: PALETTE.AWS_YELLOW,

  CLOUD_PROVIDER: PALETTE.DEEP_GREY,
  REGION: PALETTE.DARK_GREY,
  HOST: PALETTE.MID_GREY,
  POD: PALETTE.MID_GREY,
  CONTAINER: PALETTE.MID_GREY,
  PROCESS: PALETTE.LIGHT_GREY,
};

export const nodeStyle = (
  node: EnhancedDetailedNodeSummary,
  override: Record<string, any>,
) => {
  let style: Record<string, string> = {};
  const fill: Record<string, string> = {
    cloud_provider: COLORS.CLOUD_PROVIDER,
    region: COLORS.REGION,
    host: COLORS.HOST,
    pod: COLORS.POD,
    container: COLORS.CONTAINER,
    process: COLORS.PROCESS,
  };
  style.fill = fill[node?.df_data?.type ?? ''] || COLORS.NODE;

  style = { ...style, ...override };
  if (node.df_data && getNodeImage(node.df_data?.type ?? '')) {
    delete style.fill;
  } else if (node?.df_data?.type === 'process') {
    style.fill = COLORS.PROCESS;
  }

  return style;
};

export const getShortLabel = (label?: string) => {
  if (!label || !label.length) {
    return 'unknown';
  }
  let shortLabel = label;
  if (label.lastIndexOf('/') >= 0) {
    shortLabel = label.split('/')[label.split('/').length - 1];
  }

  return truncate(shortLabel, { length: 25 });
};

export const onNodeHover = (item: G6Node, enter: boolean) => {
  const model = item.get('model') as EnhancedDetailedNodeSummary | undefined;
  if (model?.df_data?.type === 'process') {
    if (enter) {
      item.update({ label: model?.df_data?.label ?? 'unknown' });
      item.toFront();
    } else {
      item.update({ label: getShortLabel(model?.df_data?.label) });
    }
  }
};

export const getNodeImage = (nodeType: string): string | undefined => {
  if (nodeType === 'cloud_provider') {
    return getImageFullPath(CloudLogo);
  } else if (nodeType === 'pseudo') {
    return getImageFullPath(TheInternetLogo);
  } else if (nodeType === 'cloud_region') {
    return getImageFullPath(CloudRegionLogo);
  } else if (nodeType === 'host') {
    return getImageFullPath(HostLogo);
  } else if (nodeType === 'kubernetes_cluster') {
    return getImageFullPath(KubernetesClusterLogo);
  } else if (nodeType === 'container') {
    return getImageFullPath(ContainerLogo);
  } else if (nodeType === 'pod') {
    return getImageFullPath(PodLogo);
  } else if (nodeType === 'process') {
    return getImageFullPath(ProcessLogo);
  }
};

function getImageFullPath(imageRelativePath: string) {
  return `${location.protocol}//${location.host}${imageRelativePath}`;
}
