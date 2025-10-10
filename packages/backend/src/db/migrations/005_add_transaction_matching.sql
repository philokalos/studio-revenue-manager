-- Migration: 005_add_transaction_matching.sql
-- Description: Add bank transaction matching tables
-- Track 5: CSV Bank Matching

-- Bank Transactions Table
-- Stores parsed bank transactions from CSV
CREATE TABLE IF NOT EXISTS bank_transactions (
  id SERIAL PRIMARY KEY,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance DECIMAL(10, 2),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL')),
  raw_data TEXT,
  bank_type VARCHAR(50) DEFAULT 'DEFAULT',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Transaction Matches Table
-- Links bank transactions to reservations
CREATE TABLE IF NOT EXISTS transaction_matches (
  id SERIAL PRIMARY KEY,
  bank_transaction_id INTEGER NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  match_confidence DECIMAL(3, 2) NOT NULL CHECK (match_confidence >= 0 AND match_confidence <= 1),
  match_reason TEXT,
  match_status VARCHAR(20) NOT NULL CHECK (match_status IN ('AUTO', 'MANUAL', 'REJECTED')) DEFAULT 'AUTO',
  matched_by INTEGER REFERENCES users(id),
  matched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique mapping between transaction and reservation
  CONSTRAINT unique_transaction_reservation UNIQUE (bank_transaction_id, reservation_id)
);

-- CSV Import Log Table
-- Track CSV file imports and processing results
CREATE TABLE IF NOT EXISTS csv_import_log (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  bank_type VARCHAR(50) NOT NULL,
  total_rows INTEGER NOT NULL,
  successful_rows INTEGER NOT NULL,
  failed_rows INTEGER NOT NULL,
  total_matches INTEGER,
  average_confidence DECIMAL(3, 2),
  errors TEXT[],
  imported_by INTEGER REFERENCES users(id),
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date DESC);
CREATE INDEX idx_bank_transactions_type ON bank_transactions(transaction_type);
CREATE INDEX idx_bank_transactions_amount ON bank_transactions(amount);

CREATE INDEX idx_transaction_matches_bank_transaction ON transaction_matches(bank_transaction_id);
CREATE INDEX idx_transaction_matches_reservation ON transaction_matches(reservation_id);
CREATE INDEX idx_transaction_matches_status ON transaction_matches(match_status);
CREATE INDEX idx_transaction_matches_confidence ON transaction_matches(match_confidence DESC);

CREATE INDEX idx_csv_import_log_imported_at ON csv_import_log(imported_at DESC);
CREATE INDEX idx_csv_import_log_bank_type ON csv_import_log(bank_type);

-- Updated_at triggers
CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_matches_updated_at
  BEFORE UPDATE ON transaction_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE bank_transactions IS 'Stores bank transactions parsed from CSV files';
COMMENT ON COLUMN bank_transactions.transaction_date IS 'Date of the bank transaction';
COMMENT ON COLUMN bank_transactions.description IS 'Transaction description from bank statement';
COMMENT ON COLUMN bank_transactions.amount IS 'Transaction amount (always positive)';
COMMENT ON COLUMN bank_transactions.transaction_type IS 'Type: DEPOSIT (incoming) or WITHDRAWAL (outgoing)';
COMMENT ON COLUMN bank_transactions.bank_type IS 'Bank format used for parsing (KB_KOOKMIN, SHINHAN, etc.)';

COMMENT ON TABLE transaction_matches IS 'Links bank transactions to studio reservations';
COMMENT ON COLUMN transaction_matches.match_confidence IS 'Confidence score 0-1 for the match';
COMMENT ON COLUMN transaction_matches.match_status IS 'AUTO (algorithmic), MANUAL (user confirmed), or REJECTED';
COMMENT ON COLUMN transaction_matches.matched_by IS 'User who confirmed or rejected the match';

COMMENT ON TABLE csv_import_log IS 'Audit log for CSV file imports';
COMMENT ON COLUMN csv_import_log.total_matches IS 'Number of transactions matched to reservations';
COMMENT ON COLUMN csv_import_log.average_confidence IS 'Average confidence score for matched transactions';
