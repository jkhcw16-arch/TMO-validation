import type {
  EDDataSource,
  EDPreservationAction,
  EDPreservationNotice,
  EDResource,
  EDResourceId,
} from "./ed-types.js";
import {
  evaluateEDAuthorization,
  type EDAuthorizationRecord,
} from "./ed-authorization.js";

export type EDPreservationAssessmentStatus =
  | "PRESERVED"
  | "PARTIALLY_PRESERVED"
  | "NOT_PRESERVED"
  | "INDETERMINATE"
  | "INVALID";

export interface EDPreservationAssessment {
  readonly dataSourceId: EDResourceId;
  readonly status: EDPreservationAssessmentStatus;
  readonly actionIds: readonly EDResourceId[];
  readonly noticeIds: readonly EDResourceId[];
  readonly exceptionIds: readonly EDResourceId[];
  readonly reasons: readonly string[];
}

export interface EDPreservationContext {
  readonly resources: readonly EDResource[];
  readonly authorizations: readonly EDAuthorizationRecord[];
}

const parseTime = (value: string | null): number | null => {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function assessEDPreservation(
  source: EDDataSource,
  context: EDPreservationContext,
): EDPreservationAssessment {
  const actions = context.resources.filter(
    (resource): resource is EDPreservationAction =>
      resource.type === "EDPreservationAction" && resource.dataSourceId === source.id,
  );

  const notices = context.resources.filter(
    (resource): resource is EDPreservationNotice =>
      resource.type === "EDPreservationNotice" &&
      resource.matterId === source.matterId,
  );

  const reasons: string[] = [];
  const exceptionIds = new Set<string>();
  let preserved = 0;
  let partial = 0;
  let failed = 0;
  let indeterminate = 0;
  let unauthorized = 0;

  for (const action of actions) {
    for (const id of action.exceptionIds) exceptionIds.add(id);

    const authorization = evaluateEDAuthorization(
      {
        actorRef: action.performedBy,
        action: "PRESERVE",
        matterId: action.matterId,
        resourceId: action.id,
        dataSourceId: action.dataSourceId,
        custodianId: null,
        at: action.performedAt,
      },
      context.authorizations,
      context.resources,
    );

    if (authorization.status !== "AUTHORIZED") {
      unauthorized += 1;
      reasons.push(`Preservation action ${action.id} lacks resolved PRESERVE authorization.`);
      continue;
    }

    if (parseTime(action.performedAt) === null) {
      indeterminate += 1;
      reasons.push(`Preservation action ${action.id} has unresolved time.`);
      continue;
    }

    if (action.result === "PRESERVED") {
      if (action.sourceRefs.length === 0) {
        indeterminate += 1;
        reasons.push(`Preservation action ${action.id} lacks an addressable supporting source.`);
      } else {
        preserved += 1;
      }
    } else if (action.result === "PARTIALLY_PRESERVED") {
      partial += 1;
      reasons.push(`Preservation action ${action.id} reports partial preservation.`);
    } else if (action.result === "FAILED") {
      failed += 1;
      reasons.push(`Preservation action ${action.id} reports failure.`);
    } else {
      indeterminate += 1;
      reasons.push(`Preservation action ${action.id} is indeterminate.`);
    }
  }

  let status: EDPreservationAssessmentStatus;

  if (actions.length === 0) {
    status = notices.length > 0 ? "INDETERMINATE" : "NOT_PRESERVED";
    reasons.push(
      notices.length > 0
        ? "A preservation notice exists, but no addressable preservation action establishes implementation."
        : "No addressable preservation action exists for this data source.",
    );
  } else if (unauthorized > 0 && preserved + partial + failed + indeterminate === 0) {
    status = "INVALID";
  } else if (failed > 0) {
    status = preserved + partial > 0 ? "PARTIALLY_PRESERVED" : "NOT_PRESERVED";
  } else if (indeterminate > 0 || unauthorized > 0) {
    status = preserved + partial > 0 ? "PARTIALLY_PRESERVED" : "INDETERMINATE";
  } else if (partial > 0) {
    status = "PARTIALLY_PRESERVED";
  } else if (preserved > 0) {
    status = "PRESERVED";
  } else {
    status = "INDETERMINATE";
  }

  return {
    dataSourceId: source.id,
    status,
    actionIds: actions.map(({ id }) => id),
    noticeIds: notices.map(({ id }) => id),
    exceptionIds: [...exceptionIds],
    reasons,
  };
}
