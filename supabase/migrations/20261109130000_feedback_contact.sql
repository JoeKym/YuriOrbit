/*
# YuriOrbit: on-site contact form

Extends `feedback_reports` (20261109120000) so the /contact page can take a
message without sending the visitor to their mail client:

  kind = 'contact'      written by the contact form
  contact_name          sender's name
  subject               message subject line

Contact rows flow through the same POST /api/feedback endpoint and are triaged
in the admin console under the Contact tab. Still service-role only: no grants
or policies for anon/authenticated.

Safe to re-run: every statement is idempotent.
*/

ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS subject text;

ALTER TABLE feedback_reports DROP CONSTRAINT IF EXISTS feedback_reports_kind_check;
ALTER TABLE feedback_reports
  ADD CONSTRAINT feedback_reports_kind_check CHECK (kind IN ('feedback', 'report', 'contact'));

ALTER TABLE feedback_reports DROP CONSTRAINT IF EXISTS feedback_reports_contact_length;
ALTER TABLE feedback_reports
  ADD CONSTRAINT feedback_reports_contact_length CHECK (contact_email IS NULL OR char_length(contact_email) <= 320);
