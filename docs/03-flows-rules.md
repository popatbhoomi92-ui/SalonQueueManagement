# Salon Queue Management System - Flows & Rules

This document describes how remote and walk-in customers move through the queue, the allowed queue statuses, barber assignment rules, waiting-time guidance, no-show and cancellation rules, and a practical test checklist. The faculty guide is the primary source for the queue rules.

## Flow: remote customer

1. The customer opens the website Home page and checks the salon's open status, live queue estimate, and barber availability.
2. The customer taps **Join Queue**, enters their name and 10-digit phone number, selects one or more services (up to three), chooses a specific barber or **Any Barber**, and reviews the live booking summary.
3. The customer taps **Confirm**. The system creates one waiting entry and shows its token and queue position on My Status.
4. The customer follows the live position and estimated waiting time on My Status. When they are second in line, the screen offers **Start Coming**.
5. Reception calls the next eligible customer for an available barber. The entry changes to **Called**; My Status shows that it is the customer's turn and identifies the barber. The TV display highlights the token in gold and plays a chime.
6. The customer goes to the called barber. The barber taps **Start** when service begins, changing the entry to **In chair**, then taps **Done** when service finishes. The entry changes to **Done** and leaves the active queue.

## Flow: walk-in

1. The customer arrives at the salon and asks reception to join the queue.
2. Reception taps **Add Walk-in**, enters the customer's name, phone, and services, and submits the form.
3. The walk-in joins the same queue at the end, in first-come, first-served order, and receives a token.
4. Reception manages the entry with the same waiting list and **Call Next** process as other customers. A specific barber preference, if recorded on the entry, must be respected by the selection rules below.
5. When called, the walk-in follows the same **Called**, **In chair**, and **Done** status path. If the customer does not arrive within 10 minutes after being called, reception may mark the entry **No-show**. If the customer later returns, reception adds them again at the end of the queue.

## Rules

### Statuses and allowed transitions

- **Waiting -> Called -> In chair -> Done.** Statuses move forward only; they never move backwards.
- **Waiting -> Cancelled.** A customer may cancel a waiting entry. Confirming cancellation removes it from the active queue.
- **Called -> No-show.** Reception may mark a customer who has not arrived within 10 minutes of being called as a no-show.
- **Done**, **Cancelled**, and **No-show** are finished entries and are not returned to an earlier status. A returning no-show must be added again as a new entry at the end of the queue.

### Rules for choosing who's next

- Queue order is first come, first served.
- **Call Next** for barber X selects the earliest waiting customer who chose barber X or **Any Barber**.
- A customer who chose a specific barber must never be assigned to a different barber.
- A barber can have only one customer in the chair at a time. A barber on break is unavailable for a new customer.
- If a customer chose a barber who is on break, show the customer that the selected barber is on break (for example, "Ravi is on break"). Do not silently assign that customer to another barber.

### Waiting-time rule

Estimated waiting time = Total service minutes ahead ÷ Number of barbers working.

The estimate is approximate. It decreases as customers ahead complete their services.

### No-show and cancellation rules

- A waiting customer may cancel their spot; the entry transitions from **Waiting** to **Cancelled**.
- A customer who has been called but has not arrived within 10 minutes may be marked **No-show** by reception; the entry transitions from **Called** to **No-show**.
- If a no-show customer arrives later, reception adds them again at the end of the queue as a new waiting entry.
- Online joining closes 30 minutes before the salon's closing time. Walk-ins are still allowed after online joining closes.
- A phone number may have only one active queue spot. If the same phone number attempts to join again, show the existing spot and do not create a duplicate.

## Test checklist

- [ ] Join with two services; confirm the summary shows the selected services and the correct total time and price.
- [ ] Join with a specific barber; confirm **Call Next** never assigns the customer to another barber.
- [ ] Join with **Any Barber**; confirm the customer can be selected by an available barber according to queue order.
- [ ] Try to join again with a phone number that already has an active spot; confirm the existing spot is shown and no duplicate is created.
- [ ] Call Next for Amit while the earliest waiting customer chose Ravi; confirm the Ravi customer is skipped and Amit's eligible customer is called.
- [ ] Call a customer; confirm the customer's phone shows "It's your turn" within 5 seconds and the TV highlights the called token with a chime.
- [ ] Start and then finish a service in Barber View; confirm Reception and TV update, and the customer's status moves to **In chair** then **Done**.
- [ ] Leave a called customer absent for 10 minutes, mark them **No-show**, then re-add them; confirm the new entry goes to the end of the queue.
- [ ] Cancel a waiting customer's spot; confirm it becomes **Cancelled** and is removed from the active queue.
- [ ] Close online joining; confirm the Join Queue button is disabled with a message while reception can still add walk-ins.
- [ ] Switch the interface to Gujarati; confirm all labels change to Gujarati.
- [ ] With 60 total service minutes ahead and 3 barbers working, confirm the estimated waiting time is 20 minutes (60 ÷ 3).
- [ ] Finish customers ahead in the queue; confirm the displayed waiting time goes down.
- [ ] Open the app on phone, tablet, and TV; confirm queue and barber updates stay in sync.
