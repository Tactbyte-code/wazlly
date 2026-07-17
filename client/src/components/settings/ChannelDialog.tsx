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

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Channel } from "@shared/schema";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const channelFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(10, "Valid phone number required"),
  phoneNumberId: z.string().min(1, "Phone Number ID is required"),
  wabaId: z.string().min(1, "Business Account ID is required"),
  appId: z.string().min(1, "App ID is required"),
  accessToken: z.string().min(1, "Access Token is required"),
  businessAccountId: z.string().optional(),
  mmLiteEnabled: z.boolean().default(false),
  mmLiteApiUrl: z.string().optional(),
  mmLiteApiKey: z.string().optional(),
});

interface ChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingChannel: Channel | null;
  onSuccess: () => void;
}

export function ChannelDialog({ open, onOpenChange, editingChannel, onSuccess }: ChannelDialogProps) {
  const { toast } = useToast();
const {user} = useAuth()
  const channelForm = useForm<z.infer<typeof channelFormSchema>>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      phoneNumberId: "",
      wabaId: "",
      appId: "", 
      accessToken: "",
      businessAccountId: "",
      mmLiteEnabled: false,
      mmLiteApiUrl: "",
      mmLiteApiKey: "",
    },
  });

  useEffect(() => {
    if (editingChannel) {
      channelForm.reset({
        name: editingChannel.name,
        phoneNumber: editingChannel.phoneNumber || "",
        phoneNumberId: editingChannel.phoneNumberId,
        wabaId: editingChannel.whatsappBusinessAccountId || "",
        appId: editingChannel.appId || "", 
        accessToken: editingChannel.accessToken,
        businessAccountId: "",
        mmLiteEnabled: editingChannel.mmLiteEnabled || false,
        mmLiteApiUrl: editingChannel.mmLiteApiUrl || "",
        mmLiteApiKey: editingChannel.mmLiteApiKey || "",
      });
    } else {
      channelForm.reset();
    }
  }, [editingChannel, channelForm]);

  // Create/Update channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (data: z.infer<typeof channelFormSchema>) => {
      const payload = {
        name: data.name,
        phoneNumber: data.phoneNumber,
        phoneNumberId: data.phoneNumberId,
        whatsappBusinessAccountId: data.wabaId,
        appId: data.appId,
        businessAccountId: data.businessAccountId,
        accessToken: data.accessToken,
        mmLiteEnabled: data.mmLiteEnabled,
        mmLiteApiUrl: data.mmLiteApiUrl,
        mmLiteApiKey: data.mmLiteApiKey,
      };
      
      if (editingChannel) {
        return await apiRequest("PUT", `/api/channels/${editingChannel.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/channels", payload);
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      
      // Check if the channel creation included health check results
      if (!editingChannel && data.healthStatus) {
        if (data.healthStatus === 'healthy') {
          toast({
            title: "Channel created successfully",
            description: "Your channel is connected and healthy!",
          });
        } else if (data.healthStatus === 'error') {
          toast({
            title: "Channel created with issues",
            description: data.healthDetails?.error || "Channel was created but has connection issues. Please check your credentials.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: editingChannel ? "Channel updated" : "Channel created",
          description: editingChannel ? "Your channel has been updated successfully." : "Your new channel has been added successfully.",
        });
      }      
      onSuccess();
    },
    onError: (error) => {
      let errorData = error?.response?.data;
    
      // If response.data is missing, try to extract JSON from error.message
      if (!errorData && typeof error?.message === "string") {
        try {
          const match = error.message.match(/\{.*\}/); // find JSON inside the message
          if (match) {
            errorData = JSON.parse(match[0]);
          }
        } catch (e) {
          console.error("Failed to parse error JSON:", e);
        }
      }
    
      console.log("Channel mutation error:", errorData, error);
    
      toast({
        title: "Error",
        description:
          errorData?.error ||
          errorData?.message ||
          error?.message ||
          "Something went wrong while saving the channel.",
        variant: "destructive",
      });
    }
    
    
  });

  const handleChannelSubmit = (data: z.infer<typeof channelFormSchema>) => {
    createChannelMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingChannel ? "Edit" : "Add New"} WhatsApp Channel</DialogTitle>
          <DialogDescription>
            Configure your WhatsApp Business API credentials and settings.
          </DialogDescription>
        </DialogHeader>
        <Form {...channelForm}>
          <form onSubmit={channelForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
            <FormField
              control={channelForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Business" {...field} />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this channel
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={channelForm.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormDescription>
                    The WhatsApp Business phone number
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
  control={channelForm.control}
  name="appId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Meta App ID</FormLabel>
      <FormControl>
        <Input placeholder="123456789012345" {...field} />
      </FormControl>
      <FormDescription>
        Your Meta (Facebook) App ID
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>

            
            <FormField
              control={channelForm.control}
              name="phoneNumberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number ID</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012345" {...field} />
                  </FormControl>
                  <FormDescription>
                    Found in Meta Business Suite under WhatsApp settings
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={channelForm.control}
              name="wabaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Business Account ID</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012345" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your WhatsApp Business Account ID from Meta
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={channelForm.control}
              name="accessToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Token</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Your access token" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your permanent access token from Meta
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={channelForm.control}
              name="businessAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Account ID (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012345" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your Meta Business Account ID (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={user?.username === 'demouser'? true :createChannelMutation.isPending}>
                {createChannelMutation.isPending ? "Saving..." : editingChannel ? "Update" : "Create"} Channel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}