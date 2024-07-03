// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

/*
 * Proof Pass API
 *
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * API version: 0.1.0
 */

package openapi




type RecordAttendanceRequest struct {

	Type string `json:"type,omitempty"`

	Context string `json:"context,omitempty"`

	Nullifier string `json:"nullifier,omitempty"`

	KeyId string `json:"key_id,omitempty"`

	EventId string `json:"event_id,omitempty"`

	AdminCode string `json:"admin_code,omitempty"`
}

// AssertRecordAttendanceRequestRequired checks if the required fields are not zero-ed
func AssertRecordAttendanceRequestRequired(obj RecordAttendanceRequest) error {
	return nil
}

// AssertRecordAttendanceRequestConstraints checks if the values respects the defined constraints
func AssertRecordAttendanceRequestConstraints(obj RecordAttendanceRequest) error {
	return nil
}
