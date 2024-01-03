{{/*
Expand the name of the chart.
*/}}
{{- define "deepfence-console.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "deepfence-console.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "deepfence-console.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "deepfence-console.labels" -}}
helm.sh/chart: {{ include "deepfence-console.chart" . }}
{{ include "deepfence-console.selectorLabels" . }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "deepfence-console.selectorLabels" -}}
app: deepfence-console
app.kubernetes.io/name: {{ include "deepfence-console.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "deepfence-console.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "deepfence-console.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the name of the imagePullSecret to use
*/}}
{{- define "deepfence-console.imagePullSecretName" -}}
{{- if .Values.imagePullSecret.create }}
{{- default (include "deepfence-console.fullname" .) .Values.imagePullSecret.name }}
{{- else }}
{{- .Values.imagePullSecret.name }}
{{- end }}
{{- end }}

{{/*
Create secret to access docker registry
*/}}
{{- define "imagePullSecret" }}
{{- printf "{\"auths\": {\"%s\": {\"auth\": \"%s\"}}}" .Values.imagePullSecret.registry (printf "%s:%s" .Values.imagePullSecret.username .Values.imagePullSecret.password | b64enc) | b64enc }}
{{- end }}