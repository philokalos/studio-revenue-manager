-- Studio Revenue Manager - Initial Database Schema
-- Migration: 001_initial
-- Created: 2025-10-08
-- Description: Creates core tables for reservations, invoices, bank transactions, costs, goals, and summaries

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- RESERVATIONS TABLE
-- ============================================================================
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_calendar_event_id VARCHAR(255) UNIQUE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  initial_headcount INTEGER NOT NULL CHECK (initial_headcount > 0),
  headcount_changes JSONB DEFAULT '[]'::jsonb,
  channel VARCHAR(50) NOT NULL DEFAULT 'default' CHECK (channel IN ('default', 'hourplace', 'spacecloud')),
  status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
  notes TEXT,
  needs_correction BOOLEAN DEFAULT false,
  corrected_at TIMESTAMPTZ,

  -- Metadata fields (denormalized from Firestore meta subcollection)
  payer_name VARCHAR(255),
  phone VARCHAR(20),
  people_count INTEGER,
  parking_count INTEGER DEFAULT 0,
  shooting_purpose VARCHAR(255),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_people_count CHECK (people_count IS NULL OR people_count > 0)
);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  expected_amount DECIMAL(10, 2) NOT NULL CHECK (expected_amount >= 0),
  discount_type VARCHAR(20) CHECK (discount_type IN ('amount', 'rate')),
  discount_value DECIMAL(10, 2) CHECK (discount_value >= 0),
  discount_amount DECIMAL(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
  final_amount DECIMAL(10, 2) NOT NULL CHECK (final_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PAID', 'PARTIAL', 'VOID')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_discount CHECK (
    (discount_type IS NULL AND discount_value IS NULL) OR
    (discount_type IS NOT NULL AND discount_value IS NOT NULL)
  )
);

-- ============================================================================
-- DISCOUNT LOGS TABLE (replaces Firestore subcollection)
-- ============================================================================
CREATE TABLE discount_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  applied_by VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('amount', 'rate')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- BANK TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date TIMESTAMPTZ NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  depositor_name VARCHAR(255),
  memo TEXT,
  matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'UNMATCHED' CHECK (status IN ('UNMATCHED', 'MATCHED', 'PENDING_REVIEW')),
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- COSTS TABLE (Monthly aggregation)
-- ============================================================================
CREATE TABLE costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month DATE NOT NULL UNIQUE, -- Format: YYYY-MM-01 (first day of month)
  rent DECIMAL(10, 2) DEFAULT 0 CHECK (rent >= 0),
  utilities DECIMAL(10, 2) DEFAULT 0 CHECK (utilities >= 0),
  ads_total DECIMAL(10, 2) DEFAULT 0 CHECK (ads_total >= 0),
  supplies DECIMAL(10, 2) DEFAULT 0 CHECK (supplies >= 0),
  maintenance DECIMAL(10, 2) DEFAULT 0 CHECK (maintenance >= 0),
  channel_breakdown JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- GOALS TABLE (Monthly targets)
-- ============================================================================
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month DATE NOT NULL UNIQUE, -- Format: YYYY-MM-01 (first day of month)
  revenue_target DECIMAL(10, 2) NOT NULL CHECK (revenue_target >= 0),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MONTHLY SUMMARIES TABLE (Cached aggregations)
-- ============================================================================
CREATE TABLE monthly_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month DATE NOT NULL UNIQUE, -- Format: YYYY-MM-01 (first day of month)
  total_revenue DECIMAL(10, 2) DEFAULT 0 CHECK (total_revenue >= 0),
  total_costs DECIMAL(10, 2) DEFAULT 0 CHECK (total_costs >= 0),
  net_profit DECIMAL(10, 2) DEFAULT 0,
  utilization_rate DECIMAL(5, 4) CHECK (utilization_rate >= 0 AND utilization_rate <= 1),
  goal_achievement_rate DECIMAL(5, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Reservations indexes
CREATE INDEX idx_reservations_start_time ON reservations(start_time);
CREATE INDEX idx_reservations_created_at ON reservations(created_at DESC);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_needs_correction ON reservations(needs_correction) WHERE needs_correction = true;
CREATE INDEX idx_reservations_calendar_event ON reservations(google_calendar_event_id);

-- Invoices indexes
CREATE INDEX idx_invoices_reservation_id ON invoices(reservation_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Discount logs indexes
CREATE INDEX idx_discount_logs_invoice_id ON discount_logs(invoice_id);
CREATE INDEX idx_discount_logs_applied_at ON discount_logs(applied_at DESC);

-- Bank transactions indexes
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date DESC);
CREATE INDEX idx_bank_transactions_matched_invoice ON bank_transactions(matched_invoice_id);
CREATE INDEX idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX idx_bank_transactions_status_date ON bank_transactions(status, transaction_date DESC);

-- Costs indexes
CREATE INDEX idx_costs_month ON costs(month DESC);

-- Goals indexes
CREATE INDEX idx_goals_month ON goals(month DESC);

-- Monthly summaries indexes
CREATE INDEX idx_monthly_summaries_month ON monthly_summaries(month DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_transactions_updated_at BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_costs_updated_at BEFORE UPDATE ON costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_summaries_updated_at BEFORE UPDATE ON monthly_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE reservations IS 'Studio reservations from Google Calendar';
COMMENT ON TABLE invoices IS 'Billing and payment tracking for reservations';
COMMENT ON TABLE discount_logs IS 'Audit log for discount applications';
COMMENT ON TABLE bank_transactions IS 'Bank transaction records from CSV uploads';
COMMENT ON TABLE costs IS 'Monthly operational costs';
COMMENT ON TABLE goals IS 'Monthly revenue targets';
COMMENT ON TABLE monthly_summaries IS 'Cached monthly performance metrics';

COMMENT ON COLUMN reservations.headcount_changes IS 'JSON array tracking headcount changes during reservation: [{timestamp, from, to, reason}]';
COMMENT ON COLUMN reservations.needs_correction IS 'Flags reservations missing critical info (contact, payer name)';
COMMENT ON COLUMN invoices.expected_amount IS 'Amount calculated by pricing engine before discounts';
COMMENT ON COLUMN invoices.final_amount IS 'Final amount after discounts applied';
COMMENT ON COLUMN bank_transactions.raw_data IS 'Original parsed CSV data for audit trail';
COMMENT ON COLUMN costs.channel_breakdown IS 'Optional detailed breakdown by advertising channel';
COMMENT ON COLUMN monthly_summaries.utilization_rate IS 'Reservation rate excluding operational blocks (0.0-1.0)';
COMMENT ON COLUMN monthly_summaries.goal_achievement_rate IS 'Actual revenue / target revenue (can exceed 1.0)';
