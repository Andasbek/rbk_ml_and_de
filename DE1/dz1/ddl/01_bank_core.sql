-- =====================================================================
-- ИСТОЧНИК 1: bank_core (АБС — Автоматизированная Банковская Система)
-- Хранит клиентов, счета, отделения, транзакции по счетам
-- =====================================================================

-- Подключаемся к postgres и создаём БД
-- (Выполнять в psql как суперпользователь)
-- DROP DATABASE IF EXISTS bank_core;
-- CREATE DATABASE bank_core;
-- \c bank_core;

CREATE SCHEMA IF NOT EXISTS core;
SET search_path TO core;

-- ---------- Справочник отделений ----------
CREATE TABLE IF NOT EXISTS branches (
    branch_id        SERIAL      PRIMARY KEY,
    branch_code      VARCHAR(10) UNIQUE NOT NULL,
    branch_name      VARCHAR(100),
    city             VARCHAR(50),
    address          VARCHAR(200),
    opened_date      DATE,
    is_active        BOOLEAN     DEFAULT TRUE
);

-- ---------- Клиенты ----------
CREATE TABLE IF NOT EXISTS customers (
    customer_id      SERIAL      PRIMARY KEY,
    first_name       VARCHAR(50),
    last_name        VARCHAR(50),
    iin              VARCHAR(12) UNIQUE,           -- ИИН (РК) / паспорт
    birth_date       DATE,
    gender           CHAR(1),
    phone            VARCHAR(20),
    email            VARCHAR(100),
    city             VARCHAR(50),
    branch_id        INT REFERENCES branches(branch_id),
    segment          VARCHAR(20),                  -- mass / premium / wealth
    registered_at    TIMESTAMP   DEFAULT now(),
    updated_at       TIMESTAMP   DEFAULT now()
);

-- ---------- Счета ----------
CREATE TABLE IF NOT EXISTS accounts (
    account_id       SERIAL      PRIMARY KEY,
    account_number   VARCHAR(20) UNIQUE NOT NULL,  -- "счёт" клиента (IBAN-like)
    customer_id      INT REFERENCES customers(customer_id),
    account_type     VARCHAR(20),                  -- current / savings / deposit
    currency         CHAR(3)     DEFAULT 'KZT',
    balance          NUMERIC(14,2) DEFAULT 0,
    opened_at        TIMESTAMP   DEFAULT now(),
    closed_at        TIMESTAMP,
    status           VARCHAR(20) DEFAULT 'active', -- active / blocked / closed
    updated_at       TIMESTAMP   DEFAULT now()
);

-- ---------- Транзакции по счетам (главная факт-таблица АБС) ----------
CREATE TABLE IF NOT EXISTS transactions (
    trx_id           BIGSERIAL   PRIMARY KEY,
    account_id       INT REFERENCES accounts(account_id),
    branch_id        INT REFERENCES branches(branch_id),
    trx_datetime     TIMESTAMP   NOT NULL,
    trx_type         VARCHAR(20),                  -- debit / credit / transfer
    amount           NUMERIC(12,2),
    currency         CHAR(3)     DEFAULT 'KZT',
    description      VARCHAR(200),
    counterparty     VARCHAR(100),
    posting_date     DATE,
    updated_at       TIMESTAMP   DEFAULT now()
);

-- Индексы для последующих ETL/CDC-выборок
CREATE INDEX IF NOT EXISTS idx_trx_updated_at      ON transactions(updated_at);
CREATE INDEX IF NOT EXISTS idx_trx_account         ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_customers_updated   ON customers(updated_at);
CREATE INDEX IF NOT EXISTS idx_accounts_customer   ON accounts(customer_id);
