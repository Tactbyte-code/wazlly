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
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, FileSpreadsheet, Code } from "lucide-react";
import { CreateCampaignForm } from "./CreateCampaignForm";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: any[];
  contacts: any[];
  contactsTotal?: number;
  groups: any[];
  selectedGroup?: string;
  onSelectedGroupChange?: (group: string) => void;
  onCreateCampaign: (campaignData: any) => void;
  isCreating: boolean;
  messagingLimit?: number | null;
  messagingTier?: string;
}

export function CreateCampaignDialog({
  open,
  onOpenChange,
  templates,
  contacts,
  contactsTotal,
  groups,
  selectedGroup: selectedGroupProp,
  onSelectedGroupChange,
  onCreateCampaign,
  isCreating,
  messagingLimit,
  messagingTier,
}: CreateCampaignDialogProps) {
  const [campaignType, setCampaignType] = useState<"contacts" | "csv" | "api">(
    "contacts"
  );
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [variableMapping, setVariableMapping] = useState<
    Record<string, string>
  >({});
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [internalSelectedGroup, setInternalSelectedGroup] = useState<string>("all");
  const selectedGroup = selectedGroupProp ?? internalSelectedGroup;
  const setSelectedGroup = (value: string) => {
    setInternalSelectedGroup(value);
    onSelectedGroupChange?.(value);
    setSelectedContacts([]);
  };
  const [csvData, setCsvData] = useState<any[]>([]);
  const [scheduledTime, setScheduledTime] = useState("");
  const [autoRetry, setAutoRetry] = useState(false);
  const { t } = useTranslation();
  const [requiresHeaderImage, setRequiresHeaderImage] = useState(false);
  const [uploadedMediaId, setUploadedMediaId] = useState<string | null>(null);
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);


  const resetForm = () => {
    setSelectedTemplate(null);
    setVariableMapping({});
    setSelectedContacts([]);
    setInternalSelectedGroup("all");
    onSelectedGroupChange?.("all");
    setCsvData([]);
    setScheduledTime("");
    setAutoRetry(false);
  };

 const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });


  const healthDetails = activeChannel?.healthDetails;

