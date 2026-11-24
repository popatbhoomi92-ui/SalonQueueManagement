# Project Prompt Log

This log records the original user prompts available in the accessible project conversation history, in chronological order. Prompt text is reproduced verbatim; outcomes and test claims are not inferred here. See [test-evidence.md](./docs/test-evidence.md) for recorded validation evidence.

One long message dated 2026-11-24 is present only as a partial archive, ending mid-sentence. It is noted in sequence below but is not reconstructed. Prompts before the earliest accessible project session (2026-11-22) were not available.

## Prompt 1 — 2026-11-22

~~~~text
We are continuing an existing Salon Queue Management System project.

You are now the primary coding agent because the Codex workspace command runner is failing.

First, inspect the existing workspace. Read these files:

- AGENTS.md
- docs/01-brief.md
- docs/02-screens.md
- docs/03-flows-rules.md
- Existing React source files and package.json
Do not overwrite or delete existing work.

The project is React + Vite + Tailwind CSS, with Supabase JavaScript installed and credentials in .env.local.

For now, do not edit files. Confirm:

1. You can read all four planning documents.
2. You can inspect the existing React files.
3. You understand the existing Supabase integration setup.
Report any access problems or missing information before implementation.
~~~~

## Prompt 2 — 2026-11-22

~~~~text
Great. You have successfully inspected all project documents and source files.

Now begin implementation. You are the ONLY coding agent working on this project.

PHASE 1 — SUPABASE CONNECTION AND CUSTOMER JOURNEY

Before coding:

1. Recheck AGENTS.md and the three planning documents.
2. Inspect the existing database-related information available in the project.
3. Do not guess database columns, RPC parameters, return structures or permissions.
4. If a required detail is unknown, report it instead of inventing it.
IMPLEMENT:

A. Supabase connection

- Create a reusable Supabase client.
- Read VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from environment variables.
- Add a clear configuration error if either is missing.
- Never expose secret or service-role keys.
B. Home page

- Salon name and opening hours.
- Open/closed status.
- Active services and barber availability.
- Live queue information where safely available.
- Join Queue button.
C. Join Queue page

- Customer name.
- Exactly 10-digit phone validation.
- Load active services from Supabase.
- Allow selecting 1–3 services.
- Display service duration and price.
- Allow Any Barber or a specific available barber.
- Show booking summary.
- Submit using the existing join_salon_queue RPC only after verifying its exact signature and behavior.
- Display clear errors and successful token information.
D. Customer status page

- Show token number, queue position and estimated waiting time.
- Refresh data using Supabase Realtime or safe polling.
- Allow cancellation through the existing cancellation RPC.
- Do not expose another customer's phone number or private information.
IMPORTANT:

- Preserve the approved documents.
- Follow the existing English/Gujarati locale structure.
- Follow the charcoal and gold design.
- Do not use fake or hardcoded queue data as if it came from Supabase.
- Do not bypass RLS.
- Do not make unsafe direct database updates.
- Do not build staff/admin screens in this phase.
- Do not change the database schema without reporting the reason first.
After implementation:

1. Run npm run build.
2. Fix all errors.
3. Report changed files.
4. Explain exactly how to test the customer journey.
5. List anything that remains incomplete.
Start implementing now. Do not stop at a plan.
~~~~

## Prompt 3 — 2026-11-22

~~~~text
The actual Supabase credentials are now entered in .env.local. The application opens without the configuration warning.

Continue implementing the Salon Queue Management System.

PHASE 1 — CUSTOMER QUEUE JOURNEY

Use the existing project files and approved documents.

Known database structure:

- services: id, name_en, name_gu, duration_minutes, price, is_active
- barbers: id, name, photo_url, is_on_duty, is_on_break
- queue_entries and queue_entry_services contain customer queue information and selected service snapshots.
- salon_settings contains opening_time, closing_time, timezone and online_queue_enabled.
Verified RPC signatures:

- join_salon_queue(p_customer_name text, p_phone text, p_service_ids uuid[], p_preferred_barber_id uuid) returns uuid
- cancel_queue_entry(p_entry_id uuid) returns void
IMPORTANT:

- Use anonymous Supabase authentication before calling join_salon_queue because the function requires auth.uid().
- Inspect the actual database behavior and existing RLS policies before implementing queries.
- Do not guess missing columns or bypass RLS.
- Use the returned queue entry UUID to load the customer's status.
- Do not expose private customer information.
- Keep credentials out of source code.
Build:

