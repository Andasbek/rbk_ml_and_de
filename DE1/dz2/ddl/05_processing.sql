-- =====================================================================
-- ИСТОЧНИК 5: Processing (Процессинг — транзакции и расчёты)
-- Отдельная система — обработка денежных операций по счетам и картам
-- Владелец: процессинговый центр / транзакционный блок
-- Способ обновления: real-time (Kafka) + ежедневная сверка клиринга
-- Связи с другими источниками:
--   transactions.account_id  →  core_banking.accounts.account_id   (логически)
--   authorizations.card_id   →  card_system.cards.card_id          (логически)
-- =====================================================================

-- DROP DATABASE IF EXISTS processing;
-- CREATE DATABASE processing;
-- \c processing;

CREATE SCHEMA IF NOT EXISTS proc;
SET search_path TO proc;

-- ---------- Транзакции по счетам (главная факт-таблица) ----------
CREATE TABLE IF NOT EXISTS transactions (
    trx_id           BIGSERIAL   PRIMARY KEY,
    account_id       INT         NOT NULL,         -- логич. FK на core_banking.accounts
    trx_datetime     TIMESTAMP   NOT NULL,
    trx_type         VARCHAR(20),                  -- debit / credit / transfer
    amount           NUMERIC(14,2),
    currency         CHAR(3)     DEFAULT 'KZT',
    description      VARCHAR(200),
    counterparty     VARCHAR(100),
    posting_date     DATE,
    branch_id        INT,                          -- логич. ref на core_banking.branches
    updated_at       TIMESTAMP   DEFAULT now()
);

-- ---------- Авторизации по картам (online ответы на запросы терминалов) ----------
CREATE TABLE IF NOT EXISTS authorizations (
    auth_id          BIGSERIAL   PRIMARY KEY,
    card_id          BIGINT      NOT NULL,         -- логич. FK на card_system.cards
    merchant_id      INT,                          -- логич. ref на card_system.merchants
    auth_datetime    TIMESTAMP   NOT NULL,
    amount           NUMERIC(12,2),
    currency         CHAR(3)     DEFAULT 'KZT',
    auth_code        VARCHAR(10),
    auth_result      VARCHAR(20),                  -- approved / declined
    decline_reason   VARCHAR(80),
    is_online        BOOLEAN     DEFAULT TRUE
);

-- ---------- Клиринг (финальные межбанковские расчёты) ----------
CREATE TABLE IF NOT EXISTS clearing (
    clearing_id      BIGSERIAL   PRIMARY KEY,
    auth_id          BIGINT REFERENCES authorizations(auth_id),
    settlement_date  DATE,
    final_amount     NUMERIC(12,2),
    interchange_fee  NUMERIC(8,2),
    scheme_fee       NUMERIC(8,2),                 -- комиссия Visa / Mastercard
    updated_at       TIMESTAMP   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trx_account    ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_trx_updated    ON transactions(updated_at);
CREATE INDEX IF NOT EXISTS idx_auth_card      ON authorizations(card_id);
CREATE INDEX IF NOT EXISTS idx_auth_datetime  ON authorizations(auth_datetime);
CREATE INDEX IF NOT EXISTS idx_clearing_auth  ON clearing(auth_id);
