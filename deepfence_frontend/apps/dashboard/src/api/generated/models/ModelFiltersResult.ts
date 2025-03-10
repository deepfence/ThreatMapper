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
 * @interface ModelFiltersResult
 */
export interface ModelFiltersResult {
    /**
     * 
     * @type {{ [key: string]: Array<string>; }}
     * @memberof ModelFiltersResult
     */
    filters: { [key: string]: Array<string>; } | null;
}

/**
 * Check if a given object implements the ModelFiltersResult interface.
 */
export function instanceOfModelFiltersResult(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "filters" in value;

    return isInstance;
}

export function ModelFiltersResultFromJSON(json: any): ModelFiltersResult {
    return ModelFiltersResultFromJSONTyped(json, false);
}

export function ModelFiltersResultFromJSONTyped(json: any, ignoreDiscriminator: boolean): ModelFiltersResult {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'filters': json['filters'],
    };
}

export function ModelFiltersResultToJSON(value?: ModelFiltersResult | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'filters': value.filters,
    };
}

