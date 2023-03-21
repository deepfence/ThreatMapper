export type VulnerabilitySeverityType =
  | 'critical'
  | 'high'
  | 'low'
  | 'medium'
  | 'unknown';

export type SecretSeverityType = 'critical' | 'high' | 'low' | 'medium' | 'unknown';
export type MalwareSeverityType = 'critical' | 'high' | 'low' | 'medium' | 'unknown';
export type PostureSeverityType =
  | 'alarm'
  | 'info'
  | 'skip'
  | 'ok'
  | 'pass'
  | 'warn'
  | 'note';
