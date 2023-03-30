export interface ScanSummary {
  scanId: string;
  timestamp: number;
  counts: {
    [x: string]: number;
  };
}
