-- =====================================================================
-- ИСТОЧНИК 1: CRM (Customer Relationship Management)
-- Отдельная система — управление клиентской базой
-- Владелец: блок розничного маркетинга / клиентской аналитики
-- Способ обновления: real-time (через events / Kafka)
-- =====================================================================

-- ВЫПОЛНЯТЬ КАК postgres:
-- DROP DATABASE IF EXISTS crm;
-- CREATE DATABASE crm;
-- \c crm;

CREATE SCHEMA IF NOT EXISTS crm;
SET search_path TO crm;

-- ---------- Клиенты (master-таблица CRM) ----------
CREATE TABLE IF NOT EXISTS customers (
    customer_id      SERIAL      PRIMARY KEY,
    first_name       VARCHAR(50),
    last_name        VARCHAR(50),
    iin              VARCHAR(12) UNIQUE,
    birth_date       DATE,
    gender           CHAR(1),
    city             VARCHAR(50),
    segment          VARCHAR(20),                  -- mass / premium / wealth
    manager_id       INT,                          -- персональный менеджер
    registered_at    TIMESTAMP   DEFAULT now(),
    updated_at       TIMESTAMP   DEFAULT now()
);

-- ---------- Контакты клиента (телефоны, email, адреса) ----------
CREATE TABLE IF NOT EXISTS customer_contacts (
    contact_id       SERIAL      PRIMARY KEY,
    customer_id      INT REFERENCES customers(customer_id),
    contact_type     VARCHAR(20),                  -- phone / email / address
    contact_value    VARCHAR(200),
    is_primary       BOOLEAN     DEFAULT FALSE,
    verified         BOOLEAN     DEFAULT FALSE,
    created_at       TIMESTAMP   DEFAULT now()
);

-- ---------- История смены сегмента (SCD type 2) ----------
CREATE TABLE IF NOT EXISTS customer_segments_history (
    history_id       SERIAL      PRIMARY KEY,
    customer_id      INT REFERENCES customers(customer_id),
    segment          VARCHAR(20),
    valid_from       DATE,
    valid_to         DATE,                         -- NULL = текущий сегмент
    reason           VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_customers_updated   ON customers(updated_at);
CREATE INDEX IF NOT EXISTS idx_contacts_customer   ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_segments_customer   ON customer_segments_history(customer_id);
