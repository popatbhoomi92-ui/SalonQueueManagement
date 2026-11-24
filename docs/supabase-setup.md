# Supabase setup and verified contracts

## Source-of-truth warning

This repository contains frontend code, not Supabase migrations or SQL function definitions. The contracts below were supplied or verified during project work, and the fields listed under tables are those used by the app; they are **not complete DDL**. Obtain the original SQL and inspect the deployed project before creating, changing, or granting any database object. Do not recreate missing definitions from these notes.

No service-role key belongs in the browser. The frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Tables used by the app

The following is a purpose-and-observed-fields inventory, not a schema specification.

| Table | Purpose | Fields observed in application queries |
| --- | --- | --- |
| `services` | Service menu, durations, prices, and active state | `id`, `name_en`, `name_gu`, `duration_minutes`, `price`, `is_active` |
| `barbers` | Barber identity, photo, duty, and break state | `id`, `name`, `photo_url`, `is_on_duty`, `is_on_break` |
| `salon_settings` | Public salon hours and online-joining setting | `opening_time`, `closing_time`, `online_queue_enabled` |
| `staff_profiles` | Link an authenticated user to a staff role and, for barbers, a barber | `user_id`, `role`, `barber_id` |
| `queue_entries` | Customer queue entry and status lifecycle | `id`, `customer_name`, `phone`, `queue_day`, `token_number`, `customer_auth_id`, `preferred_barber_id`, `assigned_barber_id`, `status`, `created_at`, `called_at`, `service_started_at`, `completed_at`, `cancelled_at`, `no_show_at` |
| `queue_entry_services` | Service snapshots (name, duration, and price) captured when a customer joins the queue | `id`, `queue_entry_id`, `service_id`, `position`, `service_name_en`, `service_name_gu`, `duration_minutes`, `price` |

Queue rows contain personal data. Do not make them publicly selectable to render Home. Home uses the aggregate RPC below.

## Verified RPC contracts

### Public Home summary

`public.get_home_queue_summary()` takes no arguments and returns:

- `waiting_customer_count` (`bigint`)
- `estimated_wait_minutes` (`numeric`, nullable)

Verified deployment properties: `SECURITY DEFINER`, owner `postgres`, empty `search_path`, and execute grants to `anon` and `authenticated`. It returns only the aggregate values and does not grant direct queue-table access. Keep the public response aggregate-only.

### Customer queue

- `join_salon_queue(p_customer_name text, p_phone text, p_service_ids uuid[], p_preferred_barber_id uuid)` returns a queue-entry UUID. The client signs in anonymously before calling it.
- `cancel_queue_entry(p_entry_id uuid)` returns `void`. It is restricted to `Waiting`; customers may cancel their own entries, and receptionists/owners may cancel entries.

Verified customer RLS restricts `queue_entries` to the authenticated customer's own row (`customer_auth_id = auth.uid()`). As a result, the client cannot calculate cross-customer queue position or ahead-service totals. No verified **Start Coming** RPC is available.

### Reception

- `register_walk_in(p_customer_name text, p_phone text, p_service_ids uuid[], p_preferred_barber_id uuid)` returns a UUID. The verified function permits receptionist/owner roles, validates the phone/services/barber, prevents a duplicate active phone, allocates a daily token, and creates service snapshots.
- `mark_queue_no_show(p_entry_id uuid)` returns `void`. The verified function permits receptionist/owner roles and only changes a `Called` entry after its call has been outstanding for at least 10 minutes.
- The client calls `call_next_customer(p_barber_id uuid)`. Its deployed SQL authorization contract is not stored here; in particular, owner access must be verified before exposing Reception to owners.

Verified queue RLS allows barbers to see entries assigned to their linked barber and receptionists/owners to see queue entries. `queue_entry_services` visibility follows the parent queue entry. The actual policy definitions are not included in this repository.

### Barber service actions

