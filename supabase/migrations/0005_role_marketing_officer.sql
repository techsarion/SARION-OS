-- Add the Marketing Officer role to the `role` enum.
-- NOTE: `alter type ... add value` cannot be used in the SAME transaction it's
-- created in. Run THIS migration on its own, before 0006 (which uses the value).
alter type role add value if not exists 'MARKETING_OFFICER';
