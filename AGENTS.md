# AGENTS.md

## Workflow

Follow the workflow below when making changes to this workspace.

### 1. Reverse Engineering

First, inspect the current workspace and understand the existing implementation.

* Read relevant source code, configuration, tests, and documentation.
* Understand the current architecture and behavior.
* Identify the parts related to the requested change.
* Do not start implementation until the existing implementation is sufficiently understood.

### 2. Requirements

Clarify what needs to be changed based on the user's request and the existing implementation.

Focus user questions only on requirements that are critical enough that making an incorrect assumption could significantly affect the result.

Critical requirements include:

* Requirements that conflict with or contradict the existing implementation.
* Requirements that may introduce breaking changes.
* Requirements that have a significant impact on UX but are not sufficiently clear.

For non-critical details, use reasonable engineering judgment and proceed without unnecessary user confirmation.

#### Requirement Review Cycle

After drafting or updating the requirements, perform an adversarial self-review.

During the review:

* Do not assume the current interpretation is correct.
* Check whether the requirements accurately reflect the user's request.
* Check whether the requirements conflict with the existing implementation.
* Check whether any breaking change may be introduced.
* Check whether any UX-impacting behavior remains unclear.
* Focus on issues that could materially affect the final implementation.

If clarification is required:

* Ask the user only about the critical unresolved points.
* A single clarification round may contain multiple questions.
* For each question, provide multiple reasonable options when possible.
* Clearly identify the recommended option.
* Explain why that option is recommended.

After receiving the user's answers:

1. Update the requirements.
2. Perform the adversarial self-review again.
3. If critical ambiguity remains, ask another clarification round.

Repeat this cycle until the requirements are sufficiently clear or a maximum of 3 clarification/review cycles has been completed.

If critical ambiguity still remains after 3 cycles:

* Select the option that is judged to be the most appropriate.
* Include that assumption in the finalized requirements.
* Clearly identify the unresolved point, chosen assumption, reasoning, and potential impact when presenting the requirements to the user.

#### Requirement Approval

After the requirements have been finalized:

1. Present the finalized requirements to the user in a clear and concise form.
2. Present a brief summary of the latest adversarial self-review.

   * State whether any critical issue was found.
   * Briefly list important issues that were identified and how they were resolved.
   * Mention any remaining assumptions, risks, or points the user should be aware of.
   * If no significant issue remains, explicitly state that no critical issue was found.
   * Keep this summary concise and do not include detailed internal reasoning or chain-of-thought.
3. Include any assumptions that were made by the agent.
4. Ask the user to explicitly confirm whether the finalized requirements are acceptable.
5. Do not proceed to Working Branch or Planning until the user approves the finalized requirements.

If the user requests changes:

* Update the requirements based on the feedback.
* Perform the adversarial self-review again.
* Present the revised requirements and a brief summary of the latest adversarial self-review for approval again.

Proceed to Working Branch only after explicit user approval.

### 3. Working Branch

After the requirements have been approved, determine the working branch before starting Planning.

* Inspect the current branch and existing branch names.
* Follow the repository's existing branch naming patterns when naming a new branch.
* If the current branch is the main production branch such as `main` or `master`:

  1. Create a new working branch based on the approved requirements.
  2. Use a branch name consistent with the repository's existing naming style.
  3. Switch to the new branch.
  4. Proceed to Planning.
* If the current branch is not the main production branch:

  1. Evaluate whether the current branch is appropriate for the approved requirements.
  2. Present the evaluation to the user.
  3. Ask whether to continue on the current branch or switch/create another branch.
  4. Do not proceed to Planning until the user approves the branch to use.

Do not discard uncommitted changes or modify, delete, reset, or force-update existing branches without explicit user approval.

### 4. Planning

Create a concrete implementation plan based on the approved requirements.

* Identify the files and components that need to change.
* Determine the implementation approach.
* Consider compatibility with the existing architecture.
* Define how the implementation will be verified.
* Ensure the plan addresses all approved requirements before starting implementation.

### 5. Implementation

Implement the planned changes and verify them continuously.

#### Implementation and Verification

