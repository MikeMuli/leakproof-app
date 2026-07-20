-- Row-level security. A bug in application code must never expose seller A's data to seller B.
-- Every policy scopes through sellers.auth_user_id = auth.uid() — never trust a client-supplied seller_id.

alter table sellers enable row level security;
alter table shops enable row level security;
alter table raw_ingests enable row level security;
alter table orders enable row level security;
alter table order_lines enable row level security;
alter table expected_settlements enable row level security;
alter table settlement_lines enable row level security;
alter table payouts enable row level security;
alter table discrepancies enable row level security;
alter table claim_packs enable row level security;

create policy sellers_self on sellers
  for all using (auth_user_id = auth.uid());

create policy shops_own on shops
  for all using (seller_id in (select id from sellers where auth_user_id = auth.uid()));

create policy raw_ingests_own on raw_ingests
  for all using (seller_id in (select id from sellers where auth_user_id = auth.uid()));

create policy orders_own on orders
  for all using (shop_id in (
    select s.id from shops s join sellers se on se.id = s.seller_id where se.auth_user_id = auth.uid()
  ));

create policy order_lines_own on order_lines
  for all using (order_id in (
    select o.id from orders o
    join shops s on s.id = o.shop_id
    join sellers se on se.id = s.seller_id
    where se.auth_user_id = auth.uid()
  ));

create policy expected_settlements_own on expected_settlements
  for all using (order_id in (
    select o.id from orders o
    join shops s on s.id = o.shop_id
    join sellers se on se.id = s.seller_id
    where se.auth_user_id = auth.uid()
  ));

create policy settlement_lines_own on settlement_lines
  for all using (shop_id in (
    select s.id from shops s join sellers se on se.id = s.seller_id where se.auth_user_id = auth.uid()
  ));

create policy payouts_own on payouts
  for all using (shop_id in (
    select s.id from shops s join sellers se on se.id = s.seller_id where se.auth_user_id = auth.uid()
  ));

create policy discrepancies_own on discrepancies
  for all using (order_id in (
    select o.id from orders o
    join shops s on s.id = o.shop_id
    join sellers se on se.id = s.seller_id
    where se.auth_user_id = auth.uid()
  ));

create policy claim_packs_own on claim_packs
  for all using (discrepancy_id in (
    select d.id from discrepancies d
    join orders o on o.id = d.order_id
    join shops s on s.id = o.shop_id
    join sellers se on se.id = s.seller_id
    where se.auth_user_id = auth.uid()
  ));

-- Support staff impersonation mode (PRD §5): a separate service-role path with its own
-- audit table, deliberately NOT modeled as a bypass policy here. Add in a later migration
-- once the audit-log table exists, so "support can read" never ships without "support is logged."
