# AGENTS.md

## Workflow

Follow the workflow below when making changes to this workspace.

### 1. Reverse Engineering

First, inspect the current workspace and understand the existing implementation.

- Read relevant source code, configuration, tests, and documentation.
- Understand the current architecture and behavior.
- Identify the parts related to the requested change.
- Do not start implementation until the existing implementation is sufficiently understood.

### 2. Requirements

Clarify what needs to be changed based on the user's request and the existing implementation.

Focus user questions only on requirements that are critical enough that making an incorrect assumption could significantly affect the result.

Critical requirements include:

- Requirements that conflict with or contradict the existing implementation.
- Requirements that may introduce breaking changes.
- Requirements that have a significant impact on UX but are not sufficiently clear.

For non-critical details, use reasonable engineering judgment and proceed without unnecessary user confirmation.

#### Requirement Review Cycle

After drafting or updating the requirements, perform an adversarial self-review.

During the review:

- Do not assume the current interpretation is correct.
- Check whether the requirements accurately reflect the user's request.
- Check whether the requirements conflict with the existing implementation.
- Check whether any breaking change may be introduced.
- Check whether any UX-impacting behavior remains unclear.
- Focus on issues that could materially affect the final implementation.

If clarification is required:

- Ask the user only about the critical unresolved points.
- A single clarification round may contain multiple questions.
- For each question, provide multiple reasonable options when possible.
- Clearly identify the recommended option.
- Explain why that option is recommended.

After receiving the user's answers:

1. Update the requirements.
2. Perform the adversarial self-review again.
3. If critical ambiguity remains, ask another clarification round.

Repeat this cycle until the requirements are sufficiently clear or a maximum of 3 clarification/review cycles has been completed.

If critical ambiguity still remains after 3 cycles:

- Select the option that is judged to be the most appropriate.
- Proceed using that assumption.
- Include the unresolved point, chosen assumption, reasoning, and potential impact in the final report.

### 3. Planning

Create a concrete implementation plan based on the confirmed requirements.

- Identify the files and components that need to change.
- Determine the implementation approach.
- Consider compatibility with the existing architecture.
- Define how the implementation will be verified.
- Ensure the plan addresses all confirmed requirements before starting implementation.

### 4. Implementation

Implement the planned changes and verify them continuously.

#### Implementation and Verification

- Follow the existing codebase conventions and architecture.
- Keep changes focused on the requested requirements.
- Refactor related code when necessary to implement the change cleanly.
- Add or update relevant tests when appropriate.

After making changes:

1. Run the relevant build.
2. Run the relevant tests.
3. If either the build or tests fail, diagnose the failure and modify the implementation.
4. Run the build and tests again.
5. Continue this process until both the relevant build and tests succeed.

Do not proceed to the implementation self-review while the relevant build or tests are failing.

If the same failure continues without meaningful progress for 5 consecutive attempts:

- Stop the implementation loop.
- Do not continue repeating the same unsuccessful fix.
- Report the unresolved failure, likely cause, impact, and recommended next action.

#### Adversarial Implementation Self-Review

Only after the relevant build and tests succeed, perform an adversarial self-review of the implementation.

The primary purpose of this review is to verify that the implementation correctly satisfies the confirmed requirements.

During the review:

- Do not assume the implementation is correct simply because the build and tests pass.
- Compare the implementation directly against the confirmed requirements.
- Check each important requirement individually.
- Identify any requirement that is missing, only partially implemented, or implemented differently from what was agreed.
- Check whether the implementation introduces behavior that contradicts the confirmed requirements.
- Check whether existing behavior that should remain unchanged has been unintentionally affected.
- Focus on requirement compliance rather than minor style issues, optional improvements, or unnecessary refactoring.
- Return PASS when the confirmed requirements are satisfied and no significant requirement-related issue remains.

Review the implementation against:

- the confirmed requirements
- the existing behavior that must remain compatible
- the relevant tests
- important user-visible behavior

If the review identifies a requirement-related issue:

1. Modify the implementation.
2. Run the relevant build and tests again until they succeed.
3. Perform the adversarial implementation self-review again.

The sequence below counts as one implementation review cycle:

Implementation or fixes  
→ successful build and tests  
→ adversarial implementation self-review

Repeat the implementation review cycle until the review passes, up to a maximum of 3 cycles.

If the adversarial implementation self-review still does not pass after 3 cycles:

- Stop further review cycles.
- Report which requirements remain unsatisfied.
- Explain the impact.
- Provide the recommended next action.

### 5. Completion

When the work is complete or further progress has been stopped by one of the limits above, report:

- What was changed.
- Important implementation decisions.
- Build results.
- Test results.
- Whether the adversarial implementation self-review passed.
- Any unresolved requirements or assumptions.
- Any unresolved implementation issues.
- Remaining limitations, risks, or concerns.
- Recommended next actions when applicable.