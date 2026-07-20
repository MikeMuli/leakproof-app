-- RLS policies only take effect after a base GRANT exists; without it every query 42501s
-- regardless of policy. anon gets nothing (unauthenticated users see none of this data).
-- authenticated gets access gated by the RLS policies from 0002. service_role bypasses
-- RLS entirely (Postgres superuser-equivalent for this project) and is used only by
-- server-side code (the ingestion worker), never shipped to the browser.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  sellers, shops, raw_ingests, orders, order_lines, expected_settlements,
  settlement_lines, payouts, discrepancies, claim_packs
to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
