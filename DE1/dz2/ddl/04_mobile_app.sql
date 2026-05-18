-- =====================================================================
-- ИСТОЧНИК 4: Mobile App (Мобильное и интернет-банковское приложение)
-- Отдельная система — клиентские сессии и события в приложении
-- Владелец: digital-команда (front + backend моб.банка)
-- Способ обновления: real-time stream (Kafka / Kinesis)
-- Связь с CRM: devices.customer_id, sessions.customer_id
--              →  crm.customers.customer_id  (логически)
-- =====================================================================

-- DROP DATABASE IF EXISTS mobile_app;
-- CREATE DATABASE mobile_app;
-- \c mobile_app;

CREATE SCHEMA IF NOT EXISTS app;
SET search_path TO app;

-- ---------- Устройства клиентов ----------
CREATE TABLE IF NOT EXISTS devices (
    device_id        BIGSERIAL   PRIMARY KEY,
    customer_id      INT         NOT NULL,         -- логич. FK на crm.customers
    device_type      VARCHAR(20),                  -- ios / android / web
    os_version       VARCHAR(20),
    app_version      VARCHAR(20),
    push_token       VARCHAR(64),
    is_trusted       BOOLEAN     DEFAULT TRUE,
    first_seen_at    TIMESTAMP,
    last_seen_at     TIMESTAMP
);

-- ---------- Сессии в приложении ----------
CREATE TABLE IF NOT EXISTS sessions (
    session_id       VARCHAR(64) PRIMARY KEY,
    customer_id      INT         NOT NULL,
    device_id        BIGINT REFERENCES devices(device_id),
    login_time       TIMESTAMP,
    logout_time      TIMESTAMP,
    ip_address       VARCHAR(45),
    city             VARCHAR(50),
    is_successful    BOOLEAN     DEFAULT TRUE,
    auth_method      VARCHAR(20)                   -- password / biometric / otp
);

-- ---------- События ----------
CREATE TABLE IF NOT EXISTS events (
    event_id         BIGSERIAL   PRIMARY KEY,
    session_id       VARCHAR(64) REFERENCES sessions(session_id),
    event_time       TIMESTAMP,
    event_type       VARCHAR(40),                  -- login / view_balance / make_transfer / ...
    amount           NUMERIC(12,2),
    target_account   VARCHAR(20),
    is_successful    BOOLEAN     DEFAULT TRUE,
    error_message    VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_dev_customer   ON devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sess_customer  ON sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sess_login     ON sessions(login_time);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_time    ON events(event_time);