The client calls `start_queue_service(p_entry_id uuid)` and `complete_queue_service(p_entry_id uuid)`. The UI checks for a non-anonymous session, but this client-side check is not a substitute for database authorization. Verify the deployed role/entry checks from the original SQL. No verified barber self-service availability/break RPC is available; the UI leaves those controls disabled.

### TV display

`get_tv_display_queue()` is a read-only `SECURITY DEFINER` function, executable by `authenticated` users only. The verified function restricts calls to users whose `staff_profiles.role` is `display`. It returns barber identity/photo and token-level current/called/next-token information with estimates, not customer names, phone numbers, or customer IDs. Do not broaden its role access for Home.

The verified response currently does not include `is_on_break`. Therefore the frontend must not infer a break status from `is_on_duty` alone. The exact TV response change that would be required is a boolean `is_on_break` field for each barber, with no extra customer data and no change to the display-role-only authorization.

### Remaining backend contracts requiring approval

- **Customer status position and acknowledgement:** no verified RPC or RLS-safe frontend aggregation contract exists for position, personal estimate, or `Start Coming`. The exact approval need is a customer-authorized contract that accepts the customer's own queue-entry ID, verifies ownership, returns only that customer's status/position/estimate/Start Coming eligibility, and provides a separate ownership-and-position-2 verified acknowledgement operation. It must not expose other queue entries or personal fields.
- **Barber availability:** no verified barber-authorized availability RPC exists. The exact approval need is a function that authenticates the staff profile, resolves the user's linked barber, and changes only `is_on_break` for that barber. It must prevent arbitrary-barber updates and preserve off-duty state. Direct table writes and the owner-only Admin RPC are not substitutes.
- **Owner Reception:** no verified deployed-owner authorization is recorded for `call_next_customer(p_barber_id uuid)`. Confirming owner authorization in the existing deployed function is required before owner access can be enabled. No SQL change is needed unless the deployed function is found to reject owners.

### Owner Admin

The owner-only UI uses these write RPCs:

- `admin_upsert_service(p_name_en, p_name_gu, p_duration_minutes, p_price, p_is_active, p_service_id)`
- `admin_upsert_barber(p_name, p_photo_url, p_is_on_duty, p_is_on_break, p_barber_id)`
- `admin_update_salon_settings(p_opening_time, p_closing_time, p_online_queue_enabled)`

These are the approved Admin write paths. Their exact SQL bodies and return types are not in the repository. The fixed salon timezone is `Asia/Kolkata`; the UI does not expose timezone editing.

## Authentication and staff setup

1. Configure the Supabase project URL and public anon/publishable key locally using the variable names below.
2. Enable anonymous authentication for online customer queue joining.
3. Create staff users in Supabase Auth using the project's authorized process.
4. Associate each staff user with a `staff_profiles` row and one of the verified roles: `owner`, `receptionist`, `barber`, or `display`.
5. Link a barber profile to its barber record using `barber_id`.
6. Use separate test users for each role. Do not put passwords, private keys, or real customer details in source control or this document.
7. Verify every function's deployed `EXECUTE` grants and internal role checks using the original SQL. Frontend routes and session checks are not a security boundary.

The exact table constraints, provisioning SQL, and any project-specific account setup are not stored here. Use the original SQL/Supabase project rather than inventing DDL.

## Frontend environment

Create `.env.local` locally with these names only; supply values from the authorized Supabase project configuration:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Only the public anon/publishable key may be used. `src/lib/supabase.js` rejects a service-role/secret key.

## Security checklist

- Keep RLS enabled and enforce customer ownership, barber assignment, and staff role access in the database.
- Do not add broad `SELECT` grants on `queue_entries` or `queue_entry_services` for Home.
- Keep public Home queue output limited to the two verified aggregate fields.
- Keep writes behind the verified RPCs; do not directly write queue, service, barber, or settings tables from the browser.
- Do not use a service-role key in the frontend.
- Do not change function grants or RLS without reviewing the original deployed definitions and reporting the exact change first.
