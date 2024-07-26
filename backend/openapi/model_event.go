// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

/*
 * Proof Pass API
 *
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * API version: 0.1.0
 */

package openapi


import (
	"time"
)



type Event struct {

	Id string `json:"id,omitempty"`

	Name string `json:"name,omitempty"`

	Description string `json:"description,omitempty"`

	Url string `json:"url,omitempty"`

	ChainId string `json:"chain_id,omitempty"`

	ContextId string `json:"context_id,omitempty"`

	ContextString string `json:"context_string,omitempty"`

	IssuerKeyId string `json:"issuer_key_id,omitempty"`

	StartDate time.Time `json:"start_date,omitempty"`

	EndDate time.Time `json:"end_date,omitempty"`
}

// AssertEventRequired checks if the required fields are not zero-ed
func AssertEventRequired(obj Event) error {
	return nil
}

// AssertEventConstraints checks if the values respects the defined constraints
func AssertEventConstraints(obj Event) error {
	return nil
}
