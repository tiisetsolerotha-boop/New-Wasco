-- ============================================================
-- DB1: PostgreSQL Schema (Supabase)
-- WASCO - Distributed Water Bill Management System
-- Tables: customers, billing_rates, bills, leakage_reports,
--         notifications, admin_audit_log
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. CUSTOMERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    account_number  VARCHAR(20)  PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    address         TEXT,
    district        VARCHAR(50)  NOT NULL DEFAULT 'Maseru',
    password_hash   TEXT         NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('admin','branch_manager','customer')),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 2. BILLING RATES (tiered)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_rates (
    rate_id         SERIAL       PRIMARY KEY,
    tier            INTEGER      NOT NULL,
    min_units       NUMERIC(10,2) NOT NULL,
    max_units       NUMERIC(10,2),          -- NULL means unlimited
    cost_per_unit   NUMERIC(10,4) NOT NULL,
    description     VARCHAR(100),
    effective_from  DATE         NOT NULL DEFAULT CURRENT_DATE,
    is_current      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Default WASCO tiered rates (M = Lesotho Maloti)
INSERT INTO billing_rates (tier, min_units, max_units, cost_per_unit, description) VALUES
  (1,  0,    6,    3.50,  'Lifeline (0-6 kL)'),
  (2,  6.01, 20,   7.80,  'Domestic low (6-20 kL)'),
  (3,  20.01, 50,  12.50, 'Domestic mid (20-50 kL)'),
  (4,  50.01, NULL, 18.00, 'High usage (>50 kL)')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 3. BILLS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
    bill_id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_number  VARCHAR(20)  NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
    billing_month   DATE         NOT NULL,   -- first day of billing month
    units_consumed  NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_status  VARCHAR(20)  NOT NULL DEFAULT 'Unpaid'
                    CHECK (payment_status IN ('Paid','Unpaid','Overdue','Partial')),
    due_date        DATE,
    issued_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 4. LEAKAGE REPORTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leakage_reports (
    report_id       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_number  VARCHAR(20)  REFERENCES customers(account_number) ON DELETE SET NULL,
    location        TEXT         NOT NULL,
    district        VARCHAR(50),
    description     TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'Open'
                    CHECK (status IN ('Open','In Progress','Resolved','Closed')),
    priority        VARCHAR(10)  NOT NULL DEFAULT 'Medium'
                    CHECK (priority IN ('Low','Medium','High','Critical')),
    reported_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- 5. NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_number  VARCHAR(20)  REFERENCES customers(account_number) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    message         TEXT         NOT NULL,
    type            VARCHAR(30)  NOT NULL DEFAULT 'info'
                    CHECK (type IN ('info','warning','overdue','payment','system')),
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 6. ADMIN AUDIT LOG
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
    log_id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    performed_by    VARCHAR(20)  REFERENCES customers(account_number) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    target_table    VARCHAR(50),
    target_id       TEXT,
    details         JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- VIEWS
-- ─────────────────────────────────────────

-- v_outstanding_balances: cross-DB join simulated in app layer
-- (MySQL payment totals are fetched in app and merged here)
CREATE OR REPLACE VIEW v_customer_bills AS
SELECT
    c.account_number,
    c.name,
    c.district,
    b.bill_id,
    b.billing_month,
    b.units_consumed,
    b.total_amount,
    b.payment_status,
    b.due_date
FROM customers c
JOIN bills b ON c.account_number = b.account_number;

-- v_overdue_bills
CREATE OR REPLACE VIEW v_overdue_bills AS
SELECT
    c.account_number,
    c.name,
    c.phone,
    c.email,
    b.bill_id,
    b.billing_month,
    b.total_amount,
    b.due_date,
    NOW()::DATE - b.due_date AS days_overdue
FROM customers c
JOIN bills b ON c.account_number = b.account_number
WHERE b.payment_status IN ('Unpaid','Overdue')
  AND b.due_date < NOW()::DATE;

-- v_district_summary
CREATE OR REPLACE VIEW v_district_summary AS
SELECT
    c.district,
    COUNT(DISTINCT c.account_number) AS total_customers,
    COUNT(b.bill_id) AS total_bills,
    COALESCE(SUM(b.total_amount), 0) AS total_billed,
    COALESCE(SUM(CASE WHEN b.payment_status = 'Paid' THEN b.total_amount ELSE 0 END), 0) AS total_collected,
    COALESCE(SUM(CASE WHEN b.payment_status != 'Paid' THEN b.total_amount ELSE 0 END), 0) AS total_outstanding
FROM customers c
LEFT JOIN bills b ON c.account_number = b.account_number
GROUP BY c.district;

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bills_account     ON bills(account_number);
CREATE INDEX IF NOT EXISTS idx_bills_month       ON bills(billing_month);
CREATE INDEX IF NOT EXISTS idx_bills_status      ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_notif_account     ON notifications(account_number);
CREATE INDEX IF NOT EXISTS idx_leakage_status    ON leakage_reports(status);

-- ─────────────────────────────────────────
-- SEED: Default Admin Account
-- Password: Admin@1234 (bcrypt hash)
-- ─────────────────────────────────────────
INSERT INTO customers (account_number, name, email, phone, address, district, password_hash, role)
VALUES (
  'WASCO-ADMIN-01',
  'System Administrator',
  'admin@wasco.ls',
  '+266 2231 4500',
  'WASCO HQ, Maseru',
  'Maseru',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Admin@1234
  'admin'
) ON CONFLICT DO NOTHING;
