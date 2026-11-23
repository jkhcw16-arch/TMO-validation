/**
 * TMO-ED core resource types.
 *
 * Design boundary:
 *   discovery state != evidentiary truth != legal merits.
 *
 * ED resources preserve lineage from identified source through preservation,
 * collection, processing, review, production, and disposition. TMO-LE remains
 * responsible for evidentiary qualification and epistemic assessment.
 */

export type EDResourceId = string;
export type EDDerivationId = string;
export type EDAuditRef = string;
export type EDSourceRef = string;
export type EDActorRef = string;
export type EDDateTime = string;

export interface EDBaseResource {
  readonly id: EDResourceId;
  readonly type: EDResourceType;
  readonly derivationId: EDDerivationId;
  readonly auditRef: EDAuditRef;
}

export type EDResourceType =
  | "EDMatter"
  | "EDDiscoveryRequest"
  | "EDDiscoveryResponse"
  | "EDScope"
  | "EDCustodian"
  | "EDDataSource"
  | "EDPreservationNotice"
  | "EDPreservationAction"
  | "EDCollection"
  | "EDCollectedItem"
  | "EDProcessingEvent"
  | "EDDocumentFamily"
  | "EDReviewDecision"
  | "EDPrivilegeAssessment"
  | "EDRedaction"
  | "EDProduction"
  | "EDProductionItem"
  | "EDProductionManifest"
  | "EDException"
  | "EDDisposition";

export type EDMatterStatus =
  | "OPEN"
  | "ON_HOLD"
  | "CLOSED"
  | "ARCHIVED";

export interface EDMatter extends EDBaseResource {
  readonly type: "EDMatter";
  readonly name: string;
  readonly status: EDMatterStatus;
  readonly jurisdiction: string | null;
  readonly caseRef: string | null;
  readonly scopeIds: readonly EDResourceId[];
  readonly requestIds: readonly EDResourceId[];
}

export type EDRequestStatus =
  | "DRAFT"
  | "SERVED"
  | "RESPONDED"
  | "SUPPLEMENTED"
  | "WITHDRAWN"
  | "CLOSED";

export interface EDDiscoveryRequest extends EDBaseResource {
  readonly type: "EDDiscoveryRequest";
  readonly matterId: EDResourceId;
  readonly requestNumber: string;
  readonly description: string;
  readonly requestingPartyRef: string;
  readonly respondingPartyRef: string;
  readonly servedAt: EDDateTime | null;
  readonly dueAt: EDDateTime | null;
  readonly status: EDRequestStatus;
  readonly scopeIds: readonly EDResourceId[];
  readonly requestedForms: readonly EDProductionForm[];
}

export type EDResponsePosition =
  | "AGREED"
  | "AGREED_IN_PART"
  | "OBJECTED"
  | "WITHHELD"
  | "NO_RESPONSIVE_MATERIAL"
  | "INDETERMINATE";

export interface EDDiscoveryResponse extends EDBaseResource {
  readonly type: "EDDiscoveryResponse";
  readonly matterId: EDResourceId;
  readonly requestId: EDResourceId;
  readonly position: EDResponsePosition;
  readonly respondedAt: EDDateTime | null;
  readonly objectionIds: readonly EDResourceId[];
  readonly withheldItemIds: readonly EDResourceId[];
  readonly productionIds: readonly EDResourceId[];
  readonly limitationIds: readonly EDResourceId[];
}

export type EDScopeStatus =
  | "PROPOSED"
  | "AGREED"
  | "ORDERED"
  | "DISPUTED"
  | "SUPERSEDED";

export interface EDScope extends EDBaseResource {
  readonly type: "EDScope";
  readonly matterId: EDResourceId;
  readonly name: string;
  readonly description: string;
  readonly status: EDScopeStatus;
  readonly custodianIds: readonly EDResourceId[];
  readonly dataSourceIds: readonly EDResourceId[];
  readonly dateFrom: EDDateTime | null;
  readonly dateTo: EDDateTime | null;
  readonly topicRefs: readonly string[];
  readonly limitationIds: readonly EDResourceId[];
}

export type EDCustodianStatus =
  | "ACTIVE"
  | "FORMER"
  | "UNKNOWN"
  | "NOT_APPLICABLE";

export interface EDCustodian extends EDBaseResource {
  readonly type: "EDCustodian";
  readonly matterId: EDResourceId;
  readonly custodianRef: string;
  readonly status: EDCustodianStatus;
  readonly dataSourceIds: readonly EDResourceId[];
}

