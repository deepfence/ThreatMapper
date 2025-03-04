/* tslint:disable */
/* eslint-disable */
/**
 * Deepfence ThreatMapper
 * Deepfence Runtime API provides programmatic control over Deepfence microservice securing your container, kubernetes and cloud deployments. The API abstracts away underlying infrastructure details like cloud provider,  container distros, container orchestrator and type of deployment. This is one uniform API to manage and control security alerts, policies and response to alerts for microservices running anywhere i.e. managed pure greenfield container deployments or a mix of containers, VMs and serverless paradigms like AWS Fargate.
 *
 * The version of the OpenAPI document: v2.5.3
 * Contact: community@deepfence.io
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import type { ReportMetadata } from './ReportMetadata';
import {
    ReportMetadataFromJSON,
    ReportMetadataFromJSONTyped,
    ReportMetadataToJSON,
} from './ReportMetadata';

/**
 * 
 * @export
 * @interface DetailedNodeSummary
 */
export interface DetailedNodeSummary {
    /**
     * 
     * @type {Array<string>}
     * @memberof DetailedNodeSummary
     */
    adjacency?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof DetailedNodeSummary
     */
    id?: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof DetailedNodeSummary
     */
    ids?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof DetailedNodeSummary
     */
    immediate_parent_id?: string;
    /**
     * 
     * @type {string}
     * @memberof DetailedNodeSummary
     */
    label?: string;
    /**
     * 
     * @type {ReportMetadata}
     * @memberof DetailedNodeSummary
     */
    metadata?: ReportMetadata;
    /**
     * 
     * @type {string}
     * @memberof DetailedNodeSummary
     */
    type?: string;
}

/**
 * Check if a given object implements the DetailedNodeSummary interface.
 */
export function instanceOfDetailedNodeSummary(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function DetailedNodeSummaryFromJSON(json: any): DetailedNodeSummary {
    return DetailedNodeSummaryFromJSONTyped(json, false);
}

export function DetailedNodeSummaryFromJSONTyped(json: any, ignoreDiscriminator: boolean): DetailedNodeSummary {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'adjacency': !exists(json, 'adjacency') ? undefined : json['adjacency'],
        'id': !exists(json, 'id') ? undefined : json['id'],
        'ids': !exists(json, 'ids') ? undefined : json['ids'],
        'immediate_parent_id': !exists(json, 'immediate_parent_id') ? undefined : json['immediate_parent_id'],
        'label': !exists(json, 'label') ? undefined : json['label'],
        'metadata': !exists(json, 'metadata') ? undefined : ReportMetadataFromJSON(json['metadata']),
        'type': !exists(json, 'type') ? undefined : json['type'],
    };
}

export function DetailedNodeSummaryToJSON(value?: DetailedNodeSummary | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'adjacency': value.adjacency,
        'id': value.id,
        'ids': value.ids,
        'immediate_parent_id': value.immediate_parent_id,
        'label': value.label,
        'metadata': ReportMetadataToJSON(value.metadata),
        'type': value.type,
    };
}

