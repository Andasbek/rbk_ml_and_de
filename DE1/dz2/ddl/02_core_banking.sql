-- =====================================================================
-- ИСТОЧНИК 2: Core Banking (АБС — Автоматизированная Банковская Система)
-- Отдельная система — учёт счетов и отделений
-- Владелец: операционный блок банка
-- Способ обновления: микробатч (CDC через updated_at)
-- Связь с CRM: accounts.customer_id  →  crm.customers.customer_id (логически)
-- =====================================================================

-- DROP DATABASE IF EXISTS core_banking;
-- CREATE DATABASE core_banking;
-- \c core_banking;

CREATE SCHEMA IF NOT EXISTS core;
SET search_path TO core;

-- ---------- Отделения банка ----------
CREATE TABLE IF NOT EXISTS branches (
    branch_id        SERIAL      PRIMARY KEY,
    branch_code      VARCHAR(10) UNIQUE NOT NULL,
    branch_name      VARCHAR(100),
    city             VARCHAR(50),
    address          VARCHAR(200),
    opened_date      DATE,
    is_active        BOOLEAN     DEFAULT TRUE
);

-- ---------- Счета клиентов (главная таблица АБС) ----------
-- ВНИМАНИЕ: customer_id хранится как INT, БЕЗ FOREIGN KEY,
-- потому что таблица customers живёт в ДРУГОЙ БД (источник CRM).
-- Это типичная ситуация: между источниками FK физически не ставится.
CREATE TABLE IF NOT EXISTS accounts (
    account_id       SERIAL      PRIMARY KEY,
    account_number   VARCHAR(20) UNIQUE NOT NULL,  -- IBAN-like номер счёта
    customer_id      INT         NOT NULL,         -- логич. FK на crm.customers
    branch_id        INT REFERENCES branches(branch_id),
    account_type     VARCHAR(20),                  -- current / savings / deposit
    currency         CHAR(3)     DEFAULT 'KZT',
    balance          NUMERIC(14,2) DEFAULT 0,
    opened_at        TIMESTAMP   DEFAULT now(),
    closed_at        TIMESTAMP,
    status           VARCHAR(20) DEFAULT 'active', -- active / blocked / closed
    updated_at       TIMESTAMP   DEFAULT now()
);

-- ---------- Ежедневные обороты (агрегат для отчётности) ----------
CREATE TABLE IF NOT EXISTS daily_turnovers (
    turnover_id      BIGSERIAL   PRIMARY KEY,
    account_id       INT REFERENCES accounts(account_id),
    business_date    DATE,
    total_credit     NUMERIC(14,2),
    total_debit      NUMERIC(14,2),
    closing_balance  NUMERIC(14,2),
    UNIQUE (account_id, business_date)
);

CREATE INDEX IF NOT EXISTS idx_acc_customer    ON accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_acc_updated     ON accounts(updated_at);
CREATE INDEX IF NOT EXISTS idx_turnovers_date  ON daily_turnovers(business_date);
