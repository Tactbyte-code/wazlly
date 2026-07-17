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

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Camera, Save, Loader2, Building2, Globe, Mail, MapPin, FileText, AlertTriangle, User } from "lucide-react";
import { apiRequest, apiRequestFormData } from "@/lib/queryClient";

const BUSINESS_VERTICALS = [
  { value: "AUTOMOTIVE", label: "Automotive" },
  { value: "BEAUTY", label: "Beauty, Spa and Salon" },
  { value: "CLOTHING", label: "Clothing and Apparel" },
  { value: "EDU", label: "Education" },
  { value: "ENTERTAIN", label: "Entertainment" },
  { value: "EVENT_PLAN", label: "Event Planning" },
  { value: "FINANCE", label: "Finance and Banking" },
  { value: "GROCERY", label: "Grocery and Supermarket" },
  { value: "GOVT", label: "Government" },
  { value: "HOTEL", label: "Hotel and Lodging" },
  { value: "HEALTH", label: "Health and Medical" },
  { value: "NONPROFIT", label: "Non-profit" },
  { value: "PROF_SERVICES", label: "Professional Services" },
  { value: "RETAIL", label: "Retail" },
  { value: "TRAVEL", label: "Travel and Transportation" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "NOT_A_BIZ", label: "Not a Business" },
  { value: "OTHER", label: "Other" },
];

interface BusinessProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string | null;
  channelName?: string;
  verifiedName?: string;
  onOpenDisplayName?: () => void;
}

