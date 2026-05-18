-- =====================================================================
-- ИСТОЧНИК 4: bank_dbo (Дистанционное Банковское Обслуживание)
-- Мобильное / интернет-приложение: устройства, сессии, события.
-- Связь с bank_core: customer_id
-- =====================================================================

-- DROP DATABASE IF EXISTS bank_dbo;
-- CREATE DATABASE bank_dbo;
-- \c bank_dbo;

CREATE SCHEMA IF NOT EXISTS dbo;
SET search_path TO dbo;

-- ---------- Устройства клиента ----------
CREATE TABLE IF NOT EXISTS devices (
    device_id        BIGSERIAL   PRIMARY KEY,
    customer_id      INT         NOT NULL,          -- логич. FK на bank_core.customers
    device_type      VARCHAR(20),                   -- ios / android / web
    os_version       VARCHAR(20),
    app_version      VARCHAR(20),
    push_token       VARCHAR(64),
    is_trusted       BOOLEAN     DEFAULT TRUE,
    first_seen_at    TIMESTAMP   DEFAULT now(),
    last_seen_at     TIMESTAMP   DEFAULT now()
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
    auth_method      VARCHAR(20)                    -- password / biometric / otp
);

-- ---------- События в приложении ----------
CREATE TABLE IF NOT EXISTS events (
    event_id         BIGSERIAL   PRIMARY KEY,
    session_id       VARCHAR(64) REFERENCES sessions(session_id),
    event_time       TIMESTAMP,
    event_type       VARCHAR(40),                   -- login / view_balance / make_transfer / pay_utility / open_card
    amount           NUMERIC(12,2),                 -- если применимо
    target_account   VARCHAR(20),
    is_successful    BOOLEAN     DEFAULT TRUE,
    error_message    VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_devices_customer    ON devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_customer   ON sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_login      ON sessions(login_time);
CREATE INDEX IF NOT EXISTS idx_events_session      ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_time         ON events(event_time);
