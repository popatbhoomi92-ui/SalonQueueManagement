# Salon Queue Management System
**Live demo:** Not deployed (no verified URL provided)
**Hosting platform:** Not configured

A bilingual queue-management app for salon customers and staff. Customers can join today's queue and track their token; receptionists and barbers manage service flow; owners maintain the salon menu and settings.

See [implementation status against faculty requirements](docs/implementation-status.md) for a screen-by-screen distinction between the original requirements and what the current code implements, partially implements, or leaves unavailable.

## Features and roles

- **Customers:** View the public queue summary, configured salon hours, services, and duty/break labels that are available from the public barber data; join online; view token/status and selected services; cancel a waiting spot. Queue position, customer-specific wait, and Start Coming remain incomplete pending a secure customer-authorized backend contract.
- **Receptionists:** View today's queue, register walk-ins, call eligible customers, cancel waiting entries, and mark a called entry as no-show only after it has been called for at least 10 minutes.
- **Barbers:** View their current work and next eligible token/service snapshots, and use Start/Done for service transitions. Barber self-service break/availability controls are disabled.
- **Owners:** Manage services, barbers, salon hours, online queue availability, and daily statistics.
- **Display staff:** Show the TV queue display with called-token highlighting and an optional browser-enabled chime. The display does not currently distinguish on-break barbers.
- English and Gujarati interfaces; responsive layouts; `Asia/Kolkata` salon-time calculations.

## Technology

- React 19 and Vite
- Tailwind CSS 4
- Supabase JavaScript client
- Node.js `>=22.12.0` (per `package.json`)

## Run locally

1. Install the supported Node.js version.
2. Install dependencies:

   ```sh
   npm ci
   ```

3. Create a local `.env.local` file with the required variable names and values from your own Supabase project:

   ```text
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   ```

   Use only the public anon/publishable key. Never put a service-role or secret key in frontend configuration.

4. Start the development server:

   ```sh
   npm run dev
   ```

5. Create a production build:

   ```sh
   npm run build
   ```

There is no automated test script in `package.json`. See [manual test evidence](docs/test-evidence.md) for what has and has not been verified.

## Supabase setup

The app expects an existing Supabase project with the required tables, policies, and RPCs. The repository does not contain their SQL definitions. See [Supabase setup and verified contracts](docs/supabase-setup.md); use the original project SQL for any database setup rather than reconstructing definitions from client code.

Anonymous authentication must be enabled for online customer queue joining. Staff sign in through Supabase Auth and need a matching `staff_profiles` row with an allowed role; barber profiles also require a barber link. Create separate test accounts in your own project and assign roles through its authorized database administration process. Do not store test passwords in this repository.

## Known limitations

- Customer queue position, customer-specific estimated wait, and **Start Coming** are not implemented: the customer's RLS access is limited to their own entry, and no verified aggregate/acknowledgement contract is available.
- Barber self-service break/availability controls remain disabled because no verified barber-authorized update RPC is available. Owner-only Admin RPCs are not used for barber self-updates.
- An owner can view all queue rows according to the verified RLS contract, but `/reception` remains receptionist-only until the `call_next_customer` owner authorization is verified.
- Home reads all barber duty/break flags and shows Off duty, On break, or On duty. Its queue summary is aggregate-only, so Home cannot determine whether an on-duty barber is busy with a customer.
- The TV display RPC does not return an on-break flag, so the display cannot show an accurate On break state.
- The Reception walk-in preferred-barber dropdown is source-side filtered to on-duty, non-break barbers, but this live combination remains subject to manual Supabase testing.
- TV audio requires an explicit user gesture to enable. If browser audio is unavailable or suspended, the called-token highlight remains.
- The database SQL, RLS policy definitions, and grants are not stored here; database deployment and live authorization must be verified in the original Supabase project.
- No production deployment URL or hosting platform has been verified.
