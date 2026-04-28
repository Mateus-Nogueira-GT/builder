-- Adiciona colunas necessárias para o fluxo OAuth do Wix.
-- Sem elas, o callback /api/wix/oauth/callback falha silenciosamente
-- ao tentar salvar instanceId/access_token retornados pelo Wix.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS wix_instance_id TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS wix_api_key TEXT;

CREATE INDEX IF NOT EXISTS idx_stores_wix_instance_id ON stores(wix_instance_id);
