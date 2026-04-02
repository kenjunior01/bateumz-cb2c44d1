
-- Insert missing profile for current admin user
INSERT INTO public.profiles (user_id, display_name)
VALUES ('d52df5dd-cc6c-44a0-916d-72c265543791', 'Junior Ernesto')
ON CONFLICT (user_id) DO NOTHING;

-- Insert admin role for current user
INSERT INTO public.user_roles (user_id, role)
VALUES ('d52df5dd-cc6c-44a0-916d-72c265543791', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also give business role so they can create raffles
INSERT INTO public.user_roles (user_id, role)
VALUES ('d52df5dd-cc6c-44a0-916d-72c265543791', 'business')
ON CONFLICT (user_id, role) DO NOTHING;
