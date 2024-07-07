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

import * as runtime from '../runtime';
import type {
    EmailCredential,
    Event,
    LoginResponse,
    PutEmailCredentialRequest,
    PutTicketCredentialRequest,
    RecordAttendanceRequest,
    TicketCredential,
    UnencryptedEmailCredential,
    UnencryptedTicketCredential,
    User,
    UserEmailVerificationRequest,
    UserLogin,
    UserUpdate,
} from '../models/index';
import {
    EmailCredentialFromJSON,
    EmailCredentialToJSON,
    EventFromJSON,
    EventToJSON,
    LoginResponseFromJSON,
    LoginResponseToJSON,
    PutEmailCredentialRequestFromJSON,
    PutEmailCredentialRequestToJSON,
    PutTicketCredentialRequestFromJSON,
    PutTicketCredentialRequestToJSON,
    RecordAttendanceRequestFromJSON,
    RecordAttendanceRequestToJSON,
    TicketCredentialFromJSON,
    TicketCredentialToJSON,
    UnencryptedEmailCredentialFromJSON,
    UnencryptedEmailCredentialToJSON,
    UnencryptedTicketCredentialFromJSON,
    UnencryptedTicketCredentialToJSON,
    UserFromJSON,
    UserToJSON,
    UserEmailVerificationRequestFromJSON,
    UserEmailVerificationRequestToJSON,
    UserLoginFromJSON,
    UserLoginToJSON,
    UserUpdateFromJSON,
    UserUpdateToJSON,
} from '../models/index';

export interface EventsEventIdAttendancePostRequest {
    eventId: string;
    recordAttendanceRequest: RecordAttendanceRequest;
}

export interface EventsEventIdGetRequest {
    eventId: string;
}

export interface EventsEventIdRequestTicketCredentialPostRequest {
    eventId: string;
}

export interface UserLoginPostRequest {
    userLogin: UserLogin;
}

export interface UserMeEmailCredentialPutRequest {
    putEmailCredentialRequest: PutEmailCredentialRequest;
}

export interface UserMeTicketCredentialPutRequest {
    putTicketCredentialRequest: PutTicketCredentialRequest;
}

export interface UserRequestVerificationCodePostRequest {
    userEmailVerificationRequest: UserEmailVerificationRequest;
}

export interface UserUpdatePutRequest {
    userUpdate: UserUpdate;
}

/**
 *
 */
export class DefaultApi extends runtime.BaseAPI {
    /**
     * Record attendance for an event
     */
    async eventsEventIdAttendancePostRaw(
        requestParameters: EventsEventIdAttendancePostRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['eventId'] == null) {
            throw new runtime.RequiredError(
                'eventId',
                'Required parameter "eventId" was null or undefined when calling eventsEventIdAttendancePost().',
            );
        }

