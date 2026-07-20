-- LeakProof core schema. All money = bigint cents. All entities append-only or soft-deleted.
-- PRD Module B: sellers use these numbers in disputes; must show exactly what we knew and when.

create table sellers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  company_name text,
  created_at timestamptz not null default now()
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id) on delete cascade,
  platform text not null check (platform in ('shopee','tiktok','lazada')),
  country_code text not null,
  shop_name text not null,
  created_at timestamptz not null default now()
);

create table raw_ingests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id) on delete cascade,
  shop_id uuid references shops(id) on delete set null,
  source_channel text not null check (source_channel in ('file_upload','api')),
  file_path text,              -- storage bucket path, immutable blob
  parser_key text,             -- (platform, country, report_type, format_version) resolved at parse time
  parser_version text,
  status text not null default 'pending' check (status in ('pending','parsed','quarantined','failed')),
  quarantine_reason text,
  ingested_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  platform_order_id text not null,
  created_at_platform timestamptz,
  status text not null default 'delivered',
  buyer_total_cents bigint not null,
  currency text not null default 'MYR',
  source_ingest_id uuid references raw_ingests(id),
  created_at timestamptz not null default now(),
  unique (shop_id, platform_order_id)
);

create table order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sku text not null,
  qty integer not null default 1,
  unit_price_cents bigint not null,
  line_discount_cents bigint not null default 0
);

-- Versioned: recompute on fee-table change, keep prior version rather than overwrite.
create table expected_settlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  fee_table_version text not null,
  commission_cents bigint not null,
  transaction_fee_cents bigint not null,
  shipping_cents bigint not null,
  voucher_cents bigint not null default 0,
  net_cents bigint not null,
  computed_at timestamptz not null default now()
);

create table settlement_lines (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,   -- nullable: unmatched until Module D links it
  payout_id uuid,
  type text not null check (type in (
    'item_price','commission_fee','transaction_fee','shipping_fee_charged','shipping_subsidy',
    'voucher_seller_funded','voucher_platform_funded','affiliate_commission','refund','refund_reversal',
    'adjustment','reserve_hold','reserve_release','chargeback','chargeback_fee','other'
  )),
  amount_cents bigint not null,   -- signed
  settlement_period_id text,
  raw_description text,
  source_ingest_id uuid references raw_ingests(id),
  match_confidence numeric(4,3),  -- null = exact ID match; else fuzzy score, <threshold routes to review queue
  created_at timestamptz not null default now()
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  declared_total_cents bigint not null,
  payout_date date,
  status text not null check (status in ('on_hold','processing','paid')),
  created_at timestamptz not null default now()
);

alter table settlement_lines
  add constraint settlement_lines_payout_fk foreign key (payout_id) references payouts(id) on delete set null;

-- The product's central object. Append-only state transitions, never overwritten.
create table discrepancies (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  bucket text not null check (bucket in ('TIMING','EXPECTED_FEE','DISPUTABLE','UNKNOWN')),
  detector_type text,           -- e.g. 'commission_on_cancelled'; null for TIMING/EXPECTED_FEE
  gap_cents bigint not null,
  state text not null default 'detected' check (state in
    ('detected','auto_resolved','seller_dismissed','claim_generated','claim_filed','recovered','rejected')),
  detected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table claim_packs (
  id uuid primary key default gen_random_uuid(),
  discrepancy_id uuid not null references discrepancies(id) on delete cascade,
  platform text not null,
  language text not null default 'en',
  body_text text not null,
  generated_at timestamptz not null default now()
);

create index on shops (seller_id);
create index on orders (shop_id);
create index on settlement_lines (shop_id);
create index on settlement_lines (order_id);
create index on discrepancies (order_id);
create index on discrepancies (bucket);
create index on raw_ingests (seller_id);