export function BusinessProfileEditor({ open, onOpenChange, channelId, channelName, verifiedName, onOpenDisplayName }: BusinessProfileEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    about: "",
    address: "",
    description: "",
    email: "",
    websites: [] as string[],
    vertical: "",
  });
  const [websiteInput, setWebsiteInput] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: [`/api/channels/${channelId}/profile`],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/profile`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!channelId && open,
  });

  const { data: displayNameData } = useQuery({
    queryKey: ["/api/channels", channelId, "display-name"],
    queryFn: async () => {
      if (!channelId) return null;
      const res = await apiRequest("GET", `/api/channels/${channelId}/display-name`);
      return await res.json();
    },
    enabled: !!channelId && open,
    refetchOnWindowFocus: false,
  });

  const currentVerifiedName = displayNameData?.verified_name || verifiedName;

  useEffect(() => {
    if (profile) {
      setFormData({
        about: profile.about || "",
        address: profile.address || "",
        description: profile.description || "",
        email: profile.email || "",
        websites: profile.websites || [],
        vertical: profile.vertical || "",
      });
      if (profile.profile_picture_url) {
        setPhotoPreview(profile.profile_picture_url);
      }
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/channels/${channelId}/profile`, data);
      return res.json();
    },
    onSuccess: () => {
      setPermissionError(false);
      toast({ title: "Profile updated", description: "Your WhatsApp Business Profile has been updated." });
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${channelId}/profile`] });
    },
    onError: (err: any) => {
      const msg = err.message || "Failed to update profile";
      if (msg.toLowerCase().includes('permission') || msg.includes('whatsapp_business_management')) {
        setPermissionError(true);
      }
      toast({ title: "Update failed", description: msg, variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (file: File) => {
    if (!channelId) return;

    setUploadingPhoto(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("photo", file);

      const res = await apiRequestFormData("POST", `/api/channels/${channelId}/profile/photo`, formDataObj);

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setPhotoPreview(URL.createObjectURL(file));
      setPermissionError(false);
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${channelId}/profile`] });
      toast({ title: "Photo uploaded", description: "Your profile photo has been updated." });
    } catch (err: any) {
      const msg = err.message || "Upload failed";
      if (msg.toLowerCase().includes('permission') || msg.includes('whatsapp_business_management')) {
        setPermissionError(true);
      }
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = () => {
    const data: any = {};
    if (formData.about.trim()) data.about = formData.about.trim();
    if (formData.description.trim()) data.description = formData.description.trim();
    if (formData.address.trim()) data.address = formData.address.trim();
    if (formData.email.trim()) data.email = formData.email.trim();
    if (formData.vertical) data.vertical = formData.vertical;
    const validWebsites = formData.websites.filter(w => w.trim());
    if (validWebsites.length > 0) data.websites = validWebsites;

    if (Object.keys(data).length === 0) {
      toast({ title: "Nothing to save", description: "Please fill in at least one field.", variant: "destructive" });
      return;
    }
    updateMutation.mutate(data);
  };

  const addWebsite = () => {
    const url = websiteInput.trim();
    if (url && formData.websites.length < 2) {
      setFormData(prev => ({ ...prev, websites: [...prev.websites, url] }));
      setWebsiteInput("");
    }
  };

  const removeWebsite = (index: number) => {
    setFormData(prev => ({ ...prev, websites: prev.websites.filter((_, i) => i !== index) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-600" />
            Business Profile
          </DialogTitle>
          <DialogDescription>
            Edit the WhatsApp Business Profile for {channelName || "this channel"}
          </DialogDescription>
        </DialogHeader>

        {permissionError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700 space-y-1">
                <p className="font-medium">Permission Required</p>
                <p>Your access token is missing the <strong>whatsapp_business_management</strong> permission needed to update the Business Profile.</p>
                <p>To fix this: Go to your Meta Business Manager → System Users → Generate a new token with both <strong>whatsapp_business_messaging</strong> and <strong>whatsapp_business_management</strong> permissions, then update the channel's access token.</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <User className="w-3.5 h-3.5" />
                Display Name
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={currentVerifiedName || "Not available"}
                  readOnly
                  className="bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                {onOpenDisplayName && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenDisplayName();
                    }}
                  >
                    Change
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                To change your display name, click <strong>Change</strong> to submit a request for Meta review.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                />
              </div>
              <div className="text-sm text-gray-500">
                <p className="font-medium text-gray-700">Profile Photo</p>
                <p>JPEG or PNG, max 5MB</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="about" className="flex items-center gap-1.5 text-sm">
                <FileText className="w-3.5 h-3.5" />
                About
              </Label>
              <Input
                id="about"
                value={formData.about}
                onChange={(e) => setFormData(prev => ({ ...prev, about: e.target.value }))}
                placeholder="Brief description of your business"
                maxLength={139}
              />
              <p className="text-xs text-gray-400">{formData.about.length}/139 characters</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="flex items-center gap-1.5 text-sm">
                <FileText className="w-3.5 h-3.5" />
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of your business"
                maxLength={512}
                rows={3}
              />
              <p className="text-xs text-gray-400">{formData.description.length}/512 characters</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="flex items-center gap-1.5 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Your business address"
                maxLength={256}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-sm">
                <Mail className="w-3.5 h-3.5" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contact@yourbusiness.com"
                maxLength={128}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Globe className="w-3.5 h-3.5" />
                Websites (max 2)
              </Label>
              {formData.websites.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={url} readOnly className="flex-1 text-sm bg-gray-50" />
                  <Button variant="ghost" size="sm" onClick={() => removeWebsite(index)} className="text-red-500 hover:text-red-700 px-2">
                    Remove
                  </Button>
                </div>
              ))}
              {formData.websites.length < 2 && (
                <div className="flex items-center gap-2">
                  <Input
                    value={websiteInput}
                    onChange={(e) => setWebsiteInput(e.target.value)}
                    placeholder="https://yourbusiness.com"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addWebsite();
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={addWebsite} disabled={!websiteInput.trim()}>
                    Add
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vertical" className="flex items-center gap-1.5 text-sm">
                <Building2 className="w-3.5 h-3.5" />
                Industry
              </Label>
              <Select value={formData.vertical} onValueChange={(val) => setFormData(prev => ({ ...prev, vertical: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_VERTICALS.map(v => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
