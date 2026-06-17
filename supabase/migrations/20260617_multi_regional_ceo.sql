
-- Allow multi-regional CEOs: remove unique constraint on user_id, add unique (user_id, country_code)
ALTER TABLE public.admin_regions
DROP CONSTRAINT IF EXISTS admin_regions_user_id_key;

ALTER TABLE public.admin_regions
ADD CONSTRAINT admin_regions_user_id_country_code_key UNIQUE (user_id, country_code);


-- Also update regional commissions to allow per region per user
ALTER TABLE public.regional_commissions
DROP CONSTRAINT IF EXISTS regional_commissions_user_id_key;

ALTER TABLE public.regional_commissions
ADD CONSTRAINT regional_commissions_user_id_country_code_key UNIQUE (user_id, country_code);
