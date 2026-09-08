/** Schema failures must not bypass the blueprint's questionnaire prerequisite. */
export function buildPlanningQuestionnaireReflectionMessage(
  errorDetail?: string,
  _planModeOnly?: boolean,
): string {
  const detail = errorDetail ? ` The error was: ${errorDetail}` : "";
  return `[System]Your planning_questionnaire tool call had a format error.${detail} Review the tool's input schema, fix the issue, and re-call planning_questionnaire with correct arguments. A format error is not a user dismissal or a completed questionnaire. Do not create the blueprint until its questionnaire prerequisite has succeeded. If retrying fails again, explain the blocker and ask the questions in regular chat without claiming a blueprint was created.`;
}
