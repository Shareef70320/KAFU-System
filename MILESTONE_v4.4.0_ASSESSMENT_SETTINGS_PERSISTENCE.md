# Milestone v4.4.0 – Assessment Settings Persistence

Date: 2025-10-06

## Scope
Ensure assessment settings persist correctly, specifically `numberOfQuestions`, and reflect in the UI immediately.

## Changes
- Frontend `NewAssessments.js`
  - Use `numberOfQuestions` from API on cards.
  - Edit modal sends camelCase payload with `numberOfQuestions` and `applyToAll` handling.
  - After save, invalidate and refetch `['new-assessments']` to avoid stale cache.

- Backend `routes/assessments.js`
  - Update route now persists: `numberOfQuestions`, `shuffleQuestions`, `allowMultipleAttempts`, `showTimer`, `forceTimeLimit`, `showDashboard`, `showCorrectAnswers`, `showIncorrectAnswers`.
  - Support `applyToAll` by translating to `competencyId = null`.

## Verification
- Edited "Default Assessment 2": changed Number of Questions from 8 → 12. The value persisted and the card updated to "12 Questions" after save.

## Operations
- Rebuilt backend with `--no-cache` and restarted service to ensure latest code was active.
- Rebuilt frontend and refreshed queries after mutation.

## Impact
- Admin can reliably manage assessment settings; UI reflects latest values.

## Artifacts
- SUCCESS_PATTERNS.md updated with a pattern for persisting new fields in update APIs.


