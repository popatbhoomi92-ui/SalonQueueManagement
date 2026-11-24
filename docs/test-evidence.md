# Test evidence

This log separates user-confirmed tests, build/static checks, browser observations, and work that remains unverified. A build or mocked test is not evidence that a live Supabase action works.

## Confirmed by user testing

- No completed test result is explicitly confirmed by the user in the available project history.
- The user previously said barber break testing had appeared to work; the current barber screen has the control disabled, so that report does not verify the current implementation.

## Build and static checks

- [x] `npm run build` passed during this task. Vite reports a JavaScript chunk over 500 kB.
- [x] `git diff --check` passed during this task; Git emitted only line-ending conversion warnings.
- [x] English and Gujarati locale key parity: 276 keys each, with no missing keys.
- [x] Searched `src/` for direct Supabase `.insert()`, `.update()`, `.upsert()`, and `.delete()` calls; none were found.

## Browser checks performed during this task

- [x] Home loaded salon hours and the verified queue-summary RPC from the configured Supabase project. The observed summary was 0 waiting and 0 minutes; this does not verify nonzero or null-wait cases.
- [x] Home displayed the configured 10:00–21:00 hours and open status from the current settings response.
- [x] Home English and Gujarati views had no horizontal overflow at measured browser widths of 1425 px and 360 px. The Gujarati view showed localized summary labels and values.
- [x] Join Queue loaded service/barber choices and had no horizontal overflow at a measured 345 px width.
- [x] Unauthenticated `/reception` and `/display` requests showed the staff sign-in gate; no staff queue data was shown.
- [x] Static inspection confirms the Reception walk-in preferred-barber list now filters to `is_on_duty === true` and `is_on_break === false`, while retaining Any Barber. This is a source/build check, not a live barber-selection test.
- [x] No queue registration, cancellation, staff mutation, or other database write was performed during these browser checks.

## Previously reported, not repeated in this task

- A previous browser check reported no horizontal overflow on Reception at 375 px.
- Earlier mocked walk-in checks reportedly covered form validation, safe error messages, optional barber selection, queue refresh, and avoiding direct queue writes. These were mocked checks, not live Supabase registration tests.
- Earlier customer-status checks reportedly covered a not-found response, Gujarati labels, polling, and 360 px layout. They did not enable cross-customer queue reads.

## Not yet verified

- Home RPC error/malformed-response handling, stale-data retry behavior, nonzero counts, and a `NULL` estimated wait.
- A live customer join, cancellation, reception Call Next/walk-in/no-show action, barber Start/Done action, or Admin save.
- Owner access to `/reception`; the deployed `call_next_customer` owner-role check is not documented in this repository.
- Customer queue position, estimated wait, and Start Coming; no safe verified cross-customer/acknowledgement contract is available.
- Barber self-service break/availability; no verified barber-authorized RPC is available.
- Owner authorization for `call_next_customer` and owner access to `/reception`; owner access is intentionally not enabled from frontend role checks alone.
- TV `is_on_break` status; the verified RPC contract has `is_on_duty` but no on-break field, so the display cannot safely distinguish on-break and off-duty barbers.
- Live manual verification of the walk-in barber filter under multiple duty/break combinations.
- Display audio with a newly called token, initial-load suppression, repeated-poll suppression, and browser audio restrictions. The display role and a real call event were not available for this check.
- TV-sized display layout, all staff dashboards at tablet/mobile sizes, multi-device synchronization, and cross-browser behavior.
