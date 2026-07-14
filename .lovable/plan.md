## Plan: Quote Enquiry Email Alerts

### Goal
Whenever a customer submits a quote enquiry on `/quote`, the app sends an email notification to a designated staff address containing the enquiry details and a link to review it in the admin dashboard.

### Step 1 — Email domain setup
- Open the Lovable email setup dialog and configure the domain you own.
- This is required before any app emails can send.

### Step 2 — Email infrastructure
- Set up Lovable email infrastructure (queues, send log, unsubscribe handling, and the processing route).
- This is the backend plumbing that lets the app send emails reliably.

### Step 3 — Notification recipient setting
- Add a small `app_settings` table in the database to store configuration values.
- Add a `notification_email` setting, editable by admins from the admin area.
- If no email is configured, fallback to the first admin user's email.

### Step 4 — Email template
- Create a React Email template for new quote enquiries.
- It will include: event name, date, bump in/out times, rooms booked, estimated attendance, customer name, email, phone, quote total, and a direct link to the booking in `/admin`.
- Register the template in the email template registry.

### Step 5 — Trigger on submission
- After the quote form successfully inserts the customer, booking, and rooms, trigger the email send.
- Use the booking ID as an idempotency key so retries never send duplicate emails.
- The email goes to the configured `notification_email` address.

### Step 6 — Admin UI
- Add a simple field in the admin area to set the notification email address.

### Outcome
Staff receive an immediate email alert when a quote enquiry comes in, with all the key details and a one-click link to the admin booking page.