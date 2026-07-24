
-- Recreate trigger for auto-creating profiles and roles on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate trigger for auto-generating referral codes
CREATE OR REPLACE TRIGGER on_profile_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Recreate trigger for auto-generating raffle slugs
CREATE OR REPLACE TRIGGER on_raffle_slug
  BEFORE INSERT OR UPDATE ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.generate_raffle_slug();

-- Recreate updated_at triggers
CREATE OR REPLACE TRIGGER update_raffles_updated_at
  BEFORE UPDATE ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_white_label_configs_updated_at
  BEFORE UPDATE ON public.white_label_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
