# Rock N Tiara Reservations

Internal reservation control plugin for Rock N Tiara.

Current foundation includes:

- plugin bootstrap
- activation installer
- custom database tables
- Woo order to reservation sync
- admin reservations list and detail screens
- blackout windows manager
- availability calendar
- limited-day availability state for days with partial operational blocks
- host reservation status portal
- host-facing invitation manager inside the reservation status portal
- order received reservation handoff block
- branded Reservation Studio login state
- frontend Reservation Studio quick edit actions
- Reservation Studio calendar export for confirmed parties
- MVP reservation waiver capture
- guest invitation records and guest-level waiver links
- required hand-drawn waiver signature capture
- canonical physical venue address surfaced in reservation, waiver, and email flows
- expanded legal-MVP waiver disclaimer sections before signature
- legacy WaiverForever policy clauses adapted into the current waiver copy
- private PDF snapshots for every newly signed host or guest waiver
- searchable audit log for every email send attempt made by the plugin

Current shortcodes:

- `[rnta_reservation_status_portal]`
  - public reservation lookup for a page like `/reservations`
  - expects host lookup by reservation/order number + access code

- `[rnta_reservation_studio]`
  - internal frontend dashboard for owners/staff
  - intended for a protected page such as `/reservation-studio`
  - requires logged-in admin access
  - supports frontend quick edits for status, payment, confirmed date/time, final negotiated total, guest count, child details, notes, party selection, and addons

- `[rnta_order_received_reservation_next]`
  - host handoff block for Order Received pages
  - optional attribute: `portal_url`
  - default target: `/reservations/`

- `[rnta_reservation_waiver]`
  - public waiver form for a page like `/waiver`
  - validates by reservation/order number + access code
  - supports reservation access code waivers and unique guest waiver links using `/waiver/?guest=TOKEN`
  - saves reservation-level host waivers with typed/hand-drawn signatures and guest-level invitation consent acceptance without guest signatures

- `[rnta_whatsapp_link service="Service Name" label="WhatsApp to Book"]`
  - renders a WhatsApp booking link using the centrally managed RT Contact Settings number
  - pre-fills an English message containing the service name

- `[rnta_waiver_terms]`
  - renders the full waiver terms block for the Terms & Conditions page
  - recommended placement: `/terms-conditions/#waivers`

Recommended page usage:

- Public page `/reservations`
  - add shortcode: `[rnta_reservation_status_portal]`

- Protected page `/reservation-studio`
  - add shortcode: `[rnta_reservation_studio]`

- Order received template/page
  - add shortcode: `[rnta_order_received_reservation_next]`

- Public page `/waiver`
  - add shortcode: `[rnta_reservation_waiver]`

- Admin menu `RT - Reservations > Contact Settings`
  - manages WhatsApp, phone, email, and Google Maps values used across contact/support links
  - WhatsApp and phone links are bridged on the frontend so existing Elementor HTML blocks update without hardcoded number edits

- Terms & Conditions page
  - add shortcode: `[rnta_waiver_terms]` in the waiver section

Planned next implementation phases:

1. validate Book Now availability with real reservations, active holds, expired holds, and manual blackout windows
2. host portal polish for mobile invitation management
3. optional separate media-release checkbox after legal and business review

Operational email decision:

- Do not send staff or guardian confirmation emails after each waiver submission.
- Staff will monitor waiver completion per party and resend pending invitations or contact the host when follow-up is needed.
- The email log remains focused on outgoing reservation and invitation messages.

## Version notes

### 0.10.0

- Adds a `Download confirmed events (.ics)` action to Reservation Studio for importing confirmed parties into Google Calendar, Apple Calendar, or Outlook.
- Adds an `Add to Google Calendar` button on confirmed Reservation Studio cards with confirmed date and start time.
- Calendar event details include reservation number, party, birthday child, host contact, guest count, notes, and the Rock N Tiara venue address.

### 0.9.9

- Opens the Reservation Studio Blackout Manager by default so the frontend blackout controls are immediately visible.
- Adds a visible open/close indicator to the Blackout Manager header.

### 0.9.8