export type EDDataSourceKind =
  | "EMAIL"
  | "MESSAGING"
  | "FILE_SYSTEM"
  | "CLOUD_STORAGE"
  | "DATABASE"
  | "MOBILE_DEVICE"
  | "COLLABORATION_PLATFORM"
  | "SOCIAL_MEDIA"
  | "BACKUP"
  | "LOG"
  | "STRUCTURED_SYSTEM"
  | "OTHER";

export type EDDataSourceStatus =
  | "IDENTIFIED"
  | "PRESERVATION_PENDING"
  | "PRESERVED"
  | "COLLECTION_PENDING"
  | "COLLECTED_IN_PART"
  | "COLLECTED"
  | "UNAVAILABLE"
  | "DECOMMISSIONED"
  | "INDETERMINATE";

export interface EDDataSource extends EDBaseResource {
  readonly type: "EDDataSource";
  readonly matterId: EDResourceId;
  readonly kind: EDDataSourceKind;
  readonly systemName: string;
  readonly locationRef: EDSourceRef;
  readonly custodianIds: readonly EDResourceId[];
  readonly status: EDDataSourceStatus;
  readonly nativeFormatDescription: string | null;
  readonly preservationActionIds: readonly EDResourceId[];
  readonly collectionIds: readonly EDResourceId[];
}

export type EDPreservationNoticeStatus =
  | "DRAFT"
  | "ISSUED"
  | "ACKNOWLEDGED"
  | "UPDATED"
  | "RELEASED";

export interface EDPreservationNotice extends EDBaseResource {
  readonly type: "EDPreservationNotice";
  readonly matterId: EDResourceId;
  readonly scopeIds: readonly EDResourceId[];
  readonly issuedAt: EDDateTime | null;
  readonly releasedAt: EDDateTime | null;
  readonly status: EDPreservationNoticeStatus;
  readonly recipientRefs: readonly string[];
  readonly sourceRefs: readonly EDSourceRef[];
}

export type EDPreservationMethod =
  | "LEGAL_HOLD"
  | "IN_PLACE_HOLD"
  | "SNAPSHOT"
  | "FORENSIC_IMAGE"
  | "EXPORT"
  | "RETENTION_OVERRIDE"
  | "MANUAL"
  | "OTHER";

export type EDPreservationResult =
  | "PRESERVED"
  | "PARTIALLY_PRESERVED"
  | "FAILED"
  | "INDETERMINATE";

export interface EDPreservationAction extends EDBaseResource {
  readonly type: "EDPreservationAction";
  readonly matterId: EDResourceId;
  readonly dataSourceId: EDResourceId;
  readonly scopeIds: readonly EDResourceId[];
  readonly noticeId: EDResourceId | null;
  readonly method: EDPreservationMethod;
  readonly performedBy: EDActorRef;
  readonly performedAt: EDDateTime;
  readonly result: EDPreservationResult;
  readonly sourceRefs: readonly EDSourceRef[];
  readonly exceptionIds: readonly EDResourceId[];
}

export type EDCollectionMethod =
  | "NATIVE_EXPORT"
  | "API_EXPORT"
  | "FORENSIC_COLLECTION"
  | "LOGICAL_COLLECTION"
  | "TARGETED_COLLECTION"
  | "MANUAL_EXPORT"
  | "OTHER";

export type EDCollectionStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "INDETERMINATE";

export interface EDCollection extends EDBaseResource {
  readonly type: "EDCollection";
  readonly matterId: EDResourceId;
  readonly dataSourceId: EDResourceId;
  readonly scopeIds: readonly EDResourceId[];
  readonly method: EDCollectionMethod;
  readonly status: EDCollectionStatus;
  readonly collectedBy: EDActorRef;
  readonly startedAt: EDDateTime | null;
  readonly completedAt: EDDateTime | null;
  readonly itemIds: readonly EDResourceId[];
  readonly sourceRefs: readonly EDSourceRef[];
  readonly exceptionIds: readonly EDResourceId[];
}

export type EDHashAlgorithm =
  | "SHA256"
  | "SHA512"
  | "MD5"
  | "OTHER";

export interface EDHashValue {
  readonly algorithm: EDHashAlgorithm;
  readonly value: string;
}

