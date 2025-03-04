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
 * @interface ModelDeepfenceCommunication
 */
export interface ModelDeepfenceCommunication {
    /**
     * 
     * @type {string}
     * @memberof ModelDeepfenceCommunication
     */
    button_content?: string;
    /**
     * 
     * @type {string}
     * @memberof ModelDeepfenceCommunication
     */
    content?: string;
    /**
     * 
     * @type {Date}
     * @memberof ModelDeepfenceCommunication
     */
    created_at?: Date;
    /**
     * 
     * @type {number}
     * @memberof ModelDeepfenceCommunication
     */
    id?: number;
    /**
     * 
     * @type {string}
     * @memberof ModelDeepfenceCommunication
     */
    link?: string;
    /**
     * 
     * @type {string}
     * @memberof ModelDeepfenceCommunication
     */
    link_title?: string;
    /**
     * 
     * @type {boolean}
     * @memberof ModelDeepfenceCommunication
     */
    read?: boolean;
    /**
     * 
     * @type {string}
     * @memberof ModelDeepfenceCommunication
     */
    title?: string;
    /**
     * 
     * @type {Date}
     * @memberof ModelDeepfenceCommunication
     */
    updated_at?: Date;
}

/**
 * Check if a given object implements the ModelDeepfenceCommunication interface.
 */
export function instanceOfModelDeepfenceCommunication(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function ModelDeepfenceCommunicationFromJSON(json: any): ModelDeepfenceCommunication {
    return ModelDeepfenceCommunicationFromJSONTyped(json, false);
}

export function ModelDeepfenceCommunicationFromJSONTyped(json: any, ignoreDiscriminator: boolean): ModelDeepfenceCommunication {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'button_content': !exists(json, 'button_content') ? undefined : json['button_content'],
        'content': !exists(json, 'content') ? undefined : json['content'],
        'created_at': !exists(json, 'created_at') ? undefined : (new Date(json['created_at'])),
        'id': !exists(json, 'id') ? undefined : json['id'],
        'link': !exists(json, 'link') ? undefined : json['link'],
        'link_title': !exists(json, 'link_title') ? undefined : json['link_title'],
        'read': !exists(json, 'read') ? undefined : json['read'],
        'title': !exists(json, 'title') ? undefined : json['title'],
        'updated_at': !exists(json, 'updated_at') ? undefined : (new Date(json['updated_at'])),
    };
}

export function ModelDeepfenceCommunicationToJSON(value?: ModelDeepfenceCommunication | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'button_content': value.button_content,
        'content': value.content,
        'created_at': value.created_at === undefined ? undefined : (value.created_at.toISOString()),
        'id': value.id,
        'link': value.link,
        'link_title': value.link_title,
        'read': value.read,
        'title': value.title,
        'updated_at': value.updated_at === undefined ? undefined : (value.updated_at.toISOString()),
    };
}

