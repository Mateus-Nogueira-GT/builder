-- Tabela para rastrear jobs assíncronos de migração de tamanhos.
-- Roda em batches via /api/atualizar-tamanhos/process; o frontend faz polling em /status.

CREATE TABLE IF NOT EXISTS size_update_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  owner_email TEXT,

  status TEXT NOT NULL DEFAULT 'running', -- running | completed | failed

  total_products INTEGER NOT NULL DEFAULT 0,
  current_offset INTEGER NOT NULL DEFAULT 0,
  batch_size INTEGER NOT NULL DEFAULT 30,

  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  missing_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,

  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_size_update_jobs_status ON size_update_jobs(status);
CREATE INDEX IF NOT EXISTS idx_size_update_jobs_store ON size_update_jobs(store_id);
CREATE INDEX IF NOT EXISTS idx_size_update_jobs_owner ON size_update_jobs(owner_email);