1. Functional home page.
2. Join queue form with 1–3 services.
3. Barber selection.
4. Token confirmation.
5. Customer status page with queue position and estimated waiting time.
6. Cancellation confirmation.
Use English/Gujarati labels and the approved charcoal/gold design.

Run npm run build and fix errors.

Do not stop after making a plan. Implement the working customer journey and report anything blocked by database permissions or missing information.
~~~~

## Prompt 4 — 2026-11-23

~~~~text
The application now opens normally without the Supabase configuration warning.

Next, verify the actual Supabase database connection before building the queue screens.

1. Inspect the existing Supabase client implementation.
2. Create a small temporary connection test using the existing client.
3. Test reading active services from the public.services table.
4. Test reading barbers from the public.barbers table.
5. Check whether anonymous authentication is enabled by attempting signInAnonymously only if there is no existing session.
6. Do not display credentials, customer data, or secret keys.
7. Do not modify database tables, policies or functions.
8. Display clear success or error messages in the application.
9. Run npm run build and fix any errors.
Do not build the queue screens yet. First confirm whether the actual Supabase requests succeed and report the results.
~~~~

## Prompt 5 — 2026-11-23

~~~~text
Supabase connection has now been successfully verified.

Confirmed:

- Anonymous authentication works.
- 6 active services can be read.
- 3 barbers can be read.
- English and Gujarati messages work.
- npm run build passes.
Now implement PHASE 2: THE CUSTOMER QUEUE JOURNEY.

Read AGENTS.md and all three planning documents again.

1. HOME PAGE

- Salon name and logo.
- Opening hours: 10 AM–9 PM.
- Open/closed status.
- Active services and available barbers.
- Join Queue button.

1. JOIN QUEUE PAGE

- Customer name.
- Phone number with exactly 10-digit validation.
- Load active services from Supabase.
- Allow selection of 1–3 services.
- Show each service's duration and price.
- Barber selection: Any Barber or a specific available barber.
- Show total duration and price.
- Submit using the existing join_salon_queue RPC.
- Use anonymous authentication before submission.
- Use the verified RPC parameter names from the existing database function. Do not guess.

1. CONFIRMATION

- Display the token returned by the database.
- Show the successful queue-joining confirmation.
- Provide a button to view status.

1. CUSTOMER STATUS

- Show token, queue position and estimated waiting time.
- Use the actual database columns and approved waiting-time formula.
- Allow cancellation with confirmation using cancel_queue_entry.
- Use Realtime or safe polling.
- Never expose another customer's private information.
DESIGN:

- Charcoal #1F2937 and gold #D4A017.
- Modern, attractive salon design.
- Mobile-first responsive layout.
- English/Gujarati language switch.
- Consistent rounded cards and clear buttons.
SAFETY:

- Do not invent database columns or RPC return structures.
- Do not bypass RLS.
- Do not use fake queue data.
- Do not expose customer phone numbers.
- Do not modify database security policies without reporting first.
- Remove the temporary connection-test UI once the real customer interface replaces it, but preserve useful connection utilities.
Finally:

- Run npm run build.
- Fix all errors.
- Test the customer journey.
- Report working and incomplete features.
Start implementing now. Do not stop at a plan.
~~~~

## Prompt 6 — 2026-11-23

~~~~text
# PHASE 2 CONTINUATION — COMPLETE MY STATUS, CANCELLATION AND LIVE UPDATES
Read `AGENTS.md` and all three project documents before changing code.

The home and join flows are already implemented and build successfully. Supabase connection, anonymous authentication, six active services and three barbers have been verified.

## 1. Verified database contract
Use these actual columns. Do not invent or rename fields.

**public.queue_entries**

- `id` UUID primary key
- `customer_name` text
- `phone` text
- `queue_day` date
- `token_number` integer
- `customer_auth_id` UUID
- `preferred_barber_id` UUID
- `assigned_barber_id` UUID
- `status` text
- `created_at` timestamptz
- `called_at` timestamptz
- `service_started_at` timestamptz
- `completed_at` timestamptz
- `cancelled_at` timestamptz
- `no_show_at` timestamptz
**public.queue_entry_services**

- `id` UUID primary key
- `queue_entry_id` UUID referencing `queue_entries.id`
- `service_id` UUID referencing `services.id`
- `position` integer
- `service_name_en` text
- `service_name_gu` text
- `duration_minutes` integer
- `price` numeric
Unique constraints:

