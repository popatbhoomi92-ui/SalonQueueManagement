# AGENTS.md

## Project summary

Salon Queue Management System lets salon customers join the live queue, track their position, and see when they are called. Receptionists and barbers manage the queue, while owners maintain services, barbers on duty, and online queue availability.

## Required documents

Read these documents before making project changes. They are the source of truth for requirements:

- [Project brief](docs/01-brief.md) - problem, users, scope, and exclusions.
- [Screens and features](docs/02-screens.md) - screen content, behavior, and responsive layouts.
- [Flows and rules](docs/03-flows-rules.md) - customer flows, queue rules, waiting-time calculation, and test checklist.

## Technology stack

- React
- Vite
- Tailwind CSS
- Follow the faculty-required project setup. Run the application with `npm run dev`.
- Choose the simplest storage that keeps phone, tablet, and TV views in sync. Explain the choice before using it.

## Design rules

- Build a premium, clean salon interface.
- Use charcoal `#1F2937` and gold `#D4A017` as the theme colors.
- Use a mobile-first responsive design for phone, tablet, desktop, and the waiting-area TV where relevant.
- Support English and Gujarati.
- Keep all visible interface labels in language files. Do not hard-code visible labels in components.
- Keep components organized and reusable.

## Queue rules

- Keep queue logic in one central place and follow [docs/03-flows-rules.md](docs/03-flows-rules.md) exactly.
- Preserve first-come, first-served order. For a barber, call the earliest waiting customer who selected that barber or **Any Barber**.
- Respect specific barber preferences. Never assign a customer who selected a specific barber to a different barber.
- A barber can have only one customer in the chair at a time. A barber on break is unavailable for a new customer.
- Use the faculty waiting-time formula exactly: `Estimated waiting time = Total service minutes ahead ÷ Number of barbers working.` The estimate is approximate and decreases as customers ahead finish their services.
- Prevent duplicate active queue entries for the same phone number. If the number already has an active spot, show that spot instead of creating another.
- Allow only the documented status transitions: **Waiting -> Called -> In chair -> Done**, **Waiting -> Cancelled**, and **Called -> No-show**. Statuses never move backwards.
- Follow the documented no-show rule: reception may mark a customer **No-show** if they have not arrived within 10 minutes after being called. If they return later, add them as a new entry at the end of the queue.
- Online joining closes 30 minutes before closing; walk-ins remain allowed.

## Working rules for Codex

- Work on one step at a time. Do not build everything in one prompt.
- Before editing, inspect existing files and understand the project structure.
- Do not overwrite working code unnecessarily.
- Do not add features excluded in [docs/01-brief.md](docs/01-brief.md).
- Do not introduce a new technology or dependency without explaining why.
- After completing a task, report:
  - Files created or modified.
  - What was implemented.
  - How the user can test it.
  - Any issues still remaining.
- Do not move to the next step until the user approves the current step.
- Do not write application code until all four planning documents have been reviewed and approved by the user.

## Testing rules

- Follow the test checklist in [docs/03-flows-rules.md](docs/03-flows-rules.md).
- Test responsive layouts on phone, tablet, and desktop; check the TV display where relevant.
- Verify English and Gujarati labels.
- Verify queue synchronization across devices.
