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
/**
 * 
 * @export
 * @interface ReportersCompareFilter
 */
export interface ReportersCompareFilter {
    /**
     * 
     * @type {string}
     * @memberof ReportersCompareFilter
     */
    field_name: string;
    /**
     * 
     * @type {any}
     * @memberof ReportersCompareFilter
     */
    field_value: any | null;
    /**
     * 
     * @type {boolean}
     * @memberof ReportersCompareFilter
     */
    greater_than: boolean;
}

/**
 * Check if a given object implements the ReportersCompareFilter interface.
 */
export function instanceOfReportersCompareFilter(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "field_name" in value;
    isInstance = isInstance && "field_value" in value;
    isInstance = isInstance && "greater_than" in value;

    return isInstance;
}

export function ReportersCompareFilterFromJSON(json: any): ReportersCompareFilter {
    return ReportersCompareFilterFromJSONTyped(json, false);
}

export function ReportersCompareFilterFromJSONTyped(json: any, ignoreDiscriminator: boolean): ReportersCompareFilter {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'field_name': json['field_name'],
        'field_value': json['field_value'],
        'greater_than': json['greater_than'],
    };
}

export function ReportersCompareFilterToJSON(value?: ReportersCompareFilter | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'field_name': value.field_name,
        'field_value': value.field_value,
        'greater_than': value.greater_than,
    };
}

