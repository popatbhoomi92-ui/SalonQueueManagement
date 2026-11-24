# Implementation Status Against Faculty Requirements

**Status reviewed:** 2026-11-24

The original faculty requirements remain in [the project brief](./01-brief.md), [screens and features](./02-screens.md), and [flows and rules](./03-flows-rules.md). Those source documents have not been edited or shortened. This page compares them with the current source code and records gaps explicitly.

“Implemented in code” means the current UI/helpers contain the described path and use the documented contract where one is available. It does not mean every live Supabase action has been tested. See [test evidence](./test-evidence.md) for the distinction between source inspection, browser checks, and unverified live writes.

## Original faculty requirements

The faculty documents specify the following screen and workflow requirements:

- **Home:** show salon hours/open status, live queue count and estimated wait, and each barber's availability as available, busy, or on break; allow customers to start joining.
- **Join Queue:** collect customer details, validate the phone number, allow service and barber selection, and create a queue entry.
- **My Status:** show the token, queue position, estimated wait, called state, and a **Start Coming** acknowledgement when the customer is second; allow cancellation of a waiting entry.
- **Reception:** manage the ordered queue, add walk-ins, call eligible customers, cancel waiting entries, and handle no-shows.
- **Barber View:** show current and next customer information, provide Start/Done service actions, and let the barber mark themselves available or on break.
- **TV Display:** show each barber's current/next tokens and status, including on-break state, and highlight/chime for newly called tokens.
- **Owner Settings:** manage services, barbers/duty, online queue availability, and daily statistics.

These are summaries; the original wording remains in the linked faculty documents.

## Fully implemented in the current code

