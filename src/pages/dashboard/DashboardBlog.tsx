import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, MoreVertical, Eye, Edit, Trash2, FileText, EyeOff,
  Globe, FolderOpen, TrendingUp, Tag, X, Check, Loader2, Image as ImageIcon,
  ChevronDown, ArrowUpDown, ExternalLink, RefreshCw, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string;
  image_url: string | null;
  author_id: string;
  category_id: string | null;
  region_id: string | null;
  published: boolean;
  published_at: string | null;
  source_url: string | null;
  seo_keywords: string[] | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  blog_categories?: BlogCategory;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

interface PostFormData {
  title: string;
  slug: string;
  content: string;
  summary: string;
  image_url: string;
  category_id: string;
  published: boolean;
  source_url: string;
  seo_keywords: string;
}

const emptyForm: PostFormData = {
  title: "",
  slug: "",
  content: "",
  summary: "",
  image_url: "",
  category_id: "",
  published: false,
  source_url: "",
  seo_keywords: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 120);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── Animation Variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const cardHover = {
  scale: 1.02,
  transition: { type: "spring", stiffness: 400, damping: 25 },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DashboardBlog() {
  const { user, role } = useAuth();

  // State: Posts
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortField, setSortField] = useState<"created_at" | "title" | "view_count">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // State: Categories
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  // State: Dialogs
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<PostFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [imagePreview, setImagePreview] = useState(false);

  // ─── Auth guard ────────────────────────────────────────────────────────────
  const isAdmin = role === "admin" || role === "superadmin";

  // ─── Fetch categories ───────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from("blog_categories")
      .select("*")
      .order("name", { ascending: true });
    if (data) setCategories(data);
  }, []);

  // ─── Fetch posts ───────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*, blog_categories(*)")
      .order(sortField, { ascending: sortDir === "asc" });

    if (error) {
      toast.error("Erro ao carregar posts");
      console.error(error);
    }
    if (data) setPosts(data as BlogPost[]);
    setLoading(false);
  }, [user, sortField, sortDir]);

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, [fetchCategories, fetchPosts]);

  // ─── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("blog-posts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_posts" },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    const catChannel = supabase
      .channel("blog-categories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_categories" },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(catChannel);
    };
  }, [fetchPosts, fetchCategories]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p) => p.published).length;
  const draftPosts = posts.filter((p) => !p.published).length;
  const totalViews = posts.reduce((acc, p) => acc + (p.view_count || 0), 0);

  // ─── Filtering & Sorting ───────────────────────────────────────────────────
  const filteredPosts = posts.filter((post) => {
    if (filterStatus === "published" && !post.published) return false;
    if (filterStatus === "draft" && post.published) return false;
    if (filterCategory !== "all" && post.category_id !== filterCategory) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        post.title.toLowerCase().includes(s) ||
        post.summary?.toLowerCase().includes(s) ||
        post.blog_categories?.name.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // ─── Open create dialog ─────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingPost(null);
    setFormData(emptyForm);
    setPostDialogOpen(true);
  };

  // ─── Open edit dialog ──────────────────────────────────────────────────────
  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content,
      summary: post.summary || "",
      image_url: post.image_url || "",
      category_id: post.category_id || "",
      published: post.published,
      source_url: post.source_url || "",
      seo_keywords: (post.seo_keywords || []).join(", "),
    });
    setPostDialogOpen(true);
    setOpenMenu(null);
  };

  // ─── Auto-generate slug from title ─────────────────────────────────────────
  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: editingPost ? prev.slug : generateSlug(title),
    }));
  };

  // ─── Save post ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("O título é obrigatório");
      return;
    }
    if (!formData.slug.trim()) {
      toast.error("O slug é obrigatório");
      return;
    }

    setSaving(true);

    const payload = {
      title: formData.title.trim(),
      slug: formData.slug.trim(),
      content: formData.content,
      summary: formData.summary.trim().substring(0, 200),
      image_url: formData.image_url.trim() || null,
      category_id: formData.category_id || null,
      published: formData.published,
      published_at: formData.published ? (editingPost?.published_at || new Date().toISOString()) : null,
      source_url: formData.source_url.trim() || null,
      seo_keywords: formData.seo_keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      author_id: user?.id,
      view_count: 0,
    };

    if (editingPost) {
      const { error } = await supabase
        .from("blog_posts")
        .update(payload)
        .eq("id", editingPost.id);
      if (error) {
        toast.error("Erro ao atualizar post");
        console.error(error);
      } else {
        toast.success("Post atualizado com sucesso!");
        setPostDialogOpen(false);
        fetchPosts();
      }
    } else {
      const { error } = await supabase.from("blog_posts").insert(payload);
      if (error) {
        toast.error("Erro ao criar post");
        console.error(error);
      } else {
        toast.success("Post criado com sucesso!");
        setPostDialogOpen(false);
        fetchPosts();
      }
    }

    setSaving(false);
  };

  // ─── Toggle publish ────────────────────────────────────────────────────────
  const togglePublish = async (post: BlogPost) => {
    const newPublished = !post.published;
    const { error } = await supabase
      .from("blog_posts")
      .update({
        published: newPublished,
        published_at: newPublished ? new Date().toISOString() : null,
      })
      .eq("id", post.id);

    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      toast.success(newPublished ? "Post publicado!" : "Post movido para rascunho");
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                published: newPublished,
                published_at: newPublished ? new Date().toISOString() : null,
              }
            : p
        )
      );
    }
    setOpenMenu(null);
  };

  // ─── Delete post ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!postToDelete) return;
    setDeleting(postToDelete.id);
    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", postToDelete.id);
    if (error) {
      toast.error("Erro ao eliminar post");
      console.error(error);
    } else {
      toast.success("Post eliminado com sucesso");
      setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
      setDeleteConfirmOpen(false);
      setPostToDelete(null);
    }
    setDeleting(null);
  };

  // ─── Add category ──────────────────────────────────────────────────────────
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }
    setAddingCategory(true);
    const { error } = await supabase.from("blog_categories").insert({
      name: newCategoryName.trim(),
      slug: generateSlug(newCategoryName),
      description: newCategoryDesc.trim() || null,
    });
    if (error) {
      toast.error("Erro ao criar categoria");
      console.error(error);
    } else {
      toast.success("Categoria criada com sucesso!");
      setNewCategoryName("");
      setNewCategoryDesc("");
      fetchCategories();
    }
    setAddingCategory(false);
  };

  // ─── Delete category ───────────────────────────────────────────────────────
  const handleDeleteCategory = async (catId: string) => {
    // Check if any posts use this category
    const hasPosts = posts.some((p) => p.category_id === catId);
    if (hasPosts) {
      toast.error("Não é possível eliminar uma categoria com posts associados");
      return;
    }
    const { error } = await supabase
      .from("blog_categories")
      .delete()
      .eq("id", catId);
    if (error) {
      toast.error("Erro ao eliminar categoria");
    } else {
      toast.success("Categoria eliminada");
      fetchCategories();
    }
  };

  // ─── Stats Cards ───────────────────────────────────────────────────────────

  const statsCards = [
    {
      label: "Total de Posts",
      value: totalPosts,
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
    },
    {
      label: "Publicados",
      value: publishedPosts,
      icon: Globe,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    },
    {
      label: "Rascunhos",
      value: draftPosts,
      icon: EyeOff,
      color: "text-amber-500",
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
    },
    {
      label: "Visualizações",
      value: totalViews,
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Acesso Negado</h2>
            <p className="text-muted-foreground text-center">
              Apenas administradores podem aceder ao painel do blog.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Gestão do Blog
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie, edite e publique artigos do blog
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Novo Post
        </Button>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statsCards.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants as any} whileHover={cardHover}>
            <Card className="overflow-hidden">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts" className="gap-2">
            <FileText className="h-4 w-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Categorias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as "all" | "published" | "draft")}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterCategory}
              onValueChange={(v) => setFilterCategory(v)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchPosts}
              className="shrink-0"
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </motion.div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <FileText className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground font-medium">
                    {search || filterStatus !== "all" || filterCategory !== "all"
                      ? "Nenhum post encontrado"
                      : "Nenhum post criado ainda"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {search || filterStatus !== "all" || filterCategory !== "all"
                      ? "Tente ajustar os filtros de pesquisa"
                      : "Clique em \"Novo Post\" para começar"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                          Post
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                          Categoria
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                          Status
                        </th>
                        <th
                          className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 cursor-pointer select-none hidden lg:table-cell"
                          onClick={() => toggleSort("view_count")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Visualizações
                            <ArrowUpDown className="h-3 w-3" />
                          </span>
                        </th>
                        <th
                          className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 cursor-pointer select-none hidden sm:table-cell"
                          onClick={() => toggleSort("created_at")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Data
                            <ArrowUpDown className="h-3 w-3" />
                          </span>
                        </th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filteredPosts.map((post, index) => (
                          <motion.tr
                            key={post.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ delay: index * 0.03 }}
                            className="border-b border-border/30 hover:bg-muted/30 transition-colors group"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {post.image_url ? (
                                  <img
                                    src={post.image_url}
                                    alt={post.title}
                                    className="h-10 w-10 rounded-lg object-cover shrink-0 bg-muted"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate max-w-[200px] lg:max-w-[300px]">
                                    {post.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px] lg:max-w-[300px]">
                                    /{post.slug}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 hidden md:table-cell">
                              {post.blog_categories ? (
                                <Badge variant="secondary" className="text-xs">
                                  {post.blog_categories.name}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3 hidden sm:table-cell">
                              <Badge
                                variant={post.published ? "default" : "outline"}
                                className={
                                  post.published
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                                }
                              >
                                <span className="flex items-center gap-1">
                                  {post.published ? (
                                    <>
                                      <Globe className="h-3 w-3" />
                                      Publicado
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="h-3 w-3" />
                                      Rascunho
                                    </>
                                  )}
                                </span>
                              </Badge>
                            </td>

                            <td className="px-4 py-3 hidden lg:table-cell">
                              <span className="text-sm text-muted-foreground">
                                {formatNumber(post.view_count || 0)}
                              </span>
                            </td>

                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="text-sm text-muted-foreground">
                                {formatDate(post.created_at)}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="relative inline-block">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    setOpenMenu(openMenu === post.id ? null : post.id)
                                  }
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>

                                <AnimatePresence>
                                  {openMenu === post.id && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute right-0 top-10 z-50 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 overflow-hidden"
                                    >
                                      <button
                                        onClick={() => {
                                          togglePublish(post);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                                      >
                                        {post.published ? (
                                          <>
                                            <EyeOff className="h-4 w-4" />
                                            Despublicar
                                          </>
                                        ) : (
                                          <>
                                            <Globe className="h-4 w-4" />
                                            Publicar
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={() => openEdit(post)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                                      >
                                        <Edit className="h-4 w-4" />
                                        Editar
                                      </button>
                                      {post.slug && (
                                        <a
                                          href={`/blog/${post.slug}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                                          onClick={() => setOpenMenu(null)}
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                          Ver no Site
                                        </a>
                                      )}
                                      <div className="border-t border-border my-1" />
                                      <button
                                        onClick={() => {
                                          setPostToDelete(post);
                                          setDeleteConfirmOpen(true);
                                          setOpenMenu(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Adicionar Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Nome da Categoria
                    </label>
                    <Input
                      placeholder="Ex: Notícias, Tutoriais..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Descrição (opcional)
                    </label>
                    <Input
                      placeholder="Breve descrição da categoria"
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddCategory}
                  disabled={addingCategory || !newCategoryName.trim()}
                  className="gap-2"
                >
                  {addingCategory ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Adicionar Categoria
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Categorias ({categories.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <FolderOpen className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground">
                      Nenhuma categoria criada ainda
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map((cat) => {
                      const postCount = posts.filter(
                        (p) => p.category_id === cat.id
                      ).length;
                      return (
                        <motion.div
                          key={cat.id}
                          variants={itemVariants as any}
                          whileHover={cardHover}
                        >
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">
                                {cat.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {postCount} {postCount === 1 ? "post" : "posts"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  /{cat.slug}
                                </span>
                              </div>
                              {cat.description && (
                                <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                                  {cat.description}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteCategory(cat.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingPost ? "Editar Post" : "Novo Post"}
            </DialogTitle>
            <DialogDescription>
              {editingPost
                ? "Altere os detalhes do post abaixo"
                : "Preencha os detalhes para criar um novo artigo"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Título <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Título do artigo"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <div className="flex gap-2">
                <span className="flex items-center text-sm text-muted-foreground shrink-0">
                  /blog/
                </span>
                <Input
                  placeholder="slug-do-artigo"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                        .replace(/-+/g, "-")
                        .replace(/^-|-$/g, ""),
                    }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Gerado automaticamente a partir do título. Editável.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select
                value={formData.category_id}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, category_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Resumo
                <span className="text-muted-foreground font-normal ml-2">
                  ({formData.summary.length}/200)
                </span>
              </label>
              <Textarea
                placeholder="Breve resumo do artigo (aparece na listagem)"
                value={formData.summary}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    summary: e.target.value.substring(0, 200),
                  }))
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                URL da Imagem de Destaque
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      image_url: e.target.value,
                    }))
                  }
                />
                {formData.image_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setImagePreview(!imagePreview)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <AnimatePresence>
                {imagePreview && formData.image_url && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 rounded-lg overflow-hidden border border-border">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-full max-h-48 object-cover bg-muted"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-xs text-muted-foreground">
                Cole o URL de uma imagem externa para usar como capa.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Conteúdo (HTML)</label>
              <Textarea
                placeholder="<h2>Título</h2><p>Conteúdo do artigo...</p>&#10;Cole o conteúdo HTML aqui."
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Cole o conteúdo HTML do artigo. Suporta tags HTML padrão.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                URL da Fonte (opcional)
              </label>
              <Input
                placeholder="https://fonte-original.com/artigo"
                value={formData.source_url}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    source_url: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Palavras-chave SEO
              </label>
              <Input
                placeholder="palavra1, palavra2, palavra3..."
                value={formData.seo_keywords}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    seo_keywords: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Separe as palavras-chave com vírgulas. Usadas para SEO e
                metadados.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
              <div>
                <p className="text-sm font-medium">
                  Publicar imediatamente
                </p>
                <p className="text-xs text-muted-foreground">
                  {formData.published
                    ? "O post será visível publicamente após salvar"
                    : "O post ficará como rascunho"}
                </p>
              </div>
              <Switch
                checked={formData.published}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, published: checked }))
                }
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setPostDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingPost ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {saving
                  ? "A guardar..."
                  : editingPost
                    ? "Salvar Alterações"
                    : "Criar Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Eliminar Post
            </DialogTitle>
            <DialogDescription>
              Tem a certeza que deseja eliminar{" "}
              <strong>"{postToDelete?.title}"</strong>? Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setPostToDelete(null);
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {deleting ? "A eliminar..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {openMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={() => setOpenMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
