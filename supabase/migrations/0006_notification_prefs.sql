-- Per-seller notification toggles. Both default true (current always-on behavior)
-- so this migration changes no one's experience until they actually visit /profile.
alter table sellers add column notify_disputable boolean not null default true;
alter table sellers add column notify_digest boolean not null default true;
