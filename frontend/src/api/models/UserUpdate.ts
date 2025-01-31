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
 * @interface UserUpdate
 */
export interface UserUpdate {
    /**
     * 
     * @type {string}
     * @memberof UserUpdate
     */
    identityCommitment?: string;
    /**
     * 
     * @type {string}
     * @memberof UserUpdate
     */
    encryptedInternalNullifier?: string;
    /**
     * 
     * @type {string}
     * @memberof UserUpdate
     */
    encryptedIdentitySecret?: string;
}

/**
 * Check if a given object implements the UserUpdate interface.
 */
export function instanceOfUserUpdate(value: object): value is UserUpdate {
    return true;
}

export function UserUpdateFromJSON(json: any): UserUpdate {
    return UserUpdateFromJSONTyped(json, false);
}

export function UserUpdateFromJSONTyped(json: any, ignoreDiscriminator: boolean): UserUpdate {
    if (json == null) {
        return json;
    }
    return {
        
        'identityCommitment': json['identity_commitment'] == null ? undefined : json['identity_commitment'],
        'encryptedInternalNullifier': json['encrypted_internal_nullifier'] == null ? undefined : json['encrypted_internal_nullifier'],
        'encryptedIdentitySecret': json['encrypted_identity_secret'] == null ? undefined : json['encrypted_identity_secret'],
    };
}

export function UserUpdateToJSON(value?: UserUpdate | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'identity_commitment': value['identityCommitment'],
        'encrypted_internal_nullifier': value['encryptedInternalNullifier'],
        'encrypted_identity_secret': value['encryptedIdentitySecret'],
    };
}

