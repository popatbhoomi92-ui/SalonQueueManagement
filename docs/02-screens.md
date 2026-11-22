# Salon Queue Management System - Screens & Features

This document describes the seven application screens, their layout and behavior. Labels are available in English and Gujarati. The visual style follows the brief: premium salon feel, dark charcoal background, gold accents, clean mobile-first layouts.

## Screen 1: HOME - `/`

**Who uses it and why:** Customers use Home to check whether the salon is open, see queue conditions and barber availability, and begin joining the queue.

**UI elements, top to bottom:**

1. Salon logo and salon name.
2. Open/closed status badge. When open, show the closing time.
3. Live queue summary: number of customers waiting and estimated waiting time.
4. Barber availability list with each barber's name and current status (available, busy, or on break).
5. Prominent gold **Join Queue** button.

**Buttons:**

- **Join Queue:** Opens Join Queue at `/join`. If online joining is closed, the button is disabled and an explanation is shown.
- The logo and status/availability display are informational and do not act as buttons.

**Responsive layout:** On mobile, stack the summary and barber list in a single column and keep Join Queue easy to reach. On tablet, use wider cards or place the queue summary beside barber availability. On a TV/large screen, use larger type and cards with clear spacing; the screen remains a customer entry point rather than the dedicated live TV board.

**Empty and error states:** With no one waiting, show "No customers waiting" and an estimated wait of 0 minutes. If no barbers are on duty, explain that service is currently unavailable and disable Join Queue. If live data cannot load, show that queue information is temporarily unavailable and offer a **Retry** button; Retry reloads the live information.

## Screen 2: JOIN QUEUE - `/join`

**Who uses it and why:** Customers use this form to request a place in today's queue and review their selected services before confirming.

**UI elements, top to bottom:**

1. Customer name field.
2. Phone number field with a 10-digit requirement and inline validation.
3. Selectable service list. Each service shows its English and Gujarati names, duration, and price. Customers may select up to three services.
4. Barber choice: **Any Barber** or a specific available barber.
5. Live booking summary showing selected services, combined duration, price total, and barber choice.
6. **Confirm** button.

**Buttons and controls:**

- Service cards or checkboxes select and deselect a service. The selection cannot exceed three services; explain the limit if the customer tries to select another.
- Barber options select either Any Barber or one specific barber. Selecting a new option replaces the previous choice.
- **Confirm:** Validates the name, exactly 10 phone digits, at least one service, the three-service maximum, and a barber choice. On success, creates one queue entry and opens My Status at `/status/:id`. If validation fails, keep the form values and show the error beside the relevant field or selection.

**Responsive layout:** On mobile, stack fields and service cards, use comfortable tap targets, and keep the live summary and Confirm action easy to review. On tablet, show service cards in a wider grid with the summary alongside where space allows. On TV/large screens, keep the same form usable with larger controls; the page is intended primarily for a customer's phone.

**Empty and error states:** If no services are active, explain that online joining is unavailable and disable Confirm. If no barbers are available, explain this and disable barber selection/Confirm. Show inline errors for a blank name, a phone number that is not exactly 10 digits, no service selected, or no barber option selected. If submission fails, preserve the entered data and show a retry message rather than creating a duplicate entry.

## Screen 3: MY STATUS - `/status/:id`

**Who uses it and why:** A customer with an active queue entry uses this screen to follow their place, estimated wait, and call status.

**UI elements, top to bottom:**

1. Customer token number, displayed prominently.
2. Queue position.
3. Estimated waiting time with a live countdown/refreshing estimate.
4. **Start Coming** option when the customer is second in the queue.
5. Called notification when reception calls the customer, with the assigned barber when available.
6. **Cancel** button.

**Buttons:**

- **Start Coming:** Appears only when the customer is second in the queue. Tapping acknowledges that the customer is on the way and shows a confirmation on this screen.
- **Cancel:** Opens a confirmation prompt. Confirming removes the customer's waiting entry and shows that it was cancelled; choosing to keep the spot closes the prompt without changing the entry.

**Responsive layout:** On mobile, make the token, position, wait and call notification the clearest elements, with Cancel accessible but distinct from the status information. On tablet, center the status card and increase spacing. On TV/large screens, use a centered, readable status layout; this remains a personal status page and should not expose customer details on a shared TV.

**Empty and error states:** If the link ID does not match an active entry, explain that the queue spot cannot be found. For a cancelled, completed, or no-show entry, show its final status and do not offer Start Coming or Cancel. If live status cannot refresh, retain the last known token and position, mark the update as delayed, and provide **Retry** to request an update.

## Screen 4: RECEPTION DASHBOARD - `/reception`

**Who uses it and why:** Receptionists and the owner use this screen to coordinate barbers, manage the ordered waiting list, call customers, and handle walk-ins or queue exceptions.

**UI elements, top to bottom:**

1. **Add Walk-in** button.
2. Barber cards. Each card shows the barber's name, current customer (or that the barber is available/on break), and time remaining for the current service where applicable.
3. **Call Next** button on each eligible barber card.
4. Ordered waiting list. Each row shows token, customer name, selected services, preferred barber, and waiting time. Highlight customers waiting more than 60 minutes.
5. **No-show** and **Cancel** actions for each waiting customer.

**Buttons:**

