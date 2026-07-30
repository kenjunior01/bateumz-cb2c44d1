import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: string | null;
  adminCountries: string[];
  loading: boolean;
  signUp: (email: string, password: string, meta?: { display_name?: string; role?: string; company_name?: string }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [adminCountries, setAdminCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const ensureProfile = async (userId: string, user: User) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profileData) {
      // OAuth user who skipped registration — auto-create a basic profile
      const displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.user_metadata?.display_name ||
        user?.email?.split("@")[0] ||
        "Member";

      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          display_name: displayName,
          avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
        } as any);

      if (!insertError) {
        const { data: newProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        return newProfile;
      }
    }
    return profileData;
  };

  const fetchProfile = async (userId: string, user?: User | null) => {
    const profileData = await ensureProfile(userId, user!);
    setProfile(profileData);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    // Prioritize superadmin > admin > business > user
    const roles = roleData?.map((r: any) => r.role) || [];
    if (roles.includes("superadmin")) setRole("superadmin");
    else if (roles.includes("admin")) setRole("admin");
    else if (roles.includes("business")) setRole("business");
    else setRole(roles[0] ?? "user");

    // Fetch admin countries
    const { data: adminRegions } = await supabase
      .from("admin_regions")
      .select("country_code")
      .eq("user_id", userId);
    setAdminCountries(adminRegions?.map((r: any) => r.country_code) || []);

    // Save extra signup data (phone, province, city, interests) if pending
    const extraRaw = localStorage.getItem("bateu_signup_extra");
    if (extraRaw) {
      localStorage.removeItem("bateu_signup_extra");
      try {
        const extra = JSON.parse(extraRaw);
        const updates: {
          phone?: string;
          province?: string;
          city?: string;
          interests?: string[];
          company_name?: string;
        } = {};
        if (extra.phone) updates.phone = extra.phone;
        if (extra.province) updates.province = extra.province;
        if (extra.city) updates.city = extra.city;
        if (extra.company_name) updates.company_name = extra.company_name;
        if (extra.interests?.length > 0) updates.interests = extra.interests;
        if (Object.keys(updates).length > 0) {
          await supabase.from("profiles").update(updates).eq("user_id", userId);
        }
      } catch {}
    }

    // Process pending referral
    const refCode = localStorage.getItem("sortex_ref");
    if (refCode) {
      localStorage.removeItem("sortex_ref");
      try {
        const { data: referrer } = await supabase
          .from("profiles_public")
          .select("user_id")
          .eq("referral_code", refCode)
          .single();
        if (referrer && referrer.user_id !== userId) {
          await supabase.from("referrals").insert({
            referrer_id: referrer.user_id,
            referred_id: userId,
            referral_code: refCode,
            points_awarded: 50,
          } as any);
          await Promise.all([
            supabase.from("luck_points").insert({
              user_id: referrer.user_id, points: 50, action: "referral",
              description: "Amigo convidado registou-se na plataforma",
            }),
            supabase.from("luck_points").insert({
              user_id: userId, points: 50, action: "referral_bonus",
              description: "Bónus de registo por convite de amigo",
            }),
          ]);
        }
      } catch {}
    }
  };

  useEffect(() => {
    let active = true;
    let bootstrapped = false;

    const finishUserLoad = async (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setRole(null);
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      await fetchProfile(nextSession.user.id, nextSession.user);
      if (active) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setTimeout(() => {
          if (!bootstrapped) return;
          finishUserLoad(nextSession);
        }, 0);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      await finishUserLoad(initialSession);
      bootstrapped = true;
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, meta?: { display_name?: string; role?: string; company_name?: string }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: meta?.display_name || email,
          role: meta?.role || "user",
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, adminCountries, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
