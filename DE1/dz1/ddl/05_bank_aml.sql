-- =====================================================================
-- ИСТОЧНИК 5: bank_aml (Anti-Money Laundering / Антифрод)
-- Мониторинг подозрительных транзакций и сработавшие правила.
-- Связь с bank_core: monitored_txs.customer_id и monitored_txs.trx_id
-- =====================================================================

-- DROP DATABASE IF EXISTS bank_aml;
-- CREATE DATABASE bank_aml;
-- \c bank_aml;

CREATE SCHEMA IF NOT EXISTS aml;
SET search_path TO aml;

-- ---------- Справочник правил ----------
CREATE TABLE IF NOT EXISTS risk_rules (
    rule_id          SERIAL      PRIMARY KEY,
    rule_code        VARCHAR(30) UNIQUE,
    rule_name        VARCHAR(100),
    severity         VARCHAR(20),                  -- low / medium / high
    description      VARCHAR(300),
    is_active        BOOLEAN     DEFAULT TRUE
);

-- ---------- Мониторируемые транзакции ----------
CREATE TABLE IF NOT EXISTS monitored_txs (
    monitor_id       BIGSERIAL   PRIMARY KEY,
    trx_id           BIGINT      NOT NULL,         -- логич. FK на bank_core.transactions.trx_id
    customer_id      INT         NOT NULL,
    trx_datetime     TIMESTAMP,
    amount           NUMERIC(12,2),
    currency         CHAR(3),
    channel          VARCHAR(20),                  -- atm / pos / online / branch
    risk_score       NUMERIC(5,2),                 -- 0..100
    is_flagged       BOOLEAN     DEFAULT FALSE,
    triggered_rules  VARCHAR(300),                 -- список через запятую
    created_at       TIMESTAMP   DEFAULT now()
);

-- ---------- Алерты ----------
CREATE TABLE IF NOT EXISTS aml_alerts (
    alert_id         BIGSERIAL   PRIMARY KEY,
    monitor_id       BIGINT REFERENCES monitored_txs(monitor_id),
    rule_id          INT  REFERENCES risk_rules(rule_id),
    alert_datetime   TIMESTAMP,
    severity         VARCHAR(20),
    assigned_officer VARCHAR(100),
    status           VARCHAR(30) DEFAULT 'open',   -- open / closed_SAR_filed / false_positive
    sar_filed        BOOLEAN     DEFAULT FALSE,
    closed_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mon_customer        ON monitored_txs(customer_id);
CREATE INDEX IF NOT EXISTS idx_mon_trx             ON monitored_txs(trx_id);
CREATE INDEX IF NOT EXISTS idx_mon_flagged         ON monitored_txs(is_flagged);
CREATE INDEX IF NOT EXISTS idx_alerts_monitor      ON aml_alerts(monitor_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status       ON aml_alerts(status);