- `(queue_day, token_number)`
- `(queue_entry_id, position)`

## 2. Verified RPC functions
**Join**
`join_salon_queue(p_customer_name text, p_phone text, p_service_ids uuid[], p_preferred_barber_id uuid DEFAULT NULL::uuid)`

Returns: `uuid`

The returned UUID is the new queue entry ID.

**Cancel**
`cancel_queue_entry(p_entry_id uuid)`

Returns: `void`

Cancellation is allowed only for Waiting entries. Customers can cancel their own entries; receptionists and owners can cancel entries too. The function updates `status = 'Cancelled'` and `cancelled_at = NOW()`.

Both functions are SECURITY DEFINER and executable by authenticated users.

## 3. Verified RLS access contract
`queue_entries` SELECT policies:

- Customers: `customer_auth_id = auth.uid()`
- Barbers: entries assigned to their linked barber
- Receptionists and owners: all queue entries
`queue_entry_services` SELECT policy:

- A service row is visible when its parent queue entry is visible through RLS.
Do not bypass RLS. Do not expose customer records to unauthenticated users.

## 4. Implement My Status
Create/finish `/status/:id`.

Display:

- Daily token number, formatted with leading zeros (for example, 001).
- Current status.
- Queue position.
- Estimated waiting time.
- Selected service names, durations and prices using the snapshot columns.
- Appropriate status messages in English and Gujarati.
Use the verified columns only.

Queue position and estimated waiting time must follow `docs/03-flows-rules.md`. Use the documented waiting-time formula; do not invent a different formula.

Read the queue entry using the existing authenticated Supabase session. RLS must enforce ownership. Never retrieve customer data using a service-role key or unrestricted query.

## 5. Implement cancellation
Add a Cancel Queue button for Waiting entries only.

- Show a confirmation dialog before cancellation.
- Call the existing `cancel_queue_entry` RPC with `p_entry_id`.
- Do not directly update the table.
- Handle RPC errors clearly.
- Refresh the status after successful cancellation.
- Hide or disable cancellation once the status is no longer Waiting.
Do not claim cancellation succeeded until Supabase confirms it.

## 6. Live updates
Inspect the current Supabase Realtime configuration and the project's existing code.

Determine whether `queue_entries` and `queue_entry_services` are in the Realtime publication and whether the current RLS policies support the required subscriptions.

Do not modify database security policies or publication settings without first reporting exactly what is missing and why.

If Realtime is available, subscribe only to the customer's permitted queue entry and clean up subscriptions on unmount.

If Realtime is not configured, implement safe polling as a fallback. Do not pretend live updates work if they do not.

## 7. Safety and implementation rules

- Preserve the working Home and Join flows.
- Do not invent table columns, function parameters, return shapes or statuses.
- Do not expose phone numbers or private customer data.
- Do not add fake data.
- Do not use service-role keys in frontend code.
- Do not bypass RLS.
- Keep English and Gujarati translations in the existing locale files.
- Follow the charcoal and gold responsive design.
- Reuse existing components where appropriate.
- Do not modify database policies or SQL functions as part of this task.

## 8. Test and report
Run `npm run build`.

Report:

1. Files changed.
2. My Status implementation.
3. Cancellation implementation.
4. Whether Realtime is configured and verified.
5. Whether polling fallback was needed.
6. Build and test results.
7. Any remaining blockers.
Do not start staff screens or admin screens yet. Complete this customer journey first.
~~~~

## Prompt 7 — 2026-11-24

~~~~text
Continue the Salon Queue Management System.

Before editing, read:
- AGENTS.md
- docs/01-brief.md
- docs/02-screens.md
- docs/03-flows-rules.md

Implement the TV Display Dashboard at `/display`.

Required features:
1. Show salon name and current queue information.
2. Display one card/row per barber with:
   - Barber name and photo if available.
   - Currently serving token, or Available.
3. Show the next five queue tokens in order, with estimated waiting times.
4. Highlight a called token in gold with a visible flashing animation.
5. Support English and Gujarati.
6. Use a large, readable TV-friendly layout.
7. Refresh queue data every five seconds and clean up polling on unmount.

Security requirements:
- Inspect existing database schema, RLS and safe read access first.
- Never expose customer names, phone numbers or private customer records.
- Never bypass RLS or use a service-role key.
- Do not invent public views, RPCs, tables or permissions.
- If RLS prevents displaying tokens or called tokens, report the exact blocker and implement only the safely supported features.
- Do not change database policies or functions without reporting the required changes first.