        if (requestParameters['recordAttendanceRequest'] == null) {
            throw new runtime.RequiredError(
                'recordAttendanceRequest',
                'Required parameter "recordAttendanceRequest" was null or undefined when calling eventsEventIdAttendancePost().',
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request(
            {
                path: `/events/{eventId}/attendance`.replace(
                    `{${'eventId'}}`,
                    encodeURIComponent(String(requestParameters['eventId'])),
                ),
                method: 'POST',
                headers: headerParameters,
                query: queryParameters,
                body: RecordAttendanceRequestToJSON(
                    requestParameters['recordAttendanceRequest'],
                ),
            },
            initOverrides,
        );

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Record attendance for an event
     */
    async eventsEventIdAttendancePost(
        requestParameters: EventsEventIdAttendancePostRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<void> {
        await this.eventsEventIdAttendancePostRaw(
            requestParameters,
            initOverrides,
        );
    }

    /**
     * Get event details
     */
    async eventsEventIdGetRaw(
        requestParameters: EventsEventIdGetRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<Event>> {
        if (requestParameters['eventId'] == null) {
            throw new runtime.RequiredError(
                'eventId',
                'Required parameter "eventId" was null or undefined when calling eventsEventIdGet().',
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request(
            {
                path: `/events/{eventId}`.replace(
                    `{${'eventId'}}`,
                    encodeURIComponent(String(requestParameters['eventId'])),
                ),
                method: 'GET',
                headers: headerParameters,
                query: queryParameters,
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) =>
            EventFromJSON(jsonValue),
        );
    }

    /**
     * Get event details
     */
    async eventsEventIdGet(
        requestParameters: EventsEventIdGetRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<Event> {
        const response = await this.eventsEventIdGetRaw(
            requestParameters,
            initOverrides,
        );
        return await response.value();
    }

    /**
     * Request a new ticket credential for an event
     */
    async eventsEventIdRequestTicketCredentialPostRaw(
        requestParameters: EventsEventIdRequestTicketCredentialPostRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<UnencryptedTicketCredential>> {
        if (requestParameters['eventId'] == null) {
            throw new runtime.RequiredError(
                'eventId',
                'Required parameter "eventId" was null or undefined when calling eventsEventIdRequestTicketCredentialPost().',
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token('bearerAuth', []);

            if (tokenString) {
                headerParameters['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request(
            {
                path: `/events/{eventId}/request-ticket-credential`.replace(
                    `{${'eventId'}}`,
                    encodeURIComponent(String(requestParameters['eventId'])),
                ),
                method: 'POST',
                headers: headerParameters,
                query: queryParameters,
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) =>
            UnencryptedTicketCredentialFromJSON(jsonValue),
        );
    }

    /**
     * Request a new ticket credential for an event
     */
    async eventsEventIdRequestTicketCredentialPost(
        requestParameters: EventsEventIdRequestTicketCredentialPostRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<UnencryptedTicketCredential> {
        const response = await this.eventsEventIdRequestTicketCredentialPostRaw(
            requestParameters,
            initOverrides,
        );
        return await response.value();
    }

    /**
     * Get list of events
     */
    async eventsGetRaw(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<Array<Event>>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request(
            {
                path: `/events`,
                method: 'GET',
                headers: headerParameters,
                query: queryParameters,
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) =>
            jsonValue.map(EventFromJSON),
        );
    }

    /**
     * Get list of events
     */
    async eventsGet(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<Array<Event>> {
        const response = await this.eventsGetRaw(initOverrides);
        return await response.value();
    }

    /**
     * Check the health of the API
     */
    async healthGetRaw(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<void>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request(
            {
                path: `/health`,
                method: 'GET',
                headers: headerParameters,
                query: queryParameters,
            },
            initOverrides,
        );

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Check the health of the API
     */
    async healthGet(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<void> {
        await this.healthGetRaw(initOverrides);
    }

    /**
     * User login
     */
    async userLoginPostRaw(
        requestParameters: UserLoginPostRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<LoginResponse>> {
        if (requestParameters['userLogin'] == null) {
            throw new runtime.RequiredError(
                'userLogin',
                'Required parameter "userLogin" was null or undefined when calling userLoginPost().',
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request(
            {
                path: `/user/login`,
                method: 'POST',
                headers: headerParameters,
                query: queryParameters,
                body: UserLoginToJSON(requestParameters['userLogin']),
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) =>
            LoginResponseFromJSON(jsonValue),
        );
    }

    /**
     * User login
     */
    async userLoginPost(
        requestParameters: UserLoginPostRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<LoginResponse> {
        const response = await this.userLoginPostRaw(
            requestParameters,
            initOverrides,
        );
        return await response.value();
    }

    /**
     * Get user email credential
     */
    async userMeEmailCredentialGetRaw(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<EmailCredential>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token('bearerAuth', []);

            if (tokenString) {
                headerParameters['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request(
            {
                path: `/user/me/email-credential`,
                method: 'GET',
                headers: headerParameters,
                query: queryParameters,
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) =>
            EmailCredentialFromJSON(jsonValue),
        );
    }

    /**
     * Get user email credential
     */
    async userMeEmailCredentialGet(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<EmailCredential> {
        const response = await this.userMeEmailCredentialGetRaw(initOverrides);
        return await response.value();
    }

    /**
     * Store user email credential with encrypted data
     */
    async userMeEmailCredentialPutRaw(
        requestParameters: UserMeEmailCredentialPutRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['putEmailCredentialRequest'] == null) {
            throw new runtime.RequiredError(
                'putEmailCredentialRequest',
                'Required parameter "putEmailCredentialRequest" was null or undefined when calling userMeEmailCredentialPut().',
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token('bearerAuth', []);

            if (tokenString) {
                headerParameters['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request(
            {
                path: `/user/me/email-credential`,
                method: 'PUT',
                headers: headerParameters,
                query: queryParameters,
                body: PutEmailCredentialRequestToJSON(
                    requestParameters['putEmailCredentialRequest'],
                ),
            },
            initOverrides,
        );

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Store user email credential with encrypted data
     */
    async userMeEmailCredentialPut(
        requestParameters: UserMeEmailCredentialPutRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<void> {
        await this.userMeEmailCredentialPutRaw(
            requestParameters,
            initOverrides,
        );
    }

    /**
     * Get user details
     */
    async userMeGetRaw(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<User>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token('bearerAuth', []);

            if (tokenString) {
                headerParameters['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request(
            {
                path: `/user/me`,
                method: 'GET',
                headers: headerParameters,
                query: queryParameters,
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) =>
            UserFromJSON(jsonValue),
        );
    }

    /**
     * Get user details
     */
    async userMeGet(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<User> {
        const response = await this.userMeGetRaw(initOverrides);
        return await response.value();
    }

    /**
     * Generate a new email credential
     */
    async userMeRequestEmailCredentialPostRaw(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<UnencryptedEmailCredential>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token('bearerAuth', []);

            if (tokenString) {
                headerParameters['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request(
            {
                path: `/user/me/request-email-credential`,
                method: 'POST',
                headers: headerParameters,
                query: queryParameters,
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) =>
            UnencryptedEmailCredentialFromJSON(jsonValue),
        );
    }

    /**
     * Generate a new email credential
     */
    async userMeRequestEmailCredentialPost(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<UnencryptedEmailCredential> {
        const response =
            await this.userMeRequestEmailCredentialPostRaw(initOverrides);
        return await response.value();
    }

    /**
     * Store user ticket credential with encrypted data
     */
    async userMeTicketCredentialPutRaw(
        requestParameters: UserMeTicketCredentialPutRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['putTicketCredentialRequest'] == null) {
            throw new runtime.RequiredError(
                'putTicketCredentialRequest',
                'Required parameter "putTicketCredentialRequest" was null or undefined when calling userMeTicketCredentialPut().',
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token('bearerAuth', []);

            if (tokenString) {
                headerParameters['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request(
            {
                path: `/user/me/ticket-credential`,
                method: 'PUT',
                headers: headerParameters,
                query: queryParameters,
                body: PutTicketCredentialRequestToJSON(
                    requestParameters['putTicketCredentialRequest'],
                ),
            },
            initOverrides,
        );

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Store user ticket credential with encrypted data
     */
    async userMeTicketCredentialPut(
        requestParameters: UserMeTicketCredentialPutRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<void> {
        await this.userMeTicketCredentialPutRaw(
            requestParameters,
            initOverrides,
        );
    }

    /**
     * Get user ticket credentials
     */
    async userMeTicketCredentialsGetRaw(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<Array<TicketCredential>>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token('bearerAuth', []);

            if (tokenString) {
                headerParameters['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request(
            {
                path: `/user/me/ticket-credentials`,
                method: 'GET',
                headers: headerParameters,
                query: queryParameters,
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) =>
            jsonValue.map(TicketCredentialFromJSON),
        );
    }

    /**
     * Get user ticket credentials
     */
    async userMeTicketCredentialsGet(
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<Array<TicketCredential>> {
        const response =
            await this.userMeTicketCredentialsGetRaw(initOverrides);
        return await response.value();
    }

    /**
     * Request an email verification code
     */
    async userRequestVerificationCodePostRaw(
        requestParameters: UserRequestVerificationCodePostRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['userEmailVerificationRequest'] == null) {
            throw new runtime.RequiredError(
                'userEmailVerificationRequest',
                'Required parameter "userEmailVerificationRequest" was null or undefined when calling userRequestVerificationCodePost().',
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request(
            {
                path: `/user/request-verification-code`,
                method: 'POST',
                headers: headerParameters,
                query: queryParameters,
                body: UserEmailVerificationRequestToJSON(
                    requestParameters['userEmailVerificationRequest'],
                ),
            },
            initOverrides,
        );

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Request an email verification code
     */
    async userRequestVerificationCodePost(
        requestParameters: UserRequestVerificationCodePostRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<void> {
        await this.userRequestVerificationCodePostRaw(
            requestParameters,
            initOverrides,
        );
    }

    /**
     * Update user details
     */
    async userUpdatePutRaw(
        requestParameters: UserUpdatePutRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<User>> {
        if (requestParameters['userUpdate'] == null) {
            throw new runtime.RequiredError(
                'userUpdate',
                'Required parameter "userUpdate" was null or undefined when calling userUpdatePut().',
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token('bearerAuth', []);

            if (tokenString) {
                headerParameters['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request(
            {
                path: `/user/update`,
                method: 'PUT',
                headers: headerParameters,
                query: queryParameters,
                body: UserUpdateToJSON(requestParameters['userUpdate']),
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) =>
            UserFromJSON(jsonValue),
        );
    }

    /**
     * Update user details
     */
    async userUpdatePut(
        requestParameters: UserUpdatePutRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<User> {
        const response = await this.userUpdatePutRaw(
            requestParameters,
            initOverrides,
        );
        return await response.value();
    }
}