const messagingLimitRaw = healthDetails?.messaging_limit; // "UNKNOWN", "TIER_1K" etc.
const throughputLevel = healthDetails?.throughput_level;  // "STANDARD"
const wabaBlocked = healthDetails?.health_status?.entities
  ?.find((e: any) => e.entity_type === "WABA")
  ?.can_send_message === "BLOCKED";




  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        setCsvData(data);
      },
    });
  };

  const extractTemplateVariables = (template: any) => {
    const variables: string[] = [];
    const regex = /\{\{(\d+)\}\}/g;

    if (template?.body) {
      let match;
      while ((match = regex.exec(template.body)) !== null) {
        variables.push(match[1]);
      }
    }

    return variables;
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ["name", "phone", "email", "custom_field_1", "custom_field_2"],
      ["John Doe", "+1234567890", "john@example.com", "Value 1", "Value 2"],
      ["Jane Smith", "+0987654321", "jane@example.com", "Value 3", "Value 4"],
      [
        "Example User",
        "+1122334455",
        "example@email.com",
        "Value 5",
        "Value 6",
      ],
    ];

    const csvContent = sampleData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaign_contacts_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = (formData: any) => {
    onCreateCampaign({
      campaignType,
      selectedTemplate,
      variableMapping,
      selectedContacts,
      selectedGroup,
      csvData,
      scheduledTime,
      autoRetry,
      ...formData,
    });
  };

  // Server-side filtering by group is handled by the parent query; the
  // `contacts` prop already reflects the selected group.
  const filteredContacts = contacts;
  const totalContacts =
    typeof contactsTotal === "number" ? contactsTotal : contacts.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("campaigns.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("campaigns.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

   {/* Messaging Limit Banner */}
{activeChannel && (
  <div className="border rounded-md p-3 bg-amber-50 border-amber-200 space-y-1">
    <div className="flex items-center gap-2">
      <span className="text-amber-600">📊</span>
      <p className="text-sm font-medium text-amber-800">Messaging Limit</p>
    </div>
    <p className="text-xs text-amber-700">
      Tier: <strong>{activeChannel.messagingLimitInfo?.tier ?? "UNKNOWN"}</strong>
      &nbsp;|&nbsp;
      Daily Limit: <strong>{activeChannel.messagingLimitInfo?.label ?? "Unconfirmed"}</strong>
    </p>

    
  </div>
)}
    

        <Tabs
          value={campaignType}
          onValueChange={(v) => setCampaignType(v as any)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("campaigns.contactsImport")}
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {t("campaigns.csvImport")}
            </TabsTrigger>
          </TabsList>

          <CreateCampaignForm
            onSubmit={handleSubmit}
            templates={templates}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            variableMapping={variableMapping}
            setVariableMapping={setVariableMapping}
            extractTemplateVariables={extractTemplateVariables}
            scheduledTime={scheduledTime}
            setScheduledTime={setScheduledTime}
            autoRetry={autoRetry}
            setAutoRetry={setAutoRetry}
            isCreating={isCreating}
            onCancel={() => onOpenChange(false)}
            channelId={activeChannel?.id}
            requiresHeaderImage={requiresHeaderImage}
            setRequiresHeaderImage={setRequiresHeaderImage}
            uploadedMediaId={uploadedMediaId}
            setUploadedMediaId={setUploadedMediaId}
            messagingLimit={messagingLimit}
            messagingTier={messagingTier}
          >
            <TabsContent value="contacts" className="space-y-4">
              <div>
                <Label className="mb-2 block">
                  {t("campaigns.campaignfilterlabel")}
                </Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("campaigns.selectGroup")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("campaigns.allGroup")}
                    </SelectItem>
                    {groups.map((group: any) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name} ({group.contact_count || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>{t("campaigns.selectConatcts")}</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={
                        selectedContacts.length === filteredContacts.length &&
                        filteredContacts.length > 0
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedContacts(
                            filteredContacts.map((c: any) => c.id)
                          );
                        } else {
                          setSelectedContacts([]);
                        }
                      }}
                    />
                    <Label className="font-normal text-sm">
                      {t("campaigns.selectAll")} ({totalContacts})
                    </Label>
                  </div>
                </div>
                <ScrollArea className="h-64 border rounded-md p-4">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {t("campaigns.noContactsInGroup")}
                    </div>
                  ) : (
                    filteredContacts.map((contact: any) => (
                      <div
                        key={contact.id}
                        className="flex items-center space-x-2 mb-2"
                      >
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedContacts([
                                ...selectedContacts,
                                contact.id,
                              ]);
                            } else {
                              setSelectedContacts(
                                selectedContacts.filter(
                                  (id) => id !== contact.id
                                )
                              );
                            }
                          }}
                        />
                        <Label className="font-normal">
                          {user?.username === "demouser" ? (
                            <>
                              {contact.name.slice(0, -1).replace(/./g, "*") +
                                contact.name.slice(-1)}{" "}
                              (
                              {contact.phone.slice(0, -4).replace(/\d/g, "*") +
                                contact.phone.slice(-4)}
                              )
                            </>
                          ) : (
                            <>
                              {contact.name} ({contact.phone})
                            </>
                          )}
                        </Label>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="csv" className="space-y-4">
              <div>
                <Label htmlFor="csvFile">{t("campaigns.uploadCSVFile")}</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      downloadSampleCSV();
                    }}
                    className="text-blue-500 hover:underline"
                  >
                    {t("campaigns.downloadSampleCSV")}
                  </a>
                </p>
              </div>

              {csvData.length > 0 && (
                <div>
                  <Label>
                    {t("campaigns.csvPreview")} ({csvData.length.toLocaleString()}{" "}
                    {t("campaigns.rows")})
                  </Label>
                  <ScrollArea className="max-h-64 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(csvData[0] || {}).map((header) => (
                            <TableHead key={header}>{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.slice(0, 5).map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value: any, i) => (
                              <TableCell key={i}>{value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {csvData.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Showing first 5 of {csvData.length.toLocaleString()} contacts
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="api" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-blue-800">
                  {t("campaigns.tabContent")}
                </p>
              </div>
            </TabsContent>
          </CreateCampaignForm>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
