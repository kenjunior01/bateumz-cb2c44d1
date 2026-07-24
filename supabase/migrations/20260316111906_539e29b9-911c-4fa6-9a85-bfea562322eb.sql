
-- Re-attach missing triggers

-- 1. Trigger for auto-creating profile + role on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Trigger for auto-generating raffle slugs
CREATE OR REPLACE TRIGGER generate_slug_before_insert
  BEFORE INSERT ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.generate_raffle_slug();

CREATE OR REPLACE TRIGGER generate_slug_before_update
  BEFORE UPDATE OF title ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.generate_raffle_slug();

-- 3. Trigger for auto-generating referral codes on profiles
CREATE OR REPLACE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- 4. Trigger for updated_at on raffles
CREATE OR REPLACE TRIGGER update_raffles_updated_at
  BEFORE UPDATE ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Trigger for updated_at on profiles
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
