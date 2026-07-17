/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, apiRequestFormData, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  FileUp,
  Plus,
  Trash2,
  RefreshCw,
  BookOpen,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  X,
  Send,
  Database,
  Brain,
  Shield,
  FileText,
  Sparkles,
  Eye,
  Save,
  Settings,
  Key,
  Cpu,
} from "lucide-react";
import { WidgetConfig, EscalationRules } from "./types";

interface AITrainingPanelProps {
  config: WidgetConfig;
  updateConfig: (key: string, value: any) => void;
  siteId: string | undefined;
  channelId: string | undefined;
}

interface TrainingSource {
  id: string;
  type: string;
  name: string;
  url?: string;
  status: string;
  errorMessage?: string;
  chunkCount: number;
  createdAt: string;
}

interface QaPair {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  createdAt: string;
}

interface TrainingPreview {
  sources: TrainingSource[];
  chunks: Array<{
    id: string;
    sourceId: string;
    contentPreview: string;
    hasEmbedding: boolean;
  }>;
  qaPairs: QaPair[];
}

export default function AITrainingPanel({
  config,
  updateConfig,
  siteId,
  channelId,
}: AITrainingPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlName, setUrlName] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newTriggerPhrase, setNewTriggerPhrase] = useState("");
  const [activeSection, setActiveSection] = useState<string>("training");
  const [testMessage, setTestMessage] = useState("");
  const [testMessages, setTestMessages] = useState<
    Array<{ role: string; text: string; context?: any }>
  >([]);
  const [isTesting, setIsTesting] = useState(false);
  const [newTriggerWord, setNewTriggerWord] = useState("");

  const [aiConfigForm, setAiConfigForm] = useState({
    provider: "openai",
    apiKey: "",
    model: "gpt-4o-mini",
    endpoint: "https://api.openai.com/v1",
    temperature: 0.7,
    maxTokens: 2048,
    words: [] as string[],
    isActive: false,
  });
  const [aiConfigId, setAiConfigId] = useState<string | null>(null);
  const [isSavingAiConfig, setIsSavingAiConfig] = useState(false);

  const { data: aiConfigData, refetch: refetchAiConfig } = useQuery({
    queryKey: ["/api/ai-settings/channel", channelId],
    queryFn: async () => {
      if (!channelId) return null;
      const res = await apiRequest("GET", `/api/ai-settings/channel/${channelId}`);
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!channelId,
  });

  useEffect(() => {
    if (aiConfigData) {
      setAiConfigId(aiConfigData.id || null);
      let parsedWords: string[] = [];
      if (Array.isArray(aiConfigData.words)) {
        parsedWords = aiConfigData.words;
      } else if (typeof aiConfigData.words === "string") {
        try { parsedWords = JSON.parse(aiConfigData.words); } catch { parsedWords = []; }
      }
      setAiConfigForm({
        provider: aiConfigData.provider || "openai",
        apiKey: aiConfigData.apiKey || "",
        model: aiConfigData.model || "gpt-4o-mini",
        endpoint: aiConfigData.endpoint || "https://api.openai.com/v1",
        temperature: parseFloat(aiConfigData.temperature) || 0.7,
        maxTokens: parseInt(aiConfigData.maxTokens) || 2048,
        words: parsedWords,
        isActive: aiConfigData.isActive ?? false,
      });
    } else if (aiConfigData === null) {
      setAiConfigId(null);
      setAiConfigForm({
        provider: "openai",
        apiKey: "",
        model: "gpt-4o-mini",
        endpoint: "https://api.openai.com/v1",
        temperature: 0.7,
        maxTokens: 2048,
        words: [],
        isActive: false,
      });
    }
  }, [aiConfigData]);

  const handleActiveToggle = async (newValue: boolean) => {
    if (!aiConfigId) {
      toast({ title: "Save configuration first", description: "Please save your AI provider configuration before enabling.", variant: "destructive" });
      return;
    }
    setAiConfigForm(prev => ({ ...prev, isActive: newValue }));
    try {
      const res = await apiRequest("PUT", `/api/ai-settings/${aiConfigId}`, { isActive: newValue });
      if (!res.ok) throw new Error("Failed to update");
      queryClient.invalidateQueries({ queryKey: ["/api/ai-settings/channel", channelId] });
      toast({ title: "Updated", description: `AI ${newValue ? "enabled" : "disabled"} successfully.` });
    } catch {
      setAiConfigForm(prev => ({ ...prev, isActive: !newValue }));
      toast({ title: "Error", description: "Failed to update AI status.", variant: "destructive" });
    }
  };

  const saveAiConfig = async () => {
    try {
      setIsSavingAiConfig(true);
      const method = aiConfigId ? "PUT" : "POST";
      const url = aiConfigId ? `/api/ai-settings/${aiConfigId}` : "/api/ai-settings";
      const res = await apiRequest(method, url, { ...aiConfigForm, channelId });
      if (!res.ok) throw new Error("Failed to save");
      const saved = await res.json();
      if (saved?.id) setAiConfigId(saved.id);
      queryClient.invalidateQueries({ queryKey: ["/api/ai-settings/channel", channelId] });
      toast({ title: "Saved", description: "AI configuration saved successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to save AI configuration.", variant: "destructive" });
    } finally {
      setIsSavingAiConfig(false);
    }
  };

  const [isSavingBehavior, setIsSavingBehavior] = useState(false);

  const saveBehaviorConfig = async () => {
    if (!siteId) return;
    try {
      setIsSavingBehavior(true);
      const siteRes = await apiRequest("GET", `/api/active-site?channelId=${channelId}`);
      const currentSite = siteRes.ok ? await siteRes.json() : null;
      const existingWidgetConfig = currentSite?.widgetConfig || {};

      const res = await apiRequest("PATCH", `/api/sites/${siteId}`, {
        widgetConfig: {
          ...existingWidgetConfig,
          systemPrompt: config.systemPrompt,
          aiTone: config.aiTone,
          aiMaxResponseLength: config.aiMaxResponseLength,
          aiFallbackMessage: config.aiFallbackMessage,
          escalationRules: config.escalationRules,
          trainFromKB: config.trainFromKB,
        },
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Saved", description: "Settings saved successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setIsSavingBehavior(false);
    }
  };

  const { data: sources = [], refetch: refetchSources } = useQuery<TrainingSource[]>({
    queryKey: ["/api/training", siteId, "sources"],
    queryFn: async () => {
      if (!siteId) return [];
      const res = await apiRequest("GET", `/api/training/${siteId}/sources`);
      return res.json();
    },
    enabled: !!siteId,
    refetchInterval: 5000,
  });

  const { data: qaPairs = [], refetch: refetchQa } = useQuery<QaPair[]>({
    queryKey: ["/api/training", siteId, "qa"],
    queryFn: async () => {
      if (!siteId) return [];
      const res = await apiRequest("GET", `/api/training/${siteId}/qa`);
      return res.json();
    },
    enabled: !!siteId,
  });

  const { data: preview } = useQuery<TrainingPreview>({
    queryKey: ["/api/training", siteId, "preview"],
    queryFn: async () => {
      if (!siteId) return { sources: [], chunks: [], qaPairs: [] };
      const res = await apiRequest("GET", `/api/training/${siteId}/preview`);
      return res.json();
    },
    enabled: !!siteId && activeSection === "preview",
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/training", siteId, "stats"],
    queryFn: async () => {
      if (!siteId) return { totalChunks: 0, totalQaPairs: 0, sources: [] };
      const res = await apiRequest("GET", `/api/training/${siteId}/stats`);
      return res.json();
    },
    enabled: !!siteId,
    refetchInterval: 10000,
  });

  const addUrlMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/training/${siteId}/url`, {
        url: urlInput,
        name: urlName || urlInput,
        channelId,
      });
      return res.json();
    },
    onSuccess: () => {
      setUrlInput("");
      setUrlName("");
      refetchSources();
      toast({ title: "URL added", description: "Website content is being processed..." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("channelId", channelId || "");
      const res = await apiRequestFormData("POST", `/api/training/${siteId}/document`, formData);
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      refetchSources();
      toast({ title: "Document uploaded", description: "Content is being processed..." });
    },
    onError: (err: any) => {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      await apiRequest("DELETE", `/api/training/source/${sourceId}`);
    },
    onSuccess: () => {
      refetchSources();
      toast({ title: "Source deleted" });
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      await apiRequest("POST", `/api/training/source/${sourceId}/reprocess`);
    },
    onSuccess: () => {
      refetchSources();
      toast({ title: "Reprocessing started" });
    },
  });

  const addQaMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/training/${siteId}/qa`, {
        question: newQuestion,
        answer: newAnswer,
        category: newCategory,
        channelId,
      });
      return res.json();
    },
    onSuccess: () => {
      setNewQuestion("");
      setNewAnswer("");
      setNewCategory("general");
      refetchQa();
      toast({ title: "Q&A pair added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteQaMutation = useMutation({
    mutationFn: async (qaId: string) => {
      await apiRequest("DELETE", `/api/training/qa/${qaId}`);
    },
    onSuccess: () => {
      refetchQa();
      toast({ title: "Q&A pair deleted" });
    },
  });

  const toggleQaMutation = useMutation({
    mutationFn: async ({ qaId, isActive }: { qaId: string; isActive: boolean }) => {
      await apiRequest("PUT", `/api/training/qa/${qaId}`, { isActive, channelId });
    },
    onSuccess: () => refetchQa(),
  });

  const syncKbMutation = useMutation({
    mutationFn: async () => {
      const kbRes = await apiRequest("GET", `/api/widget/kb/${siteId}`);
      const kbData = await kbRes.json();
      const articles = kbData?.categories?.flatMap((cat: any) =>
        (cat.articles || []).map((a: any) => ({ ...a, category: cat.name }))
      ) || [];
      const res = await apiRequest("POST", `/api/training/${siteId}/kb-sync`, {
        channelId,
        articles,
      });
      return res.json();
    },
    onSuccess: (data) => {
      refetchSources();
      toast({
        title: "Knowledge Base synced",
        description: `${data.articleCount || 0} articles synced for AI training`,
      });
    },
    onError: (err: any) => {
      toast({ title: "KB sync error", description: err.message, variant: "destructive" });
    },
  });

  const sendTestMessage = async () => {
    if (!testMessage.trim() || !siteId) return;

    const userMsg = testMessage;
    setTestMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setTestMessage("");
    setIsTesting(true);

    try {
      const res = await apiRequest("POST", `/api/training/${siteId}/test-chat`, {
        message: userMsg,
        channelId,
        widgetConfig: config,
      });
      const data = await res.json();

      if (!res.ok) {
        setTestMessages((prev) => [
          ...prev,
          { role: "error", text: data.error || "Failed to get response" },
        ]);
      } else {
        setTestMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: data.response,
            context: data.contextUsed,
          },
        ]);
      }
    } catch (err: any) {
      setTestMessages((prev) => [
        ...prev,
        { role: "error", text: err.message },
      ]);
    } finally {
      setIsTesting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocMutation.mutate(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const escalation = config.escalationRules || {
    enabled: true,
    maxAttempts: 3,
    triggerPhrases: [],
    escalationMessage: "",
  };

  const updateEscalation = (key: keyof EscalationRules, value: any) => {
    updateConfig("escalationRules", { ...escalation, [key]: value });
  };

  if (!siteId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Save your widget configuration first</p>
          <p className="text-sm mt-1">AI training requires a saved site configuration to work.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "training", icon: Brain, label: "Training Data" },
          { key: "qa", icon: MessageSquare, label: "Q&A Pairs" },
          { key: "behavior", icon: Shield, label: "AI Behavior" },
          { key: "escalation", icon: AlertTriangle, label: "Escalation" },
          { key: "test", icon: Sparkles, label: "Test Chat" },
          { key: "preview", icon: Eye, label: "Data Preview" },
        ].map(({ key, icon: Icon, label }) => (
          <Button
            key={key}
            variant={activeSection === key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(key)}
          >
            <Icon className="h-4 w-4 mr-1" />
            {label}
          </Button>
        ))}
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.sources?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Sources</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.totalChunks || 0}</p>
            <p className="text-xs text-muted-foreground">Chunks</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.totalQaPairs || 0}</p>
            <p className="text-xs text-muted-foreground">Q&A Pairs</p>
          </div>
        </div>
      )}

      {activeSection === "training" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Knowledge Base Integration
              </CardTitle>
              <CardDescription>
                Sync your knowledge base articles as AI training data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Train from Knowledge Base</Label>
                  <p className="text-xs text-muted-foreground">
                    Use KB articles to answer customer questions
                  </p>
                </div>
                <Switch
                  checked={config.trainFromKB}
                  onCheckedChange={(checked) => updateConfig("trainFromKB", checked)}
                />
              </div>
              {config.trainFromKB && (
                <Button
                  onClick={() => syncKbMutation.mutate()}
                  disabled={syncKbMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {syncKbMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Knowledge Base Articles
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website URL Training
              </CardTitle>
              <CardDescription>
                Add website URLs to scrape and train the AI from
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Input
                  placeholder="https://example.com/about"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <Input
                  placeholder="Source name (optional)"
                  value={urlName}
                  onChange={(e) => setUrlName(e.target.value)}
                />
                <Button
                  onClick={() => addUrlMutation.mutate()}
                  disabled={!urlInput.trim() || addUrlMutation.isPending}
                  className="w-full"
                  size="sm"
                >
                  {addUrlMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add URL
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                Document Upload
              </CardTitle>
              <CardDescription>
                Upload PDF, TXT, CSV, DOCX, or Markdown files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.txt,.csv,.md,.docx"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadDocMutation.isPending}
              >
                {uploadDocMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileUp className="h-4 w-4 mr-2" />
                )}
                Upload Document
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Max 10MB. Supported: PDF, TXT, CSV, DOCX, MD
              </p>
            </CardContent>
          </Card>

          {sources.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Training Sources ({sources.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(source.status)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{source.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {source.type}
                            </Badge>
                            {source.chunkCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {source.chunkCount} chunks
                              </span>
                            )}
                            {source.errorMessage && (
                              <span className="text-xs text-red-500 truncate max-w-[150px]">
                                {source.errorMessage}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {source.status === "error" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => reprocessMutation.mutate(source.id)}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500"
                          onClick={() => deleteSourceMutation.mutate(source.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeSection === "qa" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Q&A Pair</CardTitle>
              <CardDescription>
                Add custom question-answer pairs for the AI to learn from
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Question</Label>
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="What are your business hours?"
                />
              </div>
              <div className="space-y-2">
                <Label>Answer</Label>
                <Textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="We are open Monday-Friday, 9 AM to 6 PM EST."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="pricing">Pricing</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="returns">Returns</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => addQaMutation.mutate()}
                disabled={!newQuestion.trim() || !newAnswer.trim() || addQaMutation.isPending}
                className="w-full"
              >
                {addQaMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Q&A Pair
              </Button>
            </CardContent>
          </Card>

          {qaPairs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Existing Q&A Pairs ({qaPairs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3">
                    {qaPairs.map((qa) => (
                      <div
                        key={qa.id}
                        className={`p-3 border rounded-lg space-y-2 ${
                          !qa.isActive ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {qa.category}
                              </Badge>
                              {!qa.isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium">Q: {qa.question}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              A: {qa.answer}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Switch
                              checked={qa.isActive}
                              onCheckedChange={(checked) =>
                                toggleQaMutation.mutate({ qaId: qa.id, isActive: checked })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500"
                              onClick={() => deleteQaMutation.mutate(qa.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeSection === "behavior" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  AI Provider Configuration
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Active</Label>
                  <Switch
                    checked={aiConfigForm.isActive}
                    onCheckedChange={handleActiveToggle}
                  />
                </div>
              </div>
              <CardDescription>
                Configure your AI model provider, credentials, and trigger words
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" /> Provider</Label>
                  <Select
                    value={aiConfigForm.provider}
                    onValueChange={(v) => setAiConfigForm(prev => ({ ...prev, provider: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Key className="h-3.5 w-3.5" /> API Key</Label>
                  <Input
                    type="password"
                    value={aiConfigForm.apiKey}
                    onChange={(e) => setAiConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="sk-..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" /> Model</Label>
                  <Select
                    value={aiConfigForm.model}
                    onValueChange={(v) => setAiConfigForm(prev => ({ ...prev, model: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                      <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
                      <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="o3-mini">o3-mini</SelectItem>
                      <SelectItem value="o1">o1</SelectItem>
                      <SelectItem value="o1-mini">o1-mini</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> Temperature</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={aiConfigForm.temperature}
                    onChange={(e) => setAiConfigForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Max Tokens</Label>
                  <Input
                    type="number"
                    value={aiConfigForm.maxTokens}
                    onChange={(e) => setAiConfigForm(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 2048 }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Trigger Words
                </Label>
                <p className="text-xs text-muted-foreground">
                  AI will only respond when a message contains one of these words (applies to both widget chat and team inbox)
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., hello, help, pricing"
                    value={newTriggerWord}
                    onChange={(e) => setNewTriggerWord(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTriggerWord.trim()) {
                        e.preventDefault();
                        setAiConfigForm(prev => ({
                          ...prev,
                          words: [...prev.words, newTriggerWord.trim()],
                        }));
                        setNewTriggerWord("");
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      if (newTriggerWord.trim()) {
                        setAiConfigForm(prev => ({
                          ...prev,
                          words: [...prev.words, newTriggerWord.trim()],
                        }));
                        setNewTriggerWord("");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {aiConfigForm.words.map((word, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {word}
                      <button
                        className="ml-1"
                        onClick={() =>
                          setAiConfigForm(prev => ({
                            ...prev,
                            words: prev.words.filter((_, idx) => idx !== i),
                          }))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {aiConfigForm.words.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No trigger words defined — AI will respond to all messages</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">System Prompt</CardTitle>
              <CardDescription>
                Define how the AI should behave and respond to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={config.systemPrompt}
                onChange={(e) => updateConfig("systemPrompt", e.target.value)}
                rows={6}
                placeholder="You are a helpful customer support assistant..."
              />
              <p className="text-xs text-muted-foreground">
                {config.systemPrompt?.length || 0} / 4000 characters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Response Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Response Tone</Label>
                <Select
                  value={config.aiTone}
                  onValueChange={(value) => updateConfig("aiTone", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Max Response Length</Label>
                <Select
                  value={config.aiMaxResponseLength?.toString()}
                  onValueChange={(value) =>
                    updateConfig("aiMaxResponseLength", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">Short (~100 words)</SelectItem>
                    <SelectItem value="200">Medium (~200 words)</SelectItem>
                    <SelectItem value="300">Long (~300 words)</SelectItem>
                    <SelectItem value="500">Very Long (~500 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fallback Message</Label>
                <Textarea
                  value={config.aiFallbackMessage}
                  onChange={(e) => updateConfig("aiFallbackMessage", e.target.value)}
                  rows={2}
                  placeholder="I'm sorry, I don't have the information you're looking for."
                />
                <p className="text-xs text-muted-foreground">
                  Shown when the AI cannot generate a response
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={async () => {
                await Promise.all([saveAiConfig(), saveBehaviorConfig()]);
              }}
              disabled={isSavingAiConfig || isSavingBehavior}
            >
              {(isSavingAiConfig || isSavingBehavior) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {(isSavingAiConfig || isSavingBehavior) ? "Saving..." : "Save AI Settings"}
            </Button>
          </div>
        </div>
      )}

      {activeSection === "escalation" && (
        <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Escalation Rules
            </CardTitle>
            <CardDescription>
              Configure when the AI should transfer conversations to human agents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Auto-Escalation</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically transfer to an agent when AI can't help
                </p>
              </div>
              <Switch
                checked={escalation.enabled}
                onCheckedChange={(checked) => updateEscalation("enabled", checked)}
              />
            </div>

            {escalation.enabled && (
              <>
                <Separator />

                <div className="space-y-2">
                  <Label>Max Unanswered Attempts</Label>
                  <Select
                    value={escalation.maxAttempts?.toString() || "3"}
                    onValueChange={(value) =>
                      updateEscalation("maxAttempts", parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">After 1 failed attempt</SelectItem>
                      <SelectItem value="2">After 2 failed attempts</SelectItem>
                      <SelectItem value="3">After 3 failed attempts</SelectItem>
                      <SelectItem value="5">After 5 failed attempts</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Transfer to agent after this many questions the AI couldn't answer
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Trigger Phrases</Label>
                  <p className="text-xs text-muted-foreground">
                    Immediately escalate when user mentions these phrases
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., speak to manager"
                      value={newTriggerPhrase}
                      onChange={(e) => setNewTriggerPhrase(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTriggerPhrase.trim()) {
                          updateEscalation("triggerPhrases", [
                            ...(escalation.triggerPhrases || []),
                            newTriggerPhrase.trim(),
                          ]);
                          setNewTriggerPhrase("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (newTriggerPhrase.trim()) {
                          updateEscalation("triggerPhrases", [
                            ...(escalation.triggerPhrases || []),
                            newTriggerPhrase.trim(),
                          ]);
                          setNewTriggerPhrase("");
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(escalation.triggerPhrases || []).map((phrase, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {phrase}
                        <button
                          className="ml-1"
                          onClick={() =>
                            updateEscalation(
                              "triggerPhrases",
                              escalation.triggerPhrases.filter((_, idx) => idx !== i)
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Escalation Message</Label>
                  <Textarea
                    value={escalation.escalationMessage || ""}
                    onChange={(e) =>
                      updateEscalation("escalationMessage", e.target.value)
                    }
                    rows={2}
                    placeholder="Let me connect you with a team member who can help you better."
                  />
                  <p className="text-xs text-muted-foreground">
                    Message shown to user when transferring to an agent
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <div className="flex justify-end mt-4">
          <Button
            onClick={saveBehaviorConfig}
            disabled={isSavingBehavior}
          >
            {isSavingBehavior ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSavingBehavior ? "Saving..." : "Save Escalation Rules"}
          </Button>
        </div>
        </div>
      )}

      {activeSection === "test" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Test AI Chat
            </CardTitle>
            <CardDescription>
              Test how your AI responds using current training data and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <ScrollArea className="h-[350px] p-3">
                {testMessages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                    <div>
                      <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Send a message to test the AI</p>
                      <p className="text-xs mt-1">
                        Uses your actual training data and system prompt
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {testMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : msg.role === "error"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        {msg.context && (
                          <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-70">
                            Context: {msg.context.chunksFound} chunks, {msg.context.qaPairsFound} Q&A pairs used
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTesting && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-xl px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="border-t p-2 flex gap-2">
                <Input
                  placeholder="Type a test message..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendTestMessage()}
                  disabled={isTesting}
                />
                <Button
                  size="icon"
                  onClick={sendTestMessage}
                  disabled={!testMessage.trim() || isTesting}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {testMessages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setTestMessages([])}
              >
                Clear Chat
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === "preview" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Training Data Overview
              </CardTitle>
              <CardDescription>
                All indexed content the AI uses to answer questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!preview || (preview.sources.length === 0 && preview.qaPairs.length === 0) ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No training data yet</p>
                  <p className="text-xs mt-1">
                    Add URLs, documents, or Q&A pairs to train your AI
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {preview.sources.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Sources ({preview.sources.length})
                      </h4>
                      <div className="space-y-2">
                        {preview.sources.map((source) => (
                          <div
                            key={source.id}
                            className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
                          >
                            {getStatusIcon(source.status)}
                            <span className="font-medium">{source.name}</span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {source.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {source.chunkCount} chunks
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {preview.chunks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Content Chunks ({preview.chunks.length})
                      </h4>
                      <ScrollArea className="max-h-[250px]">
                        <div className="space-y-2">
                          {preview.chunks.slice(0, 20).map((chunk) => (
                            <div
                              key={chunk.id}
                              className="p-2 border rounded text-xs"
                            >
                              <div className="flex items-center gap-1 mb-1">
                                {chunk.hasEmbedding ? (
                                  <Badge className="text-[10px] bg-green-100 text-green-700">
                                    Embedded
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">
                                    Text Only
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground">
                                {chunk.contentPreview}
                              </p>
                            </div>
                          ))}
                          {preview.chunks.length > 20 && (
                            <p className="text-xs text-center text-muted-foreground py-2">
                              + {preview.chunks.length - 20} more chunks
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {preview.qaPairs.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Q&A Pairs ({preview.qaPairs.length})
                      </h4>
                      <div className="space-y-2">
                        {preview.qaPairs.map((qa: any) => (
                          <div key={qa.id} className="p-2 border rounded text-sm">
                            <p className="font-medium">Q: {qa.question}</p>
                            <p className="text-muted-foreground text-xs mt-1">
                              A: {qa.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