export interface EDCollectedItem extends EDBaseResource {
  readonly type: "EDCollectedItem";
  readonly matterId: EDResourceId;
  readonly collectionId: EDResourceId;
  readonly dataSourceId: EDResourceId;
  readonly sourceItemRef: EDSourceRef;
  readonly collectedObjectRef: EDSourceRef;
  readonly fileName: string | null;
  readonly mediaType: string | null;
  readonly byteLength: number | null;
  readonly hashes: readonly EDHashValue[];
  readonly collectedAt: EDDateTime | null;
  readonly parentItemId: EDResourceId | null;
  readonly childItemIds: readonly EDResourceId[];
  readonly processingEventIds: readonly EDResourceId[];
}

export type EDProcessingOperation =
  | "EXTRACTION"
  | "NORMALIZATION"
  | "TEXT_EXTRACTION"
  | "OCR"
  | "DECOMPRESSION"
  | "DEDUPLICATION_GROUPING"
  | "DE_NISTING"
  | "CONVERSION"
  | "METADATA_EXTRACTION"
  | "OTHER";

export type EDProcessingResult =
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "INDETERMINATE";

export interface EDProcessingEvent extends EDBaseResource {
  readonly type: "EDProcessingEvent";
  readonly matterId: EDResourceId;
  readonly inputItemIds: readonly EDResourceId[];
  readonly operation: EDProcessingOperation;
  readonly performedBy: EDActorRef;
  readonly performedAt: EDDateTime;
  readonly result: EDProcessingResult;
  readonly outputRefs: readonly EDSourceRef[];
  readonly duplicateGroupRef: string | null;
  readonly exceptionIds: readonly EDResourceId[];
}

export type EDDocumentFamilyKind =
  | "EMAIL_ATTACHMENT"
  | "CONTAINER_CHILD"
  | "MESSAGE_THREAD"
  | "LOGICAL_GROUP"
  | "OTHER";

export interface EDDocumentFamily extends EDBaseResource {
  readonly type: "EDDocumentFamily";
  readonly matterId: EDResourceId;
  readonly kind: EDDocumentFamilyKind;
  readonly parentItemId: EDResourceId;
  readonly childItemIds: readonly EDResourceId[];
}

export type EDResponsivenessStatus =
  | "RESPONSIVE"
  | "NOT_RESPONSIVE"
  | "POTENTIALLY_RESPONSIVE"
  | "INDETERMINATE"
  | "NOT_REVIEWED";

export type EDConfidentialityStatus =
  | "NONE"
  | "CONFIDENTIAL"
  | "HIGHLY_CONFIDENTIAL"
  | "RESTRICTED"
  | "INDETERMINATE";

export interface EDReviewDecision extends EDBaseResource {
  readonly type: "EDReviewDecision";
  readonly matterId: EDResourceId;
  readonly itemId: EDResourceId;
  readonly responsiveness: EDResponsivenessStatus;
  readonly confidentiality: EDConfidentialityStatus;
  readonly privilegeAssessmentId: EDResourceId | null;
  readonly issueRefs: readonly string[];
  readonly reviewerRef: EDActorRef;
  readonly reviewedAt: EDDateTime;
  readonly sourceRefs: readonly EDSourceRef[];
  readonly limitationIds: readonly EDResourceId[];
}

export type EDPrivilegeStatus =
  | "PRIVILEGED"
  | "NOT_PRIVILEGED"
  | "POTENTIALLY_PRIVILEGED"
  | "WITHHELD"
  | "REDACTED"
  | "INDETERMINATE"
  | "NOT_ASSESSED";

export interface EDPrivilegeAssessment extends EDBaseResource {
  readonly type: "EDPrivilegeAssessment";
  readonly matterId: EDResourceId;
  readonly itemId: EDResourceId;
  readonly status: EDPrivilegeStatus;
  readonly basisRefs: readonly string[];
  readonly assessedBy: EDActorRef;
  readonly assessedAt: EDDateTime;
  readonly redactionIds: readonly EDResourceId[];
  readonly sourceRefs: readonly EDSourceRef[];
  readonly limitationIds: readonly EDResourceId[];
}

export type EDRedactionReason =
  | "PRIVILEGE"
  | "CONFIDENTIALITY"
  | "PRIVACY"
  | "PROTECTIVE_ORDER"
  | "NONRESPONSIVE_CONTENT"
  | "OTHER";

export interface EDRedaction extends EDBaseResource {
  readonly type: "EDRedaction";
  readonly matterId: EDResourceId;
  readonly itemId: EDResourceId;
  readonly reason: EDRedactionReason;
  readonly locator: string;
  readonly authorityRef: string | null;
  readonly createdBy: EDActorRef;
  readonly createdAt: EDDateTime;
}

