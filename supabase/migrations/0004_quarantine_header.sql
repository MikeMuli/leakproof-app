-- Captures the anonymized header shape (column names only, never row data) of a file that
-- matched no parser, so ops can see what changed without touching seller financial data.
alter table raw_ingests add column header_fingerprint text[];
