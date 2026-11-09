/*
# YuriOrbit: feedback & content reports

Backs:
  1. /feedback                 -> "Feedback & Reports" form
  2. "Report incorrect information" on /title/{id} -> metadata reports
  3. Admin console -> Feedback tab (read + triage)

Writes go through the public /api/feedback Pages Function and reads through
/api/admin/feedback, both with the service role key, so this table has no
grants or policies for anon/authenticated (same model as admin_audit_log).

Safe to re-run: every statement is idempotent.
*/

CREATE TABLE IF NOT EXISTS feedback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'feedback',
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  contact_email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  page_url text,
  title_id text,
  title_name text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by text,
  CONSTRAINT feedback_reports_kind_check CHECK (kind IN ('feedback', 'report')),
  CONSTRAINT feedback_reports_status_check CHECK (status IN ('open', 'resolved', 'dismissed')),
  CONSTRAINT feedback_reports_message_length CHECK (char_length(message) BETWEEN 1 AND 4000),
  CONSTRAINT feedback_reports_contact_length CHECK (contact_email IS NULL OR char_length(contact_email) <= 320),
  CONSTRAINT feedback_reports_category_length CHECK (char_length(category) BETWEEN 1 AND 40)
);

CREATE INDEX IF NOT EXISTS feedback_reports_created_idx ON feedback_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_reports_status_created_idx ON feedback_reports (status, created_at DESC);

ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;

-- Intentionally no policies/grants: service role only, via /api/feedback and
-- /api/admin/feedback. Direct anon inserts would be an open spam target.
