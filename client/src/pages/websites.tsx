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

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Globe, Settings, Trash2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Site } from "@shared/schema";

export default function Websites() {
  const { toast } = useToast();
  const [newSite, setNewSite] = useState({ name: "", domain: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const tenantId = user.tenantId;

  // Fetch sites from API
  const { data: sites = [], isLoading, error } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
    enabled: !!tenantId,
  });

  // Create site mutation
  const createSiteMutation = useMutation({
    mutationFn: async (data: { name: string; domain: string; tenantId: string }) => {
      const response = await apiRequest("POST", "/api/sites", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      setNewSite({ name: "", domain: "" });
      setIsDialogOpen(false);
      toast({
        title: "Website added",
        description: "Website has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add website",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update site mutation
  const updateSiteMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await apiRequest("PATCH", `/api/sites/${id}`, { enabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
    },
  });

  const handleAddWebsite = () => {
    if (!newSite.name || !newSite.domain) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!tenantId) {
      toast({
        title: "Error",
        description: "No tenant ID found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    createSiteMutation.mutate({
      name: newSite.name,
      domain: newSite.domain,
      tenantId,
    });
  };

  const handleToggleWebsite = (id: string, enabled: boolean) => {
    updateSiteMutation.mutate({ id, enabled: !enabled });
  };

  const copyWidgetCode = (siteId: string, domain: string) => {
    const widgetDomain = domain.startsWith('http') ? domain : `https://${domain}`;
    const code = `<!-- AI Chat Widget -->
<script>
  window.aiChatConfig = { siteId: "${siteId}" };
</script>
<script src="${widgetDomain}/widget/widget.js" async></script>`;
    navigator.clipboard.writeText(code);
    toast({
      title: "Code copied",
      description: "Widget installation code copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-destructive mb-4">Failed to load websites</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/sites"] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Websites</h1>
          <p className="text-muted-foreground mt-2">Manage your websites and widget installations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-website">
              <Plus className="h-4 w-4 mr-2" />
              Add Website
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Website</DialogTitle>
              <DialogDescription>
                Add a website to enable AI chat widget integration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Website Name</Label>
                <Input
                  id="name"
                  placeholder="My Website"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  data-testid="input-website-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="example.com"
                  value={newSite.domain}
                  onChange={(e) => setNewSite({ ...newSite, domain: e.target.value })}
                  data-testid="input-website-domain"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAddWebsite}
                disabled={createSiteMutation.isPending}
                data-testid="button-create-website"
              >
                {createSiteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Website"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No websites yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Get started by adding your first website</p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-website">
              <Plus className="h-4 w-4 mr-2" />
              Add Website
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sites.map((site) => (
            <Card key={site.id} data-testid={`card-website-${site.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      {site.name}
                    </CardTitle>
                    <CardDescription className="mt-2">{site.domain}</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`toggle-${site.id}`} className="text-sm text-muted-foreground">
                        {site.enabled ? "Enabled" : "Disabled"}
                      </Label>
                      <Switch
                        id={`toggle-${site.id}`}
                        checked={site.enabled}
                        onCheckedChange={() => handleToggleWebsite(site.id, site.enabled)}
                        data-testid={`switch-website-${site.id}`}
                      />
                    </div>
                    {site.enabled && (
                      <Badge variant="default" data-testid={`badge-status-${site.id}`}>Active</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex-1">
                    <p className="text-muted-foreground mb-1">Widget Installation Code</p>
                    <pre className="block bg-muted px-3 py-2 rounded-md text-xs overflow-x-auto">
{`<!-- AI Chat Widget -->
<script>
  window.aiChatConfig = { siteId: "${site.id}" };
</script>
<script src="${site.domain.startsWith('http') ? site.domain : `https://${site.domain}`}/widget/widget.js" async></script>`}
                    </pre>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyWidgetCode(site.id, site.domain)}
                    data-testid={`button-copy-code-${site.id}`}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://${site.domain}`, "_blank")}
                    data-testid={`button-visit-${site.id}`}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Site
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