After implementation:
- Run npm run build.
- Run git diff --check.
- Test at TV-sized and mobile-sized viewports.
- Report changed files, completed features, blocked features and testing results.
- Do not claim database functionality was tested unless it actually was.
~~~~

## Prompt 8 — 2026-11-24

~~~~text
Continue the Salon Queue Management System project.

The Supabase function `public.get_tv_display_queue()` has now been created successfully and corrected. It is a SECURITY DEFINER, read-only function that:

- Allows only authenticated users whose `staff_profiles.role = 'display'`.
- Returns barber information, current token, called token, and the next five eligible waiting tokens with estimated waits.
- Does not return customer names, phone numbers, or customer IDs.
- Is executable by `authenticated` only.
Task:

1. Inspect the existing `/display` implementation, especially `DisplayDashboard.jsx`, `displayDashboard.js`, staff authentication helpers, and Supabase client.
2. Connect the TV dashboard to this RPC using `supabase.rpc('get_tv_display_queue')`.
3. Preserve the existing display-role authentication guard.
4. Map the RPC response to the existing UI carefully. Do not assume response field names without checking the SQL function.
5. Show each barber's current token, called token, and next five tokens with estimated waits.
6. Add the called-token gold highlight and chime only if the existing UI supports it safely. Avoid repeated chimes during polling; notify only when a new called token appears.
7. Keep five-second polling, cleanup on unmount, English/Gujarati labels, responsive layout, and stale-data/error handling.
8. Do not query `queue_entries` or `queue_entry_services` directly from the browser.
9. Do not modify Supabase policies, database functions, table permissions, or credentials.
10. Do not expose customer names, phone numbers, customer IDs, or service prices.
After editing:

- Run `npm run build`.
- Run `git diff --check`.
- Inspect the final diff and report every changed file.
- Do not commit or push.
- Preserve all existing uncommitted work.
If the RPC response or UI contract is unclear, stop and report the exact issue instead of guessing.
~~~~

## Prompt 9 — 2026-11-24

~~~~text
Continue the Salon Queue Management System.

Task: Enable the No-show action in the Reception Dashboard.

Existing verified database contract:

- RPC: `mark_queue_no_show(p_entry_id uuid)`
- Returns: void
- Allowed roles: receptionist and owner
- Only permits a queue entry with status `Called` when `called_at` is at least 10 minutes old.
- The database function performs the status update. Do not update queue tables directly.
Instructions:

1. Inspect ReceptionDashboard.jsx, receptionQueue.js, staffAuth.js and locale files.
2. Find the existing disabled No-show control.
3. Enable it using supabase.rpc('mark_queue_no_show', { p_entry_id: entryId }).
4. Show the action only for eligible Called entries.
5. Handle database errors clearly, including entries that have not yet reached the 10-minute limit.
6. Refresh queue data after successful completion.
7. Preserve existing role guards, polling, English/Gujarati translations and responsive layout.
8. Never expose customer phone numbers unnecessarily.
9. Do not modify SQL, RLS policies, permissions or other database functions.
10. Do not implement walk-in functionality in this task.
After implementation:

- Run npm run build.
- Run git diff --check.
- Inspect the diff.
- Report changed files and how to test.
- Do not commit or push.
- Preserve all existing uncommitted changes.
~~~~

## Prompt 10 — 2026-11-24

~~~~text
Continue the Salon Queue Management System.

Next task: investigate how to safely implement receptionist walk-in registration.

Inspect:

- ReceptionDashboard.jsx
- receptionQueue.js
- Existing Supabase RPC functions and their known contracts
- Existing queue schema and RLS policies available in the project
Determine:

1. Whether an existing RPC supports walk-in registration.
2. Whether it can create a queue entry without customer anonymous authentication.
3. Whether it supports customer name, phone, up to three services, and preferred barber.
4. Whether it allocates a daily token and enforces one active queue entry per phone.
5. Whether receptionist/owner permissions are verified.
Do not edit any files.
Do not create SQL functions or change RLS.
Do not invent an RPC or assume table INSERT permissions.

Report the exact existing RPC contract if one supports walk-ins. Otherwise, identify what database support is missing.

Preserve all existing uncommitted changes.
~~~~

## Prompt 11 — 2026-11-24

~~~~text
Continue the Salon Queue Management System.

Task: Implement receptionist walk-in registration using the verified Supabase RPC `register_walk_in`.

Database contract:

- Function: `register_walk_in`
- Arguments:

- `p_customer_name`: text
- `p_phone`: text
- `p_service_ids`: uuid[]
- `p_preferred_barber_id`: uuid or null
- Returns: uuid (new queue entry ID)
- Execution permission: authenticated only.
- Database authorization: function permits only authenticated users whose `current_staff_role()` is `receptionist` or `owner`.
- Customer auth ID is stored as NULL for walk-ins.
- Function validates 10-digit phone, 1–3 distinct active services, preferred barber, duplicate active phone, daily token allocation, and service snapshots.
- Walk-ins are allowed even when online queue joining is closed.
Instructions:

1. Inspect the existing ReceptionDashboard.jsx, receptionQueue.js, customerQueue.js, App.jsx, locale files, and AGENTS.md before editing.
2. Implement the Add Walk-in form in the existing receptionist dashboard.
3. Collect customer name, 10-digit phone, 1–3 services, and optional preferred barber (Any Barber allowed).
4. Load services and barbers using existing safe read helpers where possible.
5. Call only:
supabase.rpc('register_walk_in', {
p_customer_name,
p_phone,
p_service_ids,
p_preferred_barber_id
})
6. Do not directly insert into queue tables.
7. Validate inputs in the UI, but treat database validation as authoritative.
8. Show a clear success message and refresh the queue after successful registration.
9. Show useful database errors without exposing sensitive details.
10. Add English and Gujarati translations for every new label, validation message, and result.
11. Preserve existing reception actions, no-show logic, polling, and role guards.
12. Do not change database SQL, RLS, or other RPCs.
13. Do not edit unrelated files.
14. Preserve all existing uncommitted changes.
After editing:

- Run npm run build.
- Run git diff --check.
- Report changed files and tests.
- Do not commit or push.
~~~~

## Prompt 12 — 2026-11-24

~~~~text
Inspect the current Admin Dashboard implementation in `D:\SalonQueueManagement`.

Do not edit any files or execute database changes.

Check:

1. `src/components/AdminDashboard.jsx` (or the actual Admin component).
2. Related Supabase helper files.
3. How services, barbers and salon settings are currently loaded.
4. Which database columns the Admin interface needs to update.
5. Whether any existing RPC functions support Admin updates.
6. Whether the frontend already checks for the owner role.
Compare the implementation with the known database permissions:

- services: authenticated SELECT granted; no write grants.
- barbers: authenticated SELECT granted; no write grants.
- salon_settings: authenticated SELECT and all write grants absent.
- RLS enabled on all three.
- Existing policies only allow SELECT.
Report the exact files, functions, columns and missing database operations.

Do not assume table schemas or invent RPC contracts. Preserve all existing changes.
~~~~

## Prompt 13 — 2026-11-24

~~~~text
Inspect the entire project for every Supabase read of the `salon_settings` table.

Do not edit files or execute SQL.

Report:

1. Every file that reads `salon_settings`.
2. The exact columns selected by each query.
3. Whether each query runs for anonymous customers, anonymous-authenticated customers, or staff.
4. Which columns are required for the Admin Dashboard.
5. Which columns are required for the customer Join Queue and Home screens.
6. Whether any code uses `select('*')`.
7. Whether any query needs `current_queue_day` or `next_token_number`.
Important database facts:

- RLS is enabled.
- Existing SELECT policy is `Public can view salon settings`, with `qual = true`, for `{anon, authenticated}`.
- Authenticated has no table-level SELECT grant.
- We must not grant broad table SELECT access without reviewing exposure.
- The salon timezone must remain fixed at `Asia/Kolkata`.
Preserve all existing changes. Report findings only.
~~~~

## Prompt 14 — 2026-11-24

~~~~text
Implement the Admin Dashboard editing functionality in the existing Salon Queue Management project.

First inspect the current Admin component, `src/lib/adminDashboard.js`, locale files, routing, and project AGENTS.md.

Three database RPC functions have already been created and security-verified. Use these exact contracts:

1. `admin_upsert_service`
Arguments:

- p_name_en
- p_name_gu
- p_duration_minutes
- p_price
- p_is_active
- p_service_id (null when adding a new service)

1. `admin_upsert_barber`
Arguments:

- p_name
- p_photo_url
- p_is_on_duty
- p_is_on_break
- p_barber_id (null when adding a new barber)

1. `admin_update_salon_settings`
Arguments:

- p_opening_time
- p_closing_time
- p_online_queue_enabled
Requirements:

