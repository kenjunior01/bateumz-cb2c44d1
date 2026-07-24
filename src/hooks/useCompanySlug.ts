import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
}

export const useCompanySlug = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyBySlug = async () => {
      if (!slug) {
        setError('Slug não fornecido');
        setLoading(false);
        return;
      }

      try {
        const { data, error: queryError } = await (supabase as any)
          .from('companies')
          .select('id, name, slug, logo_url, description')
          .eq('slug', slug)
          .single();

        if (queryError) {
          setError('Empresa não encontrada');
          navigate('/404');
          return;
        }

        setCompany(data);
      } catch (err) {
        console.error('Error fetching company:', err);
        setError('Erro ao carregar empresa');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyBySlug();
  }, [slug, navigate]);

  return { company, loading, error };
};

/**
 * Generate a URL-friendly slug from a company name
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Check if a slug is available
 */
export const checkSlugAvailability = async (slug: string, excludeId?: string): Promise<boolean> => {
  try {
    let query = (supabase as any)
      .from('companies')
      .select('id')
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.single();

    if (error && error.code === 'PGRST116') {
      // No rows found - slug is available
      return true;
    }

    return !data;
  } catch (err) {
    console.error('Error checking slug availability:', err);
    return false;
  }
};

/**
 * Generate a unique slug with counter if needed
 */
export const generateUniqueSlug = async (name: string, excludeId?: string): Promise<string> => {
  let slug = generateSlug(name);
  let counter = 1;
  let isAvailable = await checkSlugAvailability(slug, excludeId);

  while (!isAvailable && counter < 100) {
    slug = `${generateSlug(name)}-${counter}`;
    isAvailable = await checkSlugAvailability(slug, excludeId);
    counter++;
  }

  return slug;
};