- Adds a frontend Blackout Manager inside `[rnta_reservation_studio]`.
- Allows managers to create manual blackout windows for holidays, closures, maintenance, private events, or unavailable time windows without entering wp-admin.
- Shows recent manual blackouts in Reservation Studio and allows deleting manual blackout windows only.

### 0.9.7

- Improves public availability payloads for blackout windows and reservation blocks that span multiple dates.
- Clips each public block to the current calendar day so Book Now time buttons correctly treat middle days as fully blocked.
- Keeps server-side overlap validation unchanged as the final authority before checkout.

### 0.9.6

- Refreshes the branded wrapper for operational reservation emails.
- Uses the Rock N Tiara visual language with Great Vibes headings, Quicksand body styling, soft pink/gold accents, and mobile-friendly detail rows.
- Keeps the existing email triggers and audit logging unchanged.

### 0.9.5

- Adds a Reservation Studio schedule-hold note to each reservation card.
- Shows whether a reservation is actively holding availability, expired, confirmed, under schedule review, inactive, or missing enough schedule data.
- Uses the existing conflict engine hold logic so the frontend Studio display stays aligned with the calendar blocking rules.

### 0.9.4

- Refines `[rnta_waiver_terms]` layout so the Terms & Conditions waiver section uses the full available page width.
- Removes extra outer spacing from the standalone waiver terms shortcode while preserving the full host and guest waiver form layout.
- Improves mobile spacing for waiver terms cards when embedded inside the Terms & Conditions page.

### 0.9.3

- Simplifies guest invitation consent: invited guests accept with parent/guardian details, invited child birthday, acceptance checkbox, and submit button.
- Keeps the host waiver flow complete with full waiver text, typed signature, and hand-drawn signature.
- Adds `guest_birthdate` and `guest_age` to guest records for event history and future marketing segmentation.
- Adds `[rnta_waiver_terms]` so the full waiver conditions can live on the Terms & Conditions page while guest links stay lightweight.
- Updates guest-facing/admin wording from signed waiver language to invitation consent acceptance language where applicable.

### 0.9.2

- Adds a `Limited` calendar state for days with partial operational blocks instead of marking every blocked day as fully unavailable.
- Exposes the 30-minute setup buffer and 60-minute cleanup buffer in the public availability payload so Book Now can calculate start times against the same operational window used by reservation blocks.
- Keeps full-day blocks visually unavailable while allowing partial days to show remaining time-slot options.

### 0.9.1

- Adds party-level guest waiver progress to the main WordPress reservations list.
- Shows signed, pending, complete, or no-invitation states without opening each reservation.
- Loads guest waiver counts in one grouped query for the full reservations table.
- Updates Reservation Studio copy to report the real number of pending guest waivers.
- Confirms the operational decision not to send notifications after each waiver submission.

### 0.9.0

- Adds a dedicated database table for outgoing email attempts made by the reservations plugin.
- Records recipient, subject, email type, trigger source, attempt number, reservation, guest, result, and transport error.
- Adds a searchable `Reservations > Email Log` admin screen showing the latest 200 matching attempts.
- Distinguishes WordPress-accepted sends from failures without claiming inbox delivery, opens, or clicks.
- Starts collecting audit records after this version is installed; historical sends cannot be reconstructed.

### 0.8.2

- Adds permission-protected PDF downloads for staff through WordPress `admin-post.php`.
- Shows the host waiver PDF in Reservation Studio and the reservation admin detail when available.
- Shows an individual PDF download beside each signed guest waiver in the reservation admin detail.
- Validates capability, nonce, record ownership, PDF extension, and the resolved uploads path before streaming a file.

### 0.8.1

- Organizes waiver PDFs by the celebration year and month: `uploads/waivers/YYYY/MM/`.
- Names guest PDFs using the birthday child and invited child: `birthdaychild-guestchild.pdf`.
- Names reservation-level host PDFs using `birthdaychild-host.pdf`.
- Uses WordPress unique filenames to preserve an existing signed PDF when names collide.

### 0.8.0

- Generates a signed PDF snapshot after each successful host or guest waiver submission.
- Stores protected PDFs in the WordPress uploads `waivers` directory using randomized filenames.
- Records each PDF relative path and SHA-256 hash with its waiver or guest record.
- Includes celebration details, accepted legal text, signer metadata, typed signature, and the hand-drawn PNG signature without requiring an external PDF or image library.

