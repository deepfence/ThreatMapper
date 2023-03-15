import { EnhancedDetailedNodeSummary } from '@/features/topology/types/graph';

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
  if (node.df_data.image !== undefined) {
    delete style.fill;
  } else if (node?.df_data?.type === 'process') {
    style.fill = COLORS.PROCESS;
  }

  return style;
};