- Use `supabase.rpc()` only for writes to these three tables. Never use direct insert/update/upsert/delete table operations.
- Keep the existing owner-only route and session checks.
- Add forms to create and edit services.
- Add forms to create and edit barbers and manage duty/break status.
- Add controls for opening time, closing time and online queue availability.
- Preserve the fixed Asia/Kolkata timezone. Do not expose timezone editing.
- Preserve queue day and token counter.
- Refresh displayed data after successful saves.
- Show localized English and Gujarati success and error messages.
- Validate form values before RPC calls.
- Prevent duplicate submissions while saving.
- Keep the existing visual design and responsive layout.
- Do not expose raw database errors or customer personal information.
- Do not change RLS policies, grants or SQL functions.
- Do not modify unrelated queue functionality.
- Preserve all existing uncommitted changes.
After implementation:

1. Run npm run build.
2. Run git diff --check.
3. Inspect the final diff for unintended changes.
4. Report every changed file and how to test each Admin feature.
5. Clearly distinguish mocked tests from actual live Supabase tests.
Do not commit or push.
~~~~

## Prompt 15 — 2026-11-24

~~~~text
Review the current Admin Dashboard implementation in `D:\SalonQueueManagement`.

Important rules:

- Read `AGENTS.md` and the relevant project documentation first.
- Do not edit or modify any files.
- Do not change Supabase database functions, RLS policies, grants, or schema.
- Preserve all existing uncommitted changes.
- Inspect the Admin Dashboard changes and verify that service, barber, and salon settings saves use only the approved RPCs:

- `admin_upsert_service`
- `admin_upsert_barber`
- `admin_update_salon_settings`
- Check for accidental direct database writes, security issues, validation problems, or unrelated changes.
- Run `npm run build` and `git diff --check`.
Report:

1. Any issues found.
2. Files changed.
3. Build and diff-check results.
4. Whether the Admin changes are ready to commit.
Do not commit or push anything.
~~~~

## Prompt 16 — 2026-11-24

~~~~text
Fix only the two issues identified in the latest Admin Dashboard review.

Project: `D:\SalonQueueManagement`

First read `AGENTS.md` and relevant documentation.

1. In `AdminDashboard.jsx`, reject an empty service price explicitly. Do not allow `Number('')` to silently become 0. A genuine price of 0 must still be allowed.
2. Add a synchronous duplicate-submission guard so rapid clicks cannot trigger duplicate RPC calls. Preserve existing loading states and user feedback.
Important:

- Do not change Supabase SQL functions, grants, RLS, tables, or schema.
- Do not make direct database writes.
- Keep all Admin writes using the three approved RPCs.
- Preserve all existing uncommitted work.
- Do not modify unrelated files.
- Check whether the settings-read concern is actually valid given the existing column-level SELECT permissions. Do not change permissions.
- Check the faculty requirements before deciding whether average-wait statistics are missing or optional.
After changes:

- Run `npm run build`.
- Run `git diff --check`.
- Report exactly which files changed and what was fixed.
- Do not commit or push.
~~~~

## Prompt 17 — 2026-11-24

~~~~text
Implement the missing average waiting time statistic in the Admin Dashboard.

Project: `D:\SalonQueueManagement`

First read AGENTS.md and the faculty documentation.

Requirements:

- Calculate average waiting time for today's completed queue entries.
- Use existing queue timestamps. Inspect the schema and determine the correct timestamps before coding.
- Do not create a new database table or SQL function.
- Do not change RLS, grants, or database schema.
- Do not expose customer phone numbers or other unnecessary personal data.
- Handle zero completed entries gracefully.
- Add English and Gujarati labels.
- Keep the existing Admin owner-only protection.
- Preserve all uncommitted changes.
- Modify only files necessary for this statistic.
Run `npm run build` and `git diff --check`.
Do not commit or push.

Report the calculation formula and files changed.
~~~~

## Prompt 18 — 2026-11-24

~~~~text
Perform a final read-only review of my Salon Queue Management project.

Project folder: `D:\SalonQueueManagement`

First read:

- AGENTS.md
- All files in docs/
Review the entire project, including tracked, modified, and untracked files.

Check:

1. All seven required screens are present and correctly routed.
2. Customer online registration and status.
3. Reception queue, walk-ins, Call Next, cancellation and no-show.
4. Barber Start, Done, break and availability.
5. TV display and its role protection.
6. Admin services, barbers, salon settings and daily statistics.
7. English and Gujarati translations.
8. Supabase RPC usage, authentication and role permissions.
9. Mobile responsiveness and obvious UI problems.
10. README and required submission documentation.
Rules:

