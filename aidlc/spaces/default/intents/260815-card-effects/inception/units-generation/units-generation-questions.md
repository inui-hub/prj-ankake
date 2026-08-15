# Units Generation Questions

## Q1. Unit boundary strategy

For this modular-monolith implementation, how should work be divided?

- A. By domain capability: catalog/contracts, resolver, engine integration, and verification
- B. By source directory only
- C. By individual card group
- D. By UI and backend deployment targets
- X. Other (please specify)

[Answer]: A. By domain capability: catalog/contracts, resolver, engine integration, and verification (2026-08-15T06:31:00Z; **Mode:** chat)

## Q2. Unit granularity

What unit size should the construction plan use?

- A. Cohesive library-sized units with explicit integration dependencies
- B. One large implementation unit
- C. One unit per card
- D. Fine-grained units per file
- X. Other (please specify)

[Answer]: A. Cohesive library-sized units with explicit integration dependencies (2026-08-15T06:31:00Z; **Mode:** chat)

## Q3. Independent work representation

How should independent concerns be represented in the dependency map?

- A. Keep independent units separate so they may run in parallel when their dependencies permit
- B. Combine all work into one dependency chain
- C. Separate only tests from implementation
- D. Separate only UI work from domain work
- X. Other (please specify)

[Answer]: A. Keep independent units separate so they may run in parallel when their dependencies permit (2026-08-15T06:31:00Z; **Mode:** chat)

## Q4. Integration contract

Which boundary should connect the units?

- A. Typed domain contracts: static catalog snapshot, effect context/result, battle events, and legal-target projection
- B. Direct cross-module imports without a defined contract
- C. UI-facing API contracts only
- D. Runtime configuration files only
- X. Other (please specify)

[Answer]: A. Typed domain contracts: static catalog snapshot, effect context/result, battle events, and legal-target projection (2026-08-15T06:31:00Z; **Mode:** chat)

## Q5. Deployment model

Which deployment model applies to the resulting units?

- A. Embedded libraries in the existing TypeScript modular monolith
- B. Independently deployed services
- C. Hybrid services and embedded libraries
- D. Separate UI deployment for each unit
- X. Other (please specify)

[Answer]: A. Embedded libraries in the existing TypeScript modular monolith (2026-08-15T06:31:00Z; **Mode:** chat)

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
