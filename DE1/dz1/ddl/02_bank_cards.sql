-- =====================================================================
-- ИСТОЧНИК 2: bank_cards (Карточный процессинг)
-- Хранит карты клиентов, авторизации (online) и клиринг (settlement)
-- Связь с bank_core: cards.customer_id, cards.account_id
-- =====================================================================

-- DROP DATABASE IF EXISTS bank_cards;
-- CREATE DATABASE bank_cards;
-- \c bank_cards;

CREATE SCHEMA IF NOT EXISTS cards;
SET search_path TO cards;

-- ---------- Справочник мерчантов (торговые точки) ----------
CREATE TABLE IF NOT EXISTS merchants (
    merchant_id      SERIAL      PRIMARY KEY,
    merchant_name    VARCHAR(100),
    mcc              VARCHAR(4),                   -- Merchant Category Code
    category         VARCHAR(50),                  -- grocery / fuel / entertainment ...
    city             VARCHAR(50),
    country          CHAR(2)     DEFAULT 'KZ'
);

-- ---------- Карты (связь с клиентом и счётом в bank_core) ----------
CREATE TABLE IF NOT EXISTS cards (
    card_id          BIGSERIAL   PRIMARY KEY,
    customer_id      INT         NOT NULL,         -- логическая FK на bank_core.customers
    account_id       INT         NOT NULL,         -- логическая FK на bank_core.accounts
    card_pan_hash    VARCHAR(64) UNIQUE,           -- хешированный PAN (PCI DSS)
    card_product     VARCHAR(20),                  -- classic / gold / platinum
    expiry_date      DATE,
    issue_date       DATE,
    card_status      VARCHAR(20) DEFAULT 'active', -- active / blocked / expired
    embossed_name    VARCHAR(100),
    updated_at       TIMESTAMP   DEFAULT now()
);

-- ---------- Авторизации (онлайн-запросы по карте) ----------
CREATE TABLE IF NOT EXISTS authorizations (
    auth_id          BIGSERIAL   PRIMARY KEY,
    card_id          BIGINT REFERENCES cards(card_id),
    merchant_id      INT  REFERENCES merchants(merchant_id),
    auth_datetime    TIMESTAMP   NOT NULL,
    amount           NUMERIC(12,2),
    currency         CHAR(3)     DEFAULT 'KZT',
    auth_code        VARCHAR(10),
    auth_result      VARCHAR(20),                  -- approved / declined
    decline_reason   VARCHAR(80),
    is_online        BOOLEAN     DEFAULT TRUE
);

-- ---------- Клиринг (финальные списания) ----------
CREATE TABLE IF NOT EXISTS clearing (
    clearing_id      BIGSERIAL   PRIMARY KEY,
    auth_id          BIGINT REFERENCES authorizations(auth_id),
    settlement_date  DATE,
    final_amount     NUMERIC(12,2),
    interchange_fee  NUMERIC(8,2),
    scheme_fee       NUMERIC(8,2),
    updated_at       TIMESTAMP   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_customer       ON cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_cards_account        ON cards(account_id);
CREATE INDEX IF NOT EXISTS idx_auth_card            ON authorizations(card_id);
CREATE INDEX IF NOT EXISTS idx_auth_datetime        ON authorizations(auth_datetime);
CREATE INDEX IF NOT EXISTS idx_clearing_auth        ON clearing(auth_id);