- Do not edit, delete, reset, or overwrite any files.
- Do not modify Supabase database objects.
- Preserve all uncommitted changes.
- Do not commit or push.
- Do not claim a feature is verified unless the code or test evidence supports it.
Run npm run build and git diff --check.

Report:

- Critical issues that must be fixed.
- Minor issues that can wait.
- Missing faculty deliverables.
- Exact list of modified and untracked files.
- Whether the project is ready for final commit and deployment.
~~~~

## Prompt 19 — 2026-11-24

~~~~text
Fix the two Home page requirement gaps identified in the final project review.

Project: D:\SalonQueueManagement

First read AGENTS.md and all relevant project documentation.

Required changes:

1. Add a live queue summary to the Home page:

- Number of customers currently waiting.
- Estimated waiting time.
- Use the existing queue data and approved queue rules.
- Do not expose customer names or phone numbers publicly.
2. Replace the hard-coded opening hours with the actual opening_time and closing_time from salon_settings.

- Keep the existing English and Gujarati translations.
- Display the correct open/closed status using the salon's Asia/Kolkata timezone.
Rules:

- Inspect existing helpers before writing new code.
- Reuse existing data-loading functions where appropriate.
- Do not modify Supabase schema, RLS, grants, or SQL functions.
- Do not introduce direct database writes.
- Preserve all uncommitted work.
- Do not modify unrelated screens.
- Do not commit or push.
After implementation:

- Run npm run build.
- Run git diff --check.
- Report files changed and how the live queue count and estimated wait are calculated.
~~~~

## Prompt 20 — 2026-11-24

~~~~text
Read `AGENTS.md` and `docs/03-flows-rules.md`.

Investigate how to implement a privacy-safe public Home queue summary.

Requirements:

1. Inspect the existing Supabase SQL functions, RLS policies, grants, and queue schema available in the project or documented context.
2. Determine whether an existing function can safely return only:

- Waiting customer count.
- Estimated wait in minutes.
3. The public Home page must never receive customer names, phone numbers, queue IDs, or individual queue records.
4. Do not create or modify any SQL, database function, policy, grant, or frontend file yet.
5. Do not assume that a staff-only queue helper or TV RPC is publicly accessible.
6. If a safe implementation is possible, describe the exact proposed database function, authorization, calculation, and frontend integration.
7. If it is not possible, explain precisely what database change and permission would be required.
Do not edit files, commit, or push. Report your findings and any security concerns.
~~~~

## Prompt 21 — 2026-11-24 — partial archive, not reproduced

The accessible conversation archive contains the beginning of a long “Complete Remaining Work — Salon Queue Management System” prompt, but the message ends mid-sentence at “Do not grant new database permissions or weaken R”. Because the original prompt text is incomplete, it is not reproduced or reconstructed here.

## Prompt 22 — 2026-11-24

~~~~text
Perform a read-only code review of the latest Salon Queue Management System changes.

Read AGENTS.md and inspect the complete current Git diff, including all newly created files.

Pay particular attention to:

1. `homeQueue.js`: RPC response validation, polling cleanup, error handling, stale data, and null estimated wait.
2. `App.jsx`: Home integration, configured salon hours, and open/closed logic.
3. `DisplayDashboard.jsx`: chime triggering, initial-load suppression, repeated polling, and browser audio restrictions.
4. `BarberDashboard.jsx` and `ReceptionDashboard.jsx`: duplicate-submit guards and role restrictions.
5. `StaffAccess.jsx`: login submission behavior.
6. English and Gujarati locale completeness.
7. README and Supabase setup instructions: check for invented deployment URLs, credentials, SQL definitions, or unsupported claims.
8. `prompts.md` and `test-evidence.md`: ensure they distinguish confirmed tests from unverified ones.
Do not edit any files. Do not commit or push. Do not change database objects.

Report:

- Any bugs or regressions found.
- Any security concerns.
- Any incorrect or unsupported documentation.
- Whether the latest changes are safe to proceed to manual testing.
- Exact file names and relevant code locations for each issue.
~~~~

## Prompt 23 — 2026-11-24

~~~~text
Make a narrowly scoped fix for barber availability in the Salon Queue Management System.

First read AGENTS.md and inspect the relevant parts of App.jsx.

Problems found:

