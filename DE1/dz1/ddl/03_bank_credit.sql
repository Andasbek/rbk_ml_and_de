-- =====================================================================
-- ИСТОЧНИК 3: bank_credit (Кредитный конвейер)
-- Заявки, договоры, графики платежей.
-- Связь с bank_core: loan_applications.customer_id
-- =====================================================================

-- DROP DATABASE IF EXISTS bank_credit;
-- CREATE DATABASE bank_credit;
-- \c bank_credit;

CREATE SCHEMA IF NOT EXISTS credit;
SET search_path TO credit;

-- ---------- Заявки на кредит ----------
CREATE TABLE IF NOT EXISTS loan_applications (
    application_id    BIGSERIAL  PRIMARY KEY,
    customer_id       INT         NOT NULL,         -- логич. FK на bank_core.customers
    application_dt    DATE        NOT NULL,
    requested_amount  NUMERIC(14,2),
    requested_term_m  INT,                          -- срок, месяцев
    purpose           VARCHAR(40),                  -- mortgage / car / consumer ...
    income_declared   NUMERIC(14,2),
    employment_years  INT,
    credit_score      INT,
    status            VARCHAR(20),                  -- new / in_review / approved / rejected
    decision_dt       DATE,
    risk_grade        CHAR(1)                       -- A / B / C / D
);

-- ---------- Кредитные договоры ----------
CREATE TABLE IF NOT EXISTS loan_agreements (
    loan_id           BIGSERIAL   PRIMARY KEY,
    application_id    BIGINT REFERENCES loan_applications(application_id),
    approved_amount   NUMERIC(14,2),
    interest_rate     NUMERIC(5,2),                 -- годовая ставка, %
    effective_rate    NUMERIC(5,2),                 -- ПСК
    disbursement_date DATE,
    maturity_date     DATE,
    loan_status       VARCHAR(20) DEFAULT 'active'  -- active / paid / default / restructured
);

-- ---------- График платежей ----------
CREATE TABLE IF NOT EXISTS payment_schedule (
    schedule_id       BIGSERIAL   PRIMARY KEY,
    loan_id           BIGINT REFERENCES loan_agreements(loan_id),
    due_date          DATE,
    principal_due     NUMERIC(12,2),
    interest_due      NUMERIC(12,2),
    total_due         NUMERIC(12,2),
    actual_payment_dt DATE,
    actual_paid       NUMERIC(12,2),
    overdue_days      INT          DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_app_customer        ON loan_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_app_dt              ON loan_applications(application_dt);
CREATE INDEX IF NOT EXISTS idx_loans_application   ON loan_agreements(application_id);
CREATE INDEX IF NOT EXISTS idx_ps_loan             ON payment_schedule(loan_id);