export type EDProductionForm =
  | "NATIVE"
  | "IMAGE"
  | "PDF"
  | "LOAD_FILE"
  | "TEXT"
  | "STRUCTURED_EXPORT"
  | "OTHER";

export type EDProductionStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SUPPLEMENTAL"
  | "WITHDRAWN"
  | "FAILED";

export interface EDProduction extends EDBaseResource {
  readonly type: "EDProduction";
  readonly matterId: EDResourceId;
  readonly requestIds: readonly EDResourceId[];
  readonly label: string;
  readonly status: EDProductionStatus;
  readonly requestedForms: readonly EDProductionForm[];
  readonly producedForms: readonly EDProductionForm[];
  readonly productionItemIds: readonly EDResourceId[];
  readonly manifestId: EDResourceId | null;
  readonly producedAt: EDDateTime | null;
  readonly exceptionIds: readonly EDResourceId[];
}

export interface EDProductionItem extends EDBaseResource {
  readonly type: "EDProductionItem";
  readonly matterId: EDResourceId;
  readonly productionId: EDResourceId;
  readonly collectedItemId: EDResourceId;
  readonly reviewDecisionId: EDResourceId | null;
  readonly producedObjectRef: EDSourceRef;
  readonly producedForm: EDProductionForm;
  readonly batesStart: string | null;
  readonly batesEnd: string | null;
  readonly redactionIds: readonly EDResourceId[];
  readonly transformationRefs: readonly EDResourceId[];
}

export interface EDProductionManifest extends EDBaseResource {
  readonly type: "EDProductionManifest";
  readonly matterId: EDResourceId;
  readonly productionId: EDResourceId;
  readonly itemIds: readonly EDResourceId[];
  readonly manifestRef: EDSourceRef;
  readonly createdAt: EDDateTime;
  readonly hashes: readonly EDHashValue[];
}

export type EDExceptionKind =
  | "SCOPE_LIMITATION"
  | "ACCESS_FAILURE"
  | "PRESERVATION_FAILURE"
  | "COLLECTION_FAILURE"
  | "PROCESSING_FAILURE"
  | "REVIEW_LIMITATION"
  | "PRIVILEGE"
  | "CONFIDENTIALITY"
  | "FORMAT_DEVIATION"
  | "WITHHELD_MATERIAL"
  | "DATA_LOSS"
  | "OTHER";

export type EDExceptionStatus =
  | "OPEN"
  | "MITIGATED"
  | "RESOLVED"
  | "ACCEPTED"
  | "INDETERMINATE";

export interface EDException extends EDBaseResource {
  readonly type: "EDException";
  readonly matterId: EDResourceId;
  readonly kind: EDExceptionKind;
  readonly status: EDExceptionStatus;
  readonly description: string;
  readonly affectedResourceIds: readonly EDResourceId[];
  readonly sourceRefs: readonly EDSourceRef[];
  readonly createdAt: EDDateTime;
  readonly resolvedAt: EDDateTime | null;
}

export type EDDispositionAction =
  | "RETAIN"
  | "DELETE"
  | "RETURN"
  | "TRANSFER"
  | "ARCHIVE"
  | "RELEASE_HOLD"
  | "NO_ACTION";

export type EDDispositionStatus =
  | "PLANNED"
  | "AUTHORIZED"
  | "COMPLETED"
  | "PARTIAL"
  | "BLOCKED"
  | "INDETERMINATE";

export interface EDDisposition extends EDBaseResource {
  readonly type: "EDDisposition";
  readonly matterId: EDResourceId;
  readonly action: EDDispositionAction;
  readonly status: EDDispositionStatus;
  readonly affectedResourceIds: readonly EDResourceId[];
  readonly authorityRefs: readonly string[];
  readonly authorizedBy: EDActorRef | null;
  readonly authorizedAt: EDDateTime | null;
  readonly completedAt: EDDateTime | null;
  readonly exceptionIds: readonly EDResourceId[];
}

export type EDResource =
  | EDMatter
  | EDDiscoveryRequest
  | EDDiscoveryResponse
  | EDScope
  | EDCustodian
  | EDDataSource
  | EDPreservationNotice
  | EDPreservationAction
  | EDCollection
  | EDCollectedItem
  | EDProcessingEvent
  | EDDocumentFamily
  | EDReviewDecision
  | EDPrivilegeAssessment
  | EDRedaction
  | EDProduction
  | EDProductionItem
  | EDProductionManifest
  | EDException
  | EDDisposition;