### 0.7.2

- Redesigned guest emails as birthday invitations with dynamic celebration details and a styled acceptance button.
- Added invitation-specific consent messaging for guests arriving through unique invitation links.
- Guest consent submission now presents invitation acceptance language and a dedicated accepted state.
- Preserved the existing reservation-level waiver language for hosts.

### 0.7.1

- Saving guest invitations now immediately sends waiver invitation emails when a parent email is present.
- Added backend resend action for pending guest waivers.
- Added host portal resend action for pending guest waivers inside `/reservations`.
- Added editable pending guest invitation records in admin and host portal.
- Locks guest invitation editing after the guest waiver is signed.
- Updated host-facing labels from “Save guest invitations” to “Save & send guest invitations”.

### 0.7.0

- Replaced the admin guest invitation textarea format with structured guest rows: child name, parent/guardian name, and parent email.
- Keeps backwards compatibility with the previous `Child | email | parent` parser as a hidden fallback.
- Added host-facing guest invitation entry inside `[rnta_reservation_status_portal]`.
- Host guest entry is limited by the contracted guest count on the reservation.
- Host portal now shows guest slots filled, waiver progress, and per-guest waiver status.

### 0.6.9

- Added the first Guest Invitations module inside each reservation detail.
- Added the `rnta_reservation_guests` database table for invited children, parent emails, invitation status, and guest-level waiver status.
- Added unique guest waiver links using `/waiver/?guest=TOKEN`.
- Added individual guest invitation email sending from the reservation detail screen.
- Guest waiver submissions now update the guest record and feed the Reservation Studio waiver progress counter.
- Reservation Studio waiver progress now counts against managed guests when a guest list exists; otherwise it falls back to the reservation guest count.

### 0.6.8

- Added a visual waiver badge to each Reservation Studio card.
- Shows `Waiver Pending` in yellow and `Waiver Received` in green.
- Added a waiver progress module with total guests, submitted waivers, and percentage.
- Progress color interpolates from yellow at 0% to green at 100%.
- Current MVP counts submitted reservation-level waivers; guest-by-guest waiver counts will use this same progress module once invitations/guest waivers are implemented.

### 0.6.7

- Reworked mobile waiver signature controls so `Sign`, `OK`, and `Clear signature` appear above the canvas.
- Removed the floating canvas instruction badge on mobile to prevent any perceived/touch overlap.
- Added stronger touch handlers for signature action buttons on mobile browsers.
- Reduced mobile padding and side spacing for shortcode-only pages, including waiver, reservation portal, reservation studio, order received handoff, and availability calendar blocks.

### 0.6.6

- Improved mobile waiver signature capture.
- Added explicit `Sign` and `OK` controls for the hand-drawn signature canvas.
- The canvas no longer captures touch scrolling by default.
- On mobile, the host taps `Sign` to enter drawing mode, signs with finger/stylus, then taps `OK` to return to normal page scrolling.
- Updated the signature validation alert to explain the new signing flow.

### 0.6.5

- Adapted the legacy WaiverForever waiver screenshots into the current waiver copy.
- Added clearer entertainment-only / non-cosmetology language.
- Added spa activity policies: no nail cutting, no sharp manicure/pedicure utensils, no electricity with water, warm water basins only, sanitized basins, disposable liners, and disposable applicators.
- Added property/equipment language for robes, costumes, props, decor, supplies, and reimbursement for lost or damaged items.
- Added host supervision, guest conduct, right-to-refuse, required permission waiver, photos/videos/privacy, and expanded hold harmless language.
- Updated waiver text version to `legal-mvp-2026-07-18-r2`.
- Changed the venue label separator to plain ASCII to avoid character/encoding warnings during plugin activation.

### 0.6.4

- Adjusted waiver language from owner feedback.
- Removed the visible accident insurance notice from the public waiver copy.
- Kept allergy, medical disclosure, safety, inherent risk, release/hold harmless, and emergency authorization language.
- Insurance remains an internal/legal documentation topic, not a front-facing waiver promise in the MVP copy.