- **Add Walk-in:** Opens a compact form for the customer's name, phone, services, and preferred barber; submitting adds the walk-in to the same queue and displays the new token in the list.
- **Call Next:** Assigns and calls the next eligible waiting customer for that barber, updates the barber card and waiting list, and sends the called state to the customer's My Status and the TV Display. It is unavailable if the barber cannot take a customer or no eligible customer is waiting.
- **No-show:** Marks that waiting customer as a no-show and removes them from the active waiting list.
- **Cancel:** Asks for confirmation, then marks the waiting entry cancelled and removes it from the active list. Dismissing confirmation leaves it unchanged.

**Responsive layout:** This is optimized for a 10-inch tablet in landscape. On tablet, keep barber cards and the waiting list visible together where possible. On desktop/large screens, use a wider two-column arrangement. On mobile, stack barber cards above the waiting list and keep actions usable without horizontal scrolling.

**Empty and error states:** If no barbers are on duty, show that state and disable Call Next. If the waiting list is empty, show "No customers waiting." If a barber has no eligible customer, explain that no customer is waiting for that barber or Any Barber. For a failed update, keep the last displayed data, show that it may be out of date, and provide **Retry**; prevent duplicate submissions while an action is pending.

## Screen 5: BARBER VIEW - `/barber/:name`

**Who uses it and why:** The named barber uses this focused view to see their current and next customer, track service time, and indicate availability or a break.

**UI elements, top to bottom:**

1. Barber name.
2. Current customer and selected services, or an available/no-current-customer state.
3. Service timer, showing elapsed service time after Start.
4. **Start** and **Done** buttons.
5. Next customer information: token, name, and selected services when assigned/available to this barber.
6. **On Break** and **Available** controls.

**Buttons:**

- **Start:** Starts the service timer for the current customer and updates the service state for reception and the TV display. Disabled when there is no current customer or the service is already started.
- **Done:** Marks the current service complete, stops its timer, and updates reception and the TV display. Disabled until a customer is in service.
- **On Break:** Marks the barber as on break so they are not offered another customer.
- **Available:** Marks the barber available to receive a customer. The controls show which state is active.

**Responsive layout:** On mobile, use a single-column view with large, easy-to-tap Start/Done and availability controls. On tablet and desktop, center the current-customer card and show next-customer information beneath or beside it. On TV/large screens, keep text readable at a distance if this view is displayed there, while reserving the shared waiting-area presentation for TV Display.

**Empty and error states:** If the barber name in the URL is unknown, show that the barber could not be found. If there is no current customer, show "No customer in service" and disable Start/Done. If there is no next customer, show "No customer next." If updates fail, show that the status could not be saved and allow the barber to retry the action.

## Screen 6: TV DISPLAY - `/display`

**Who uses it and why:** Waiting customers view this shared screen to see which token is being served by each barber and which tokens are coming up.

**UI elements, top to bottom:**

1. One row or card for each barber, showing barber photo and name.
2. Current token being served by that barber, or an available/on-break state.
3. An "Up next" list of five tokens with estimated waiting times.
4. A newly called token is highlighted in gold and accompanied by an audible chime.

**Buttons:** No customer-facing buttons. The display updates automatically when queue or barber status changes. The gold call highlight and chime are automatic responses to a newly called token.

**Responsive layout:** On a TV/large screen, use large, high-contrast text and a clear card or row per barber that can be read across the waiting area. On a tablet, arrange barber cards in a compact grid. On mobile, stack the cards and allow vertical scrolling; preserve token prominence and the same call highlight.

**Empty and error states:** If there are no barbers on duty, show that the salon has no barbers currently available. If a barber has no waiting customers, show "No customers next." If no customer is being served, show "Available" or "On break" as appropriate. If live data is unavailable, show a clear update-delayed message and retain the last successfully loaded display until data returns.

## Screen 7: OWNER SETTINGS - `/admin`

**Who uses it and why:** The owner uses this screen to maintain the service menu, choose which barbers are on duty, control online queue availability, and review daily statistics.

**UI elements, top to bottom:**

1. Services list with English and Gujarati names, duration, price, and active/inactive status.
2. Service controls for adding or editing a service, changing its duration and price, and activating/deactivating it.
3. Barbers list with controls for who is on duty today.
4. Open/closed control for online joining.
5. Daily statistics: customers served, average waiting time, and no-shows.

**Buttons and controls:**

- **Add Service:** Opens service fields for English name, Gujarati name, duration, and price. **Save** adds the service; **Cancel** closes the form without saving.
- **Edit:** Opens the selected service values. **Save** applies the changes; **Cancel** discards unsaved edits.
- **Activate/Deactivate:** Toggles whether the service is available for customers to select. Deactivated services remain manageable in settings but do not appear as selectable services on Join Queue.
- **On duty/Off duty:** Toggles whether the selected barber is working today and updates barber availability shown to customers and reception.
- **Open/Close online queue:** Controls whether customers may submit online queue entries. Closing disables Join Queue; walk-ins can still be handled by reception.

**Responsive layout:** On mobile, stack settings sections and use compact edit forms that fit the screen. On tablet, show service and barber lists in wider panels. On desktop/large screens, use columns for service and barber management with daily statistics clearly visible. This screen is not intended for the shared TV display.

**Empty and error states:** If no services exist, show an empty service list with **Add Service** available. If no barbers are configured/on duty, state this clearly and show that online joining cannot offer an available barber. If there are no completed/no-show customers today, show zero for the relevant daily statistics. Validate required bilingual names, positive duration, and a non-negative price before saving; show field-level errors and keep edits available after a save failure.