1. In the Join Queue barber selection list, a barber is currently selectable when they are not on break, even if `is_on_duty` is false.
2. On the Home barber roster, every barber who is not on break is labelled “On duty,” even when `is_on_duty` is false.
Requirements:

- A barber is selectable for customer preference only when `is_on_duty === true` AND `is_on_break === false`.
- Home must show an accurate status for all combinations:

- Off duty when `is_on_duty === false`.
- On break when on duty and `is_on_break === true`.
- On duty when on duty and not on break.
- Reuse existing English and Gujarati translation keys if suitable. If new keys are needed, add matching keys to both locale files.
- Do not change database functions, RLS, queue rules, authentication, or unrelated UI.
- Do not remove or modify existing user work.
- Run `npm run build` and `git diff --check`.
- Report the exact files changed and how I can verify the fix manually.
- Do not commit or push.
~~~~

## Prompt 24 — 2026-11-24

~~~~text
Read AGENTS.md, package.json, package-lock.json, and README.md.

Resolve the Node.js version compatibility mismatch:

- package.json currently declares Node 20.19 support.
- The locked Supabase JS dependencies declare Node >=22.
Set the project's minimum supported Node version to Node 22, using an appropriate engines declaration. Update any corresponding Node version statement in README.md so both agree.

Do not upgrade or downgrade dependencies.
Do not change application code, database objects, or other documentation.
Preserve all existing uncommitted work.
Run npm run build and git diff --check.
Report exact files changed and results.
Do not commit or push.
~~~~

## Prompt 25 — 2026-11-24

~~~~text
Read AGENTS.md and docs/supabase-setup.md.

Find the statement describing queue_entry_services service snapshots as "Immutable".

Change only that wording to accurately state that the queue stores service snapshots (service name, duration and price) when a customer joins the queue. Do not claim they are immutable because that behavior has not been verified.

Do not change SQL, database objects, application code, or unrelated documentation.
Preserve all existing uncommitted changes.
Run git diff --check.
Report the exact change.
Do not commit or push.
~~~~

## Prompt 26 — 2026-11-24

~~~~text
Read AGENTS.md, README.md, prompts.md, docs/test-evidence.md, and all project documentation.

Perform a read-only final documentation and Git review.

Check:

1. prompts.md accurately records the prompts used in their original order, including failed or revised prompts where available. Do not invent missing prompts.
2. docs/test-evidence.md accurately records the manual tests actually completed. Clearly distinguish manually tested, build-tested, and not tested.
3. README.md contains no placeholder live URL or invented credentials.
4. Documentation accurately describes implemented and unimplemented features.
5. Inspect git status --short --untracked-files=all and the complete diff, including untracked files.
6. Confirm .env.local and all secrets are ignored and not staged or committed.
7. Identify any unrelated, temporary, or test files that should not be submitted.
Do not edit any files. Do not stage, commit, push, deploy, or modify the database.

Report:

- Documentation gaps.
- Any security or submission concerns.
- Exact list of files that should be included in the repository.
- Exact files that should be excluded.
- Whether the worktree is ready for final review before committing.
~~~~

## Prompt 27 — 2026-11-24

~~~~text
Read AGENTS.md and inspect customerQueue.js and App.jsx.

The final review found that the Home barber data helper filters out off-duty barbers. This prevents the Home screen from displaying the Off duty status correctly.

Fix this narrowly:

1. Home must receive all barbers, including off-duty and on-break barbers, so it can display accurate statuses.
2. Join Queue must continue allowing selection only when `is_on_duty === true` and `is_on_break === false`.
3. Do not change database permissions, SQL functions, queue rules, authentication, or unrelated screens.
4. Preserve existing uncommitted work.
5. Run npm run build and git diff --check.
6. Report exact files changed and explain how to test Home and Join Queue manually.
Do not commit or push.
~~~~

## Prompt 28 — 2026-11-24

~~~~text
Read AGENTS.md and the existing prompts.md.

Complete prompts.md using only the original prompts that are actually available in the project files or accessible conversation history.

Requirements:

1. Record prompts in their original order.
2. Include revised or failed prompts only when their original wording is available.
3. Do not invent prompts, dates, results, or claim that a prompt was used when it cannot be verified.
4. If some earlier prompts are unavailable, add a short transparent note explaining that the historical prompt text was not available.
5. Keep the document clear and suitable for faculty submission.
Do not modify application code or other files.
Do not commit or push.
Report what you added and what historical information was unavailable.
~~~~
