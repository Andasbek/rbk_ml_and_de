-- =====================================================================
-- ИСТОЧНИК 3: Card System (Карточный процессинг)
-- Отдельная система — выпуск и обслуживание карт, справочник мерчантов
-- Владелец: департамент карточных продуктов
-- Способ обновления: real-time
-- Связи с другими источниками:
--   cards.customer_id  →  crm.customers.customer_id           (логически)
--   cards.account_id   →  core_banking.accounts.account_id    (логически)
-- =====================================================================

-- DROP DATABASE IF EXISTS card_system;
-- CREATE DATABASE card_system;
-- \c card_system;

CREATE SCHEMA IF NOT EXISTS cards;
SET search_path TO cards;

-- ---------- Справочник мерчантов (торговых точек) ----------
CREATE TABLE IF NOT EXISTS merchants (
    merchant_id      SERIAL      PRIMARY KEY,
    merchant_name    VARCHAR(100),
    mcc              VARCHAR(4),                   -- Merchant Category Code (Visa/MC)
    category         VARCHAR(50),
    city             VARCHAR(50),
    country          CHAR(2)     DEFAULT 'KZ'
);

-- ---------- Карты ----------
CREATE TABLE IF NOT EXISTS cards (
    card_id          BIGSERIAL   PRIMARY KEY,
    customer_id      INT         NOT NULL,         -- логич. FK на crm.customers
    account_id       INT         NOT NULL,         -- логич. FK на core_banking.accounts
    card_pan_hash    VARCHAR(64) UNIQUE,           -- хешированный PAN (PCI DSS)
    card_product     VARCHAR(20),                  -- classic / gold / platinum
    expiry_date      DATE,
    issue_date       DATE,
    card_status      VARCHAR(20) DEFAULT 'active',
    embossed_name    VARCHAR(100),
    updated_at       TIMESTAMP   DEFAULT now()
);

-- ---------- История блокировок карт ----------
CREATE TABLE IF NOT EXISTS card_blocks (
    block_id         BIGSERIAL   PRIMARY KEY,
    card_id          BIGINT REFERENCES cards(card_id),
    block_reason     VARCHAR(50),                  -- lost / stolen / suspicious / customer_request
    blocked_at       TIMESTAMP,
    unblocked_at     TIMESTAMP,
    blocked_by       VARCHAR(50)                   -- customer / fraud_team / system
);

CREATE INDEX IF NOT EXISTS idx_cards_customer    ON cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_cards_account     ON cards(account_id);
CREATE INDEX IF NOT EXISTS idx_blocks_card       ON card_blocks(card_id);
