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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, FolderPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertContactSchema,
  type Contact,
  type InsertContact,
} from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";

function EditContactForm({
  contact,
  onSuccess,
  onCancel,
  groupsData,
}: {
  contact: Contact;
  onSuccess: () => void;
  onCancel: () => void;
  groupsData: any[];
}) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: contact.name,
      email: contact.email || "",
      phone: contact.phone,
      groups: contact.groups || [],
      tags: contact.tags || [],
      status: contact.status,
      channelId: contact.channelId,
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      const response = await apiRequest(
        "PUT",
        `/api/contacts/${contact.id}`,
        data,
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update contact");
      }
      return response.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      // ✅ now you'll actually see what's failing
      console.error("Update failed:", error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to update contact",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertContact) => {
    console.log("check contact data", data)
    updateContactMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("contacts.addContact.name")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("contacts.addContact.email")}</FormLabel>
              <FormControl>
                <Input {...field} type="email" value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("contacts.addContact.phone")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value}
                  maxLength={20}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="groups"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Groups</FormLabel>

              <Select
                onValueChange={(value) => {
                  if (!field.value.includes(value)) {
                    field.onChange([...field.value, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>

                <SelectContent>
                  {groupsData?.map((g: any) => (
                    <SelectItem key={g.id} value={g.name}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-wrap gap-2 mt-2">
                {field.value?.map((name: string) => (
                  <Badge key={name}>
                    {name}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={() =>
                        field.onChange(
                          field.value.filter((n: string) => n !== name),
                        )
                      }
                    />
                  </Badge>
                ))}
              </div>

              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={
              user?.username === "demouser"
                ? true
                : updateContactMutation.isPending
            }
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {updateContactMutation.isPending
              ? `${t("contacts.editContact.updating")}`
              : t("contacts.editContact.successTitle")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface ContactDialogsProps {
  showAddDialog: boolean;
  setShowAddDialog: (show: boolean) => void;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  showBulkDeleteDialog: boolean;
  setShowBulkDeleteDialog: (show: boolean) => void;
  showEditDialog: boolean;
  setShowEditDialog: (show: boolean) => void;
  showGroupDialog: boolean;
  setShowGroupDialog: (show: boolean) => void;
  showAssignGroupDialog: boolean;
  setShowAssignGroupDialog: (show: boolean) => void;
  selectedContact: Contact | null;
  setSelectedContact: (contact: Contact | null) => void;
  contactToDelete: string | null;
  setContactToDelete: (id: string | null) => void;
  selectedContactIds: string[];
  setSelectedContactIds: (ids: string[]) => void;
  assignGroupContactIds: string[];
  setAssignGroupContactIds: (ids: string[]) => void;
  contacts: Contact[];
  groupsData: any[];
  activeChannel: any;
  user: any;
  form: any;
  createContactMutation: any;
  deleteContactMutation: any;
  deleteBulkContactsMutation: any;
  addToGroupMutation: any;
  removeFromGroupMutation: any;
  queryClient: any;
  toast: any;
  groupName: string;
  setGroupName: (name: string) => void;
  groupDescription: string;
  setGroupDescription: (desc: string) => void;
}

export function ContactDialogs({
  showAddDialog,
  setShowAddDialog,
  showDeleteDialog,
  setShowDeleteDialog,
  showBulkDeleteDialog,
  setShowBulkDeleteDialog,
  showEditDialog,
  setShowEditDialog,
  showGroupDialog,
  setShowGroupDialog,
  showAssignGroupDialog,
  setShowAssignGroupDialog,
  selectedContact,
  setSelectedContact,
  contactToDelete,
  setContactToDelete,
  selectedContactIds,
  setSelectedContactIds,
  assignGroupContactIds,
  setAssignGroupContactIds,
  contacts,
  groupsData,
  activeChannel,
  user,
  form,
  createContactMutation,
  deleteContactMutation,
  deleteBulkContactsMutation,
  addToGroupMutation,
  removeFromGroupMutation,
  queryClient,
  toast,
  groupName,
  setGroupName,
  groupDescription,
  setGroupDescription,
}: ContactDialogsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Add Contact Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contacts.addContact.title")}</DialogTitle>
            <DialogDescription>
              {t("contacts.addContact.description")}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(
                (data: InsertContact) => {
                  console.log("FORM SUBMITTED", data);

                  createContactMutation.mutate({
                    ...data,
                    groups: data.groups || [],
                    tags: data.tags || [],
                    channelId: activeChannel?.id,
                  });
                },
                (errors) => {
                  console.log("FORM ERRORS:", errors);
                },
              )}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contacts.addContact.name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("contacts.addContact.description")}{" "}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="channelId"
                render={({ field }) => {
                  // Call onChange if the value is out of sync
                  if (field.value !== (activeChannel?.id ?? "")) {
                    field.onChange(activeChannel?.id ?? "");
                  }
                  return <input type="hidden" {...field} />;
                }}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contacts.addContact.phone")}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1234567890"
                        {...field}
                        maxLength={20}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("contacts.addContact.phoneDesc")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contacts.addContact.email")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="john@example.com"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  {t("contacts.addContact.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    user?.username === "demouser"
                      ? true
                      : createContactMutation.isPending
                  }
                >
                  {createContactMutation.isPending
                    ? `${t("contacts.addContact.submitting")}`
                    : `${t("contacts.addContact.submit")}`}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contacts.deleteContact.title")}</DialogTitle>
            <DialogDescription>
              {t("contacts.deleteContact.title")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setContactToDelete(null);
              }}
            >
              {t("contacts.addContact.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (contactToDelete) {
                  deleteContactMutation.mutate(contactToDelete);
                }
              }}
              disabled={deleteContactMutation.isPending}
            >
              {deleteContactMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contacts.deleteContacts.title")}</DialogTitle>
            <DialogDescription>
              {t("contacts.deleteContacts.description")}{" "}
              <strong>{selectedContactIds.length}</strong>{" "}
              {selectedContactIds.length > 1
                ? `${t("contacts.contacts")}`
                : `${t("contacts.contact")}`}
              . {t("contacts.deleteContacts.confirmation")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDeleteDialog(false);
              }}
            >
              {t("contacts.addContact.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteBulkContactsMutation.mutate(selectedContactIds);
                setShowBulkDeleteDialog(false);
              }}
              disabled={deleteBulkContactsMutation.isPending}
            >
              {deleteBulkContactsMutation.isPending
                ? `${t("contacts.deleteContacts.deleting")}`
                : `${t("contacts.deleteContacts.title")}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contacts.editContact.title")}</DialogTitle>
            <DialogDescription>
              {t("contacts.editContact.description")}
            </DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <EditContactForm
              contact={selectedContact}
              groupsData={groupsData}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
                queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
                queryClient.invalidateQueries({
                  queryKey: ["/api/groups/contact-counts"],
                });
                queryClient.invalidateQueries({
                  queryKey: ["/api/group-members"],
                });
                setShowEditDialog(false);
                setSelectedContact(null);
                toast({
                  title: `${t("contacts.editContact.successTitle")}`,
                  description: `${t("contacts.editContact.successDesc")}`,
                });
              }}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedContact(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contacts.createGroup.title")}</DialogTitle>
            <DialogDescription>
              {t("contacts.createGroup.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">
                {t("contacts.createGroup.name")}
              </label>
              <Input
                placeholder={`${t(
                  "contacts.createGroup.groupNamePlaceholder",
                )}`}
                className="mt-1"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {t("contacts.createGroup.groupDescription")}
              </label>
              <Textarea
                placeholder={`${t(
                  "contacts.createGroup.groupDescriptionPlaceholder",
                )}`}
                className="mt-1"
                rows={3}
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGroupDialog(false);
                  setGroupName("");
                  setGroupDescription("");
                }}
              >
                {t("contacts.addContact.cancel")}
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={async () => {
                  if (groupName.trim()) {
                    try {
                      const response = await apiRequest("POST", "/api/groups", {
                        name: groupName.trim(),
                        description: groupDescription.trim(),
                        channelId: activeChannel?.id,
                      });
                      if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || "Failed to create group");
                      }
                      queryClient.invalidateQueries({
                        queryKey: ["/api/groups"],
                      });
                      toast({
                        title: `${t("contacts.createGroup.successTitle")}`,
                        description: `${t("contacts.createGroup.successDesc")} ${groupName}`,
                      });
                      setShowGroupDialog(false);
                      setGroupName("");
                      setGroupDescription("");
                    } catch (err: any) {
                      toast({
                        title: "Error",
                        description: err.message || "Failed to create group",
                        variant: "destructive",
                      });
                    }
                  } else {
                    toast({
                      title: "Error",
                      description: "Please enter a group name",
                      variant: "destructive",
                    });
                  }
                }}
              >
                {t("contacts.createGroup.create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign to Group Dialog */}
      <Dialog
        open={showAssignGroupDialog}
        onOpenChange={setShowAssignGroupDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Groups</DialogTitle>
            <DialogDescription>
              {assignGroupContactIds.length === 1
                ? "Add or remove this contact from groups."
                : `Add ${assignGroupContactIds.length} contacts to a group.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {assignGroupContactIds.length === 1 &&
              (() => {
                const contact = contacts.find(
                  (c: Contact) => c.id === assignGroupContactIds[0],
                );
                const contactGroups = contact?.groups || [];
                if (contactGroups.length === 0) return null;
                return (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Current Groups
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {contactGroups.map((name: string) => (
                        <Badge key={name} variant="secondary" className="pr-1">
                          {name}
                          <button
                            className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                            disabled={removeFromGroupMutation.isPending}
                            onClick={() => {
                              removeFromGroupMutation.mutate({
                                contactIds: assignGroupContactIds,
                                groupName: name,
                              });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Add to Group
              </label>
              {groupsData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No groups available. Create a group first.
                </p>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {groupsData.map((group: any) => (
                    <Button
                      key={group.id}
                      variant="outline"
                      className="justify-start h-auto py-3 px-4"
                      disabled={addToGroupMutation.isPending}
                      onClick={() => {
                        addToGroupMutation.mutate({
                          contactIds: assignGroupContactIds,
                          groupName: group.name,
                        });
                      }}
                    >
                      <FolderPlus className="h-4 w-4 mr-3 shrink-0 text-green-600" />
                      <div className="text-left">
                        <div className="font-medium">{group.name}</div>
                        {group.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {group.description}
                          </div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignGroupDialog(false);
                  setAssignGroupContactIds([]);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
