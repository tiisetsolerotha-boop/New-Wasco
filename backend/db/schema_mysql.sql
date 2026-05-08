-- ============================================================
-- DB2: MySQL Schema (Railway)
-- WASCO - Distributed Water Bill Management System
-- Tables: water_usage, payments
-- Fragment DB for load-balanced operational data
-- ============================================================

-- ─────────────────────────────────────────
-- 1. WATER USAGE (meter readings)
-- account_number references DB1.customers (cross-DB FK - enforced at app level)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_usage (
    usage_id        CHAR(36)       PRIMARY KEY DEFAULT (UUID()),
    account_number  VARCHAR(20)    NOT NULL,
    billing_month   DATE           NOT NULL,   -- first day of month
    previous_reading DECIMAL(12,3) NOT NULL DEFAULT 0,
    current_reading  DECIMAL(12,3) NOT NULL DEFAULT 0,
    units_consumed  DECIMAL(10,3)  GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
    recorded_by     VARCHAR(50),               -- meter reader name/ID
    recorded_at     DATETIME       NOT NULL DEFAULT NOW(),
    notes           TEXT,
    UNIQUE KEY uk_usage_account_month (account_number, billing_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────
-- 2. PAYMENTS
-- bill_id references DB1.bills.bill_id (cross-DB FK - enforced at app level)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    payment_id      CHAR(36)       PRIMARY KEY DEFAULT (UUID()),
    bill_id         CHAR(36)       NOT NULL,
    account_number  VARCHAR(20)    NOT NULL,
    amount_paid     DECIMAL(12,2)  NOT NULL,
    payment_method  VARCHAR(30)    NOT NULL DEFAULT 'Cash'
                    CHECK (payment_method IN ('Cash','EFT','Mobile Money','Card','Cheque')),
    transaction_ref VARCHAR(100),
    payment_date    DATETIME       NOT NULL DEFAULT NOW(),
    recorded_by     VARCHAR(50),
    notes           TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX idx_usage_account  ON water_usage(account_number);
CREATE INDEX idx_usage_month    ON water_usage(billing_month);
CREATE INDEX idx_pay_bill       ON payments(bill_id);
CREATE INDEX idx_pay_account    ON payments(account_number);
CREATE INDEX idx_pay_date       ON payments(payment_date);

-- ─────────────────────────────────────────
-- VIEWS (MySQL)
-- ─────────────────────────────────────────

-- Monthly usage summary per customer
CREATE OR REPLACE VIEW v_monthly_usage AS
SELECT
    account_number,
    YEAR(billing_month)  AS yr,
    MONTH(billing_month) AS mo,
    SUM(units_consumed)  AS total_units,
    MAX(current_reading) AS latest_reading
FROM water_usage
GROUP BY account_number, YEAR(billing_month), MONTH(billing_month);

-- Payment totals per bill (used in cross-DB outstanding balance query)
CREATE OR REPLACE VIEW v_bill_payments AS
SELECT
    bill_id,
    account_number,
    SUM(amount_paid)   AS total_paid,
    COUNT(*)           AS payment_count,
    MAX(payment_date)  AS last_payment_date
FROM payments
GROUP BY bill_id, account_number;

-- District usage trends (joined with customer district in app layer)
CREATE OR REPLACE VIEW v_usage_trends AS
SELECT
    account_number,
    DATE_FORMAT(billing_month, '%Y-%m') AS period,
    units_consumed,
    previous_reading,
    current_reading,
    recorded_at
FROM water_usage
ORDER BY account_number, billing_month;
