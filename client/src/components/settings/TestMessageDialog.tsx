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
import { useMutation } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TestTube } from "lucide-react";

interface TestMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string | null;
}

export function TestMessageDialog({ open, onOpenChange, channelId }: TestMessageDialogProps) {
  const [testPhoneNumber, setTestPhoneNumber] = useState("919310797700");
  const [testMessage, setTestMessage] = useState("Hello! This is a test message from WhatsWay.");
  const { toast } = useToast();

  // Test message mutation
  const testMessageMutation = useMutation({
    mutationFn: async () => {
      if (!channelId) throw new Error("No channel selected");
      
      // Format phone number for WhatsApp API
      let formattedPhone = testPhoneNumber.replace(/\D/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }
      
      return await apiRequest("POST", `/api/whatsapp/channels/${channelId}/test`, {
        phoneNumber: formattedPhone,
        message: testMessage,
      });
    },
    onSuccess: () => {
      toast({
        title: "Test message sent",
        description: "The test message has been sent successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to send test message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendTest = () => {
    if (!testPhoneNumber || !testMessage) {
      toast({
        title: "Missing information",
        description: "Please provide both phone number and message",
        variant: "destructive",
      });
      return;
    }
    testMessageMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <TestTube className="w-5 h-5 mr-2" />
            Send Test Message
          </DialogTitle>
          <DialogDescription>
            Send a test WhatsApp message to verify your channel configuration
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="testPhone">Phone Number</Label>
            <Input
              id="testPhone"
              placeholder="919310797700"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter without + or spaces (e.g., 919310797700)
            </p>
          </div>
          
          <div>
            <Label htmlFor="testMessage">Message</Label>
            <Textarea
              id="testMessage"
              placeholder="Enter your test message..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendTest} 
            disabled={testMessageMutation.isPending}
          >
            {testMessageMutation.isPending ? "Sending..." : "Send Test Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}