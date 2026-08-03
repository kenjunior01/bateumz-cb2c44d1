import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

export interface CompanyBySlug {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  slug: string | null;
}

/** Resolve a company profile from a URL slug (route param `:slug`). */
export const useCompanySlug = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyBySlug | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!slug) {
        setError("Missing profile link");
        setLoading(false);
        return;
      }
      const { data } = await sb
        .from("profiles_public")
        .select("user_id, display_name, company_name, avatar_url, slug")
        .eq("slug", slug)
        .maybeSingle();

      if (!data) {
        setError("Company not found");
        setLoading(false);
        navigate("/404");
        return;
      }
      setCompany(data as CompanyBySlug);
      setLoading(false);
    };
    void run();
  }, [slug, navigate]);

  return { company, loading, error };
};

/** Generate a URL-friendly slug from a company name. */
export const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Check whether a slug is free (optionally ignoring the current owner). */
export const checkSlugAvailability = async (
  slug: string,
  excludeUserId?: string,
): Promise<boolean> => {
  if (!slug) return false;
  const { data } = await sb
    .from("profiles_public")
    .select("user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return true;
  return !!excludeUserId && data.user_id === excludeUserId;
};

/** Persist a slug on the signed-in company profile. */
export const saveCompanySlug = async (userId: string, slug: string) => {
  const { error } = await sb.from("profiles").update({ slug }).eq("user_id", userId);
  if (error) throw error;
};

export const generateUniqueSlug = async (
  name: string,
  excludeUserId?: string,
): Promise<string> => {
  const base = generateSlug(name) || "company";
  let candidate = base;
  let counter = 1;
  while (!(await checkSlugAvailability(candidate, excludeUserId)) && counter < 100) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
};