* Follow the existing codebase conventions and architecture.
* Keep changes focused on the approved requirements.
* Refactor related code when necessary to implement the change cleanly.
* Add or update relevant tests when appropriate.

After making changes:

1. Run the relevant build.
2. Run the relevant tests.
3. If either the build or tests fail, diagnose the failure and modify the implementation.
4. Run the build and tests again.
5. Continue this process until both the relevant build and tests succeed.

Do not proceed to the implementation self-review while the relevant build or tests are failing.

If the same failure continues without meaningful progress for 5 consecutive attempts:

* Stop the implementation loop.
* Do not continue repeating the same unsuccessful fix.
* Report the unresolved failure, likely cause, impact, and recommended next action.

#### Adversarial Implementation Self-Review

Only after the relevant build and tests succeed, perform an adversarial self-review of the implementation.

The primary purpose of this review is to verify that the implementation correctly satisfies the approved requirements.

During the review:

* Do not assume the implementation is correct simply because the build and tests pass.
* Compare the implementation directly against the approved requirements.
* Check each important requirement individually.
* Identify any requirement that is missing, only partially implemented, or implemented differently from what was approved.
* Check whether the implementation introduces behavior that contradicts the approved requirements.
* Check whether existing behavior that should remain unchanged has been unintentionally affected.
* Focus on requirement compliance rather than minor style issues, optional improvements, or unnecessary refactoring.
* Return PASS when the approved requirements are satisfied and no significant requirement-related issue remains.

Review the implementation against:

* the approved requirements
* the existing behavior that must remain compatible
* the relevant tests
* important user-visible behavior

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

* Stop further review cycles.
* Report which requirements remain unsatisfied.
* Explain the impact.
* Provide the recommended next action.

### 6. CI/CD

After Implementation and the implementation self-review are complete, report that the implementation is complete and ask the user whether to proceed with the CI/CD flow.

Proceed only with the operations requested by the user.

If the user gives an instruction that includes multiple stages, such as "deploy", execute the required preceding stages as part of the same flow unless the user explicitly says otherwise.

#### Commit

If the user instructs to commit:

* Review the current changes.
* Inspect recent Git commit history and follow the repository's existing commit message style.
* Create an appropriate commit message based on the implemented requirements and existing commit conventions.
* Commit the relevant changes.

#### Push and CI

If the user instructs to push or run CI:

* Commit any required uncommitted changes first if the instruction clearly includes that step.
* Push the working branch to the remote repository.
* Create or update the pull request when necessary.
* Monitor the CI checks.
* If CI fails, inspect the failure and report the cause and recommended action.
* Do not proceed to deployment while CI is failing.

#### Deploy

If the user instructs to deploy, perform the full delivery flow as needed:

1. Review the current changes.
2. If necessary, commit them using a message consistent with the repository's existing Git history.
3. Push the working branch.
4. Create or update the pull request.
5. Monitor CI and confirm that it succeeds.
6. Merge the pull request into the main branch.
7. Monitor the CD workflow and confirm that deployment succeeds.
8. Access the published application and verify that it is available and that the implemented changes are reflected.
9. In the current workspace, switch to the main branch and update it to the latest remote state.
10. Report the commit, CI result, merge result, CD result, published application verification result, and local main branch update result.

If any required stage fails, stop before the dependent stage and report the failure and recommended next action.

Do not perform operations beyond the scope of the user's instruction unless they are required preceding steps for the requested operation.

Do not discard local changes when switching branches. If local changes prevent safely switching to the main branch, report the situation to the user instead of forcing the switch.

### 7. Completion

When the work is complete or further progress has been stopped by one of the limits above, report:

* What was changed.
* Important implementation decisions.
* Build results.
* Test results.
* Whether the adversarial implementation self-review passed.
* Commit result when applicable.
* CI result when applicable.
* Pull request and merge result when applicable.
* CD and deployment result when applicable.
* Published application verification result when applicable.
* Local main branch update result when applicable.
* Any unresolved requirements or assumptions.
* Any unresolved implementation issues.
* Remaining limitations, risks, or concerns.
* Recommended next actions when applicable.