### 0.6.3

- Expanded the public waiver into a structured legal-MVP disclaimer before signature.
- Added visible sections for event details, authorized attendees, service nature, child-appropriate materials, allergy disclosure, food/products/add-ons, safety rules, inherent risks, release/hold harmless acknowledgment, emergency authorization, and final acknowledgment.
- Updated waiver text version to `legal-mvp-2026-07-18`.
- The saved waiver snapshot now includes the full structured legal-MVP wording.

### 0.6.2

- Added canonical Rock N Tiara physical venue constants.
- Shows the venue address in Order Received reservation handoff.
- Shows the venue address inside the host reservation portal.
- Shows the venue address inside the waiver reservation summary and accepted waiver text snapshot.
- Adds the venue address to reservation-related emails.

### 0.6.1

- Added required hand-drawn signature pad to the public waiver form.
- Stores the hand-drawn signature as a PNG data URL with server-side validation.
- Stores waiver text version and waiver text snapshot with each submitted waiver.
- Shows the saved signature preview when a waiver already exists.

### 0.6.0

- Added MVP waiver table and repository.
- Added public shortcode `[rnta_reservation_waiver]`.
- Waiver page validates host access by reservation/order number and access code.
- Captures signer name, relationship, child name, acceptance checkbox, typed signature, IP, user agent, and submission date.
- Host portal shows a Complete Waiver button when a waiver is pending and a Waiver Received badge after submission.
- Reservation Studio cards show Waiver Pending / Waiver Received.

### 0.5.0

- Improved the host-facing reservation status portal.
- Added host-friendly reservation and payment labels instead of raw internal status text.
- Added a status summary sentence so the host understands what the current stage means.
- Added access code visibility inside the host portal result.
- Expanded Reservation Studio status/payment options used by the host portal and email transitions.

### 0.4.0

- Added MVP reservation status email transitions:
  - deposit payment reviewed
  - schedule/reservation rescheduled
  - reservation closed/cancelled/declined/expired
- Avoids sending a separate payment-reviewed email when the same save action also confirms the reservation.
- Keeps one-send flags per reservation/status email to avoid duplicate messages during repeated saves.

### 0.3.2

- Removed hidden UTF-8 BOM output from a plugin PHP file to prevent WordPress activation warnings about unexpected output.

### 0.3.1

- Fixed reservation insert format mapping so date fields and created timestamps are saved in the correct columns.
- Normalizes empty MySQL date values such as `0000-00-00` before rendering in admin, portal, and emails.
- Repairs old zero `created_at` reservation records from the linked WooCommerce order date when possible.

### 0.3.0

- Added MVP email notification layer inside the reservations plugin.
- Sends a host email when a new WooCommerce deposit reservation request is created.
- Sends an internal Rock N Tiara email when a new reservation needs review.
- Sends a host confirmation email when a reservation status changes to `confirmed`.
- Uses one-send option flags per reservation to avoid duplicate emails during order sync or repeated saves.

### 0.2.2

- Fixed Reservation Studio access behavior so store managers and administrators can use the dashboard.
- Replaced dynamic login/logout redirects with the stable `/reservation-studio/` URL to avoid Elementor template permalink side effects.
- Added an explicit permission check before Reservation Studio quick-edit actions are saved.

### 0.2.1

- Added branded logged-out login prompt for Reservation Studio.
- Added frontend quick edit panel per reservation card.
- Added quick actions:
  - verify deposit
  - confirm reservation
  - mark fully paid
  - copy requested date/time into confirmed fields
- Added structured Party selector from `rnta_experience` party records.
- Added structured Addon checkboxes from `rnta_experience` addon records.
- Saving from Reservation Studio now rebuilds addon JSON, recalculates guest deltas when a catalog Party is selected, updates estimated total where base pricing exists, and resyncs reservation conflict blocks.

Reference docs:

- `documentacion/docs/ROCKNTIARA_RESERVATION_CONTROL_MVP_2026-07-17.md`
- `documentacion/docs/ROCKNTIARA_RESERVATIONS_PLUGIN_ARCHITECTURE_2026-07-17.md`
