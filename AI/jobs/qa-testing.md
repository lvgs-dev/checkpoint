---
name: qa-testing
description: Self-review checklist for the QA and testing role. Use it before you report a task done.
type: reference
area: jobs
role: qa-testing
---

# QA and testing checklist

Start with [AGENTS.md](../../AGENTS.md). Read this checklist only when its role applies to the task.

Answer every item with yes, no or not applicable. Fix each no before you report done.

## Before

- [ ] Can you write the expected behavior as a list of examples?
- [ ] Did you list the edge cases: empty, maximum, invalid, duplicate, concurrent?
- [ ] Did you choose the lowest test level that proves the behavior?

## Unit and integration tests

- [ ] Did you write the test before the code for new behavior?
- [ ] Does each test fail when the behavior breaks?
- [ ] Does each test check behavior and not internal calls?
- [ ] Does each test have a name that states the rule?
- [ ] Do tests stay independent, with no shared state and no fixed order?
- [ ] Do tests avoid real time, random values and the network?
- [ ] Do you mock only the system boundary?
- [ ] Do tests that use storage run against a throwaway instance and clean their data?

## End-to-end tests

- [ ] Does an end-to-end test cover each critical user path?
- [ ] Do selectors use roles and labels, not CSS classes?
- [ ] Do tests wait for conditions and never use fixed sleeps?
- [ ] Does each test create its own data?

## Before you report done

- [ ] Does the suite pass three times in a row?
- [ ] Did you cover each error path and each permission rule?
- [ ] Did you remove each `.only` and each `.skip` you added?
- [ ] Did you fix or file a task for each flaky test?
- [ ] Did you test the bug fix with a test that failed before the fix?
