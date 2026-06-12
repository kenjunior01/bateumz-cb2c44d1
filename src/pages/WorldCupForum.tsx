import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Heart, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ForumTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  created_by: string;
  pinned: boolean;
  locked: boolean;
  posts_count: number;
  created_at: string;
}

interface ForumPost {
  id: string;
  topic_id: string;
  user_id: string;
  content: string;
  likes: number;
  created_at: string;
}

const CATEGORIES = [
  { value: "general", label: "Geral", emoji: "💬" },
  { value: "match_discussion", label: "Discussão de Jogos", emoji: "⚽" },
  { value: "player_analysis", label: "Análise de Jogadores", emoji: "👤" },
  { value: "team_strategy", label: "Estratégia de Times", emoji: "🎯" },
  { value: "off_topic", label: "Off-Topic", emoji: "🎉" },
];

export default function WorldCupForum() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDescription, setNewTopicDescription] = useState("");
  const [newTopicCategory, setNewTopicCategory] = useState("general");
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("general");

  useEffect(() => {
    loadTopics();
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedTopic) {
      loadPosts(selectedTopic.id);
    }
  }, [selectedTopic]);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("forum_topics")
        .select(`
          id,
          title,
          description,
          category,
          created_by,
          pinned,
          locked,
          created_at,
          forum_posts(id)
        `)
        .eq("category", selectedCategory)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const topicsWithCount = (data || []).map((t: any) => ({
        ...t,
        posts_count: t.forum_posts?.length || 0,
      }));

      setTopics(topicsWithCount);
      if (topicsWithCount.length > 0 && !selectedTopic) {
        setSelectedTopic(topicsWithCount[0]);
      }
    } catch (error) {
      console.error("Error loading topics:", error);
      toast.error("Erro ao carregar tópicos");
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (topicId: string) => {
    try {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("*")
        .eq("topic_id", topicId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast.error("Erro ao carregar posts");
    }
  };

  const createTopic = async () => {
    if (!user || !newTopicTitle.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("forum_topics")
        .insert({
          title: newTopicTitle,
          description: newTopicDescription,
          category: newTopicCategory,
          created_by: user.id,
          region_id: "default-region-id",
        })
        .select()
        .single();

      if (error) throw error;

      setTopics([{ ...data, posts_count: 0 }, ...topics]);
      setNewTopicTitle("");
      setNewTopicDescription("");
      setNewTopicCategory("general");
      toast.success("Tópico criado com sucesso!");
    } catch (error) {
      console.error("Error creating topic:", error);
      toast.error("Erro ao criar tópico");
    } finally {
      setSaving(false);
    }
  };

  const addPost = async () => {
    if (!user || !selectedTopic || !newPostContent.trim()) {
      toast.error("Conteúdo do post é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("forum_posts")
        .insert({
          topic_id: selectedTopic.id,
          user_id: user.id,
          content: newPostContent,
        })
        .select()
        .single();

      if (error) throw error;

      setPosts([...posts, data]);
      setNewPostContent("");
      toast.success("Post adicionado!");
    } catch (error) {
      console.error("Error adding post:", error);
      toast.error("Erro ao adicionar post");
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("forum_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      setPosts(posts.filter((p) => p.id !== postId));
      toast.success("Post removido");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Erro ao remover post");
    }
  };

  const likePost = async (postId: string) => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const { error } = await supabase
        .from("forum_posts")
        .update({ likes: post.likes + 1 })
        .eq("id", postId);

      if (error) throw error;

      setPosts(
        posts.map((p) =>
          p.id === postId ? { ...p, likes: p.likes + 1 } : p
        )
      );
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl font-bold">Fórum do Mundial</h1>
          </div>
          <p className="text-muted-foreground">
            Discute estratégias, analisa jogadores e compartilha opiniões sobre o torneio
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Categorias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? "default" : "ghost"}
                    onClick={() => setSelectedCategory(cat.value)}
                    className="w-full justify-start"
                  >
                    <span className="mr-2">{cat.emoji}</span>
                    {cat.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tópicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {topics.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum tópico nesta categoria
                  </p>
                ) : (
                  topics.map((topic) => (
                    <Button
                      key={topic.id}
                      variant={selectedTopic?.id === topic.id ? "default" : "ghost"}
                      onClick={() => setSelectedTopic(topic)}
                      className="w-full justify-start text-left h-auto py-2"
                    >
                      <div className="truncate">
                        {topic.pinned && <span className="mr-1">📌</span>}
                        <span className="text-xs">{topic.title}</span>
                      </div>
                    </Button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Plus className="h-4 w-4" />
                  Novo Tópico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input
                    placeholder="Qual é o teu tópico?"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Textarea
                    placeholder="Descreve o tópico..."
                    value={newTopicDescription}
                    onChange={(e) => setNewTopicDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <select
                    value={newTopicCategory}
                    onChange={(e) => setNewTopicCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={createTopic} disabled={saving} className="w-full">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Criar Tópico
                </Button>
              </CardContent>
            </Card>

            {selectedTopic && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedTopic.title}</CardTitle>
                        {selectedTopic.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {selectedTopic.description}
                          </p>
                        )}
                      </div>
                      {selectedTopic.pinned && (
                        <Badge variant="outline">📌 Fixado</Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {posts.length} {posts.length === 1 ? "Resposta" : "Respostas"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {posts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nenhuma resposta ainda. Sê o primeiro a responder!
                      </p>
                    ) : (
                      posts.map((post) => (
                        <div
                          key={post.id}
                          className="border-l-4 border-primary pl-4 py-2"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-xs text-muted-foreground">
                              Utilizador • {new Date(post.created_at).toLocaleDateString("pt-BR")}
                            </p>
                            {user.id === post.user_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deletePost(post.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm mb-3">{post.content}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => likePost(post.id)}
                            className="text-xs"
                          >
                            <Heart className="h-3 w-3 mr-1" />
                            {post.likes}
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {!selectedTopic.locked && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Tua Resposta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder="Escreve a tua resposta..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        rows={4}
                      />
                      <Button onClick={addPost} disabled={saving} className="w-full">
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <MessageSquare className="h-4 w-4 mr-2" />
                        )}
                        Enviar Resposta
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
