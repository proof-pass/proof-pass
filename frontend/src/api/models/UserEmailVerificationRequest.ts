/* tslint:disable */
/* eslint-disable */
/**
 * Proof Pass API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 0.1.0
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
/**
 *
 * @export
 * @interface UserEmailVerificationRequest
 */
export interface UserEmailVerificationRequest {
    /**
     *
     * @type {string}
     * @memberof UserEmailVerificationRequest
     */
    email?: string;
}

/**
 * Check if a given object implements the UserEmailVerificationRequest interface.
 */
export function instanceOfUserEmailVerificationRequest(
    value: object,
): value is UserEmailVerificationRequest {
    return true;
}

export function UserEmailVerificationRequestFromJSON(
    json: any,
): UserEmailVerificationRequest {
    return UserEmailVerificationRequestFromJSONTyped(json, false);
}

export function UserEmailVerificationRequestFromJSONTyped(
    json: any,
    ignoreDiscriminator: boolean,
): UserEmailVerificationRequest {
    if (json == null) {
        return json;
    }
    return {
        email: json['email'] == null ? undefined : json['email'],
    };
}

export function UserEmailVerificationRequestToJSON(
    value?: UserEmailVerificationRequest | null,
): any {
    if (value == null) {
        return value;
    }
    return {
        email: value['email'],
    };
}