- **Home hours, open status, and queue summary:** Home loads configured hours and online-joining state, evaluates salon time in `Asia/Kolkata`, and renders the aggregate waiting count and estimated wait. The summary uses `get_home_queue_summary()` and polls every five seconds. The helper validates the aggregate response; it does not fetch queue rows or personal data. See [homeQueue.js](../src/lib/homeQueue.js#L59) and [App.jsx](../src/App.jsx#L851).
- **Join Queue form and submission path:** the client validates the customer name, 10-digit phone, 1–3 selected services, and barber preference; specific barber choices are limited to barbers with `is_on_duty === true` and `is_on_break === false`. Submission uses `join_salon_queue`. See [App.jsx](../src/App.jsx#L322) and [customerQueue.js](../src/lib/customerQueue.js#L27).
- **Queue token/status retrieval and waiting-entry cancellation:** My Status displays the token, current status, selected service snapshots, and assigned barber when called. Cancellation is offered only for Waiting entries and uses `cancel_queue_entry`. This does not include queue position, individual wait estimates, or Start Coming; those gaps are listed below. See [App.jsx](../src/App.jsx#L188) and [customerQueue.js](../src/lib/customerQueue.js#L75).
- **Reception walk-in form, waiting-entry cancellation, and no-show action:** the receptionist UI has these actions. Its walk-in preferred-barber list includes only barbers with `is_on_duty === true` and `is_on_break === false`, while preserving Any Barber. No-show is restricted to a `Called` entry after its call has been outstanding for at least 10 minutes, and submission uses `mark_queue_no_show`; the database contract also enforces that limit. See [ReceptionDashboard.jsx](../src/components/ReceptionDashboard.jsx#L18), [ReceptionDashboard.jsx](../src/components/ReceptionDashboard.jsx#L351), and [receptionQueue.js](../src/lib/receptionQueue.js#L106).
- **Owner Admin features:** the owner-gated dashboard contains service and barber editing, salon-hours/online-queue controls, and daily statistics. Writes use the approved Admin RPCs. See [adminDashboard.js](../src/lib/adminDashboard.js#L16) and [AdminDashboard.jsx](../src/components/AdminDashboard.jsx#L373).
- **TV called-token presentation and optional chime control:** the display renders current/called and next-token information, highlights called tokens in gold with a pulse animation, and provides an explicit enable/mute control. The first loaded snapshot is suppressed; a subsequent new called token can chime once while sound is enabled. See [DisplayDashboard.jsx](../src/components/DisplayDashboard.jsx#L80) and [DisplayDashboard.jsx](../src/components/DisplayDashboard.jsx#L130).
- **English and Gujarati labels:** both locale files contain the interface text used by these screens. Automated key parity is recorded in [test evidence](./test-evidence.md).

## Partially implemented

- **Home barber availability and busy status:** Home loads all barbers and shows **Off duty** when `is_on_duty` is false, **On break** when the barber is on duty and on break, and **On duty** when on duty and not on break. It does not show **Busy** (and labels the third state “On duty,” not “Available”). The public queue RPC returns only an aggregate count and wait, so the Home client has no per-barber customer data from which to determine busy state. The original Home screen requirement asks for available/busy/on-break status.
- **My Status:** token, status, services, called message/assigned barber, and cancellation are present. Queue position and a customer-specific estimated wait render as unavailable, and there is no **Start Coming** action or “You're next” alert. The customer is allowed to read only their own queue entry; no verified safe position/acknowledgement RPC is available. See [App.jsx](../src/App.jsx#L206) and [customerQueue.js](../src/lib/customerQueue.js#L75).
- **Reception access and actions:** Reception is available to authenticated receptionists. The route guard permits only `receptionist`; an owner is routed to `/admin` and cannot open `/reception`. Owner access is intentionally not enabled because the deployed authorization for `call_next_customer` is not verified in the repository. The Reception UI's walk-in, Call Next, cancel, and no-show controls are implemented, but actual live database actions are not confirmed by the test evidence. See [App.jsx](../src/App.jsx#L61).
- **Barber View:** the current token, status, services, elapsed service timer, Start/Done actions, and next eligible token/service snapshots are present. The next-customer query/UI does not include the customer's name, so the faculty's full next-customer information is only partially shown. The barber's break/availability control is visibly disabled because no verified barber-authorized update RPC is available. See [barberQueue.js](../src/lib/barberQueue.js#L27) and [BarberDashboard.jsx](../src/components/BarberDashboard.jsx#L204).
- **TV barber status:** the RPC response and client mapping include `is_on_duty`, but not an on-break flag. The display therefore labels a duty barber **On duty** even if that barber is on break; it can show **Off duty** when `is_on_duty` is false. Current/called/next token data and the optional chime control are present, but the on-break part of the faculty status requirement is not met. See [displayDashboard.js](../src/lib/displayDashboard.js#L12) and [DisplayDashboard.jsx](../src/components/DisplayDashboard.jsx#L51).
- **Responsive and live behavior:** responsive styling and polling are present in code, but the TV-sized layout, all staff dashboards at tablet/mobile sizes, and cross-device synchronization are not verified; see [test evidence](./test-evidence.md).

## Not implemented or intentionally unavailable

- **Customer queue position, personal estimated wait, Start Coming, and “You're next” alert:** not implemented. They require a safe backend contract that exposes the customer's position/estimate or records the acknowledgement without disclosing other customers' records.
- **Home busy state:** not available from the aggregate-only public queue summary. Home must not query or expose other customers' queue records to infer it.
- **Owner access to Reception:** not allowed by the current frontend role guard pending verification of the deployed `call_next_customer` authorization.
- **Barber self-service break/availability changes:** intentionally disabled. The owner-only Admin barber RPC is not used as a substitute for a barber-authorized operation.
- **TV on-break status:** unavailable because the verified TV RPC contract and client response mapper do not include an on-break value.

## Required database approval before the remaining UI features can be enabled

- **Customer position, estimate, and Start Coming:** add a secure customer-authorized backend contract, rather than exposing cross-customer queue rows. The proposed contract must accept the customer's queue-entry UUID and return only that entry's own token, status, queue position, estimated wait, and whether `Start Coming` is eligible. It must verify ownership (`customer_auth_id = auth.uid()` or the project's equivalent), reject other customers' entry IDs, calculate position/estimate using the faculty queue rules, and expose no customer names, phones, IDs, or other entries. A separate secure acknowledgement operation must verify position 2 before recording it. No current RPC satisfies this contract.
- **Barber On Break / Available control:** add a barber-authorized RPC that accepts only the barber's own availability state, or an equivalent no-argument operation. It must verify the authenticated staff profile is a barber and resolve that user's linked barber ID; it must not accept an arbitrary barber ID that permits changing another barber. The operation must set only `is_on_break`, preserve `is_on_duty`, reject off-duty breaks, and return a clear error. Direct browser table updates must not be used. The owner-only Admin barber RPC must not be reused for this purpose.
- **Owner access to Reception:** owner access requires confirmation that the deployed `call_next_customer(p_barber_id uuid)` RPC authorizes owners as well as receptionists. If it does, the route guard may permit both roles. It must not be enabled solely from a frontend role check. No SQL change is required unless owner authorization is absent in the deployed function.
- **TV on-break status:** extend `public.get_tv_display_queue()` to return an `is_on_break boolean` for each barber. Keep its existing `SECURITY DEFINER`, authenticated display-role restriction, aggregate/privacy-safe token fields, and no-PUBLIC/no-anon broadened access. Update the frontend mapper only after the response contract is deployed and approved.

## No-show rule and source-document discrepancy

The operative queue rule in [AGENTS.md](../AGENTS.md#L41) and [flows and rules](./03-flows-rules.md#L28) is **Called -> No-show**, only after the customer has not arrived within 10 minutes of being called. The current Reception UI and verified `mark_queue_no_show(p_entry_id)` contract follow that rule: a Waiting entry cannot be marked No-show, and the action is exposed for an eligible Called entry.

[Screens and features](./02-screens.md#L81) also contains the phrase “No-show and Cancel actions for each waiting customer,” which conflicts with the status-transition/no-show rule above. That original wording has deliberately not been edited or removed here; this discrepancy is recorded so it is not mistaken for the implemented behavior.

## Verification boundary

This status page is based on current source code and the database contracts recorded in [Supabase setup](./supabase-setup.md). It does not claim that untested RPC writes, role authorization in the deployed database, non-zero queue scenarios, or all responsive/device combinations have been verified. See [test evidence](./test-evidence.md) for the current test record.
