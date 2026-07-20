-- Invite-gated signup. No RLS policies granted to anon/authenticated on purpose — only the
-- service-role client (admin-only server routes) ever touches this table. A signup with no
-- matching, unused, unexpired invite must be rejected before any auth user is created.
create table invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null unique,
  created_by text,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days')
);

alter table invites enable row level security;
-- Deliberately no policies: RLS with zero policies denies everyone but service_role
-- (which bypasses RLS entirely). Confirmed by the same pattern used for admin/quarantine.

create index on invites (email);
create index on invites (code);
