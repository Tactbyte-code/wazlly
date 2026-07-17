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

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useTranslation } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageSquare,
  Shield,
  CheckCircle,
  FolderPlus,
} from "lucide-react";
import { type Contact } from "./types";

interface ContactsTableProps {
  contacts: Contact[];
  selectedContactIds: string[];
  allSelected: boolean;
  toggleSelectAll: () => void;
  toggleSelectOne: (id: string) => void;
  searchQuery: string;
  selectedGroup: string | null;
  selectedStatus: string | null;
  clearAllFilters: () => void;
  setShowAddDialog: (show: boolean) => void;
  setSelectedContact: (contact: Contact | null) => void;
  setShowMessageDialog: (show: boolean) => void;
  setShowEditDialog: (show: boolean) => void;
  handleDeleteContact: (id: string) => void;
  handleToggleContactStatus: (id: string, currentStatus: string | null) => void;
  handleOpenAssignGroup: (contactIds: string[]) => void;
  fetchTemplates: () => void;
  activeChannel: any;
  channels: any;
  user: any;
  deleteContactMutation: any;
  toast: any;
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  setLimit: (limit: number) => void;
  setCurrentPage: (page: number) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  getPageNumbers: () => number[];
  goToPage: (page: number) => void;
}

export function ContactsTable({
  contacts,
  selectedContactIds,
  allSelected,
  toggleSelectAll,
  toggleSelectOne,
  searchQuery,
  selectedGroup,
  selectedStatus,
  clearAllFilters,
  setShowAddDialog,
  setSelectedContact,
  setShowMessageDialog,
  setShowEditDialog,
  handleDeleteContact,
  handleToggleContactStatus,
  handleOpenAssignGroup,
  fetchTemplates,
  activeChannel,
  channels,
  user,
  deleteContactMutation,
  toast,
  page,
  totalPages,
  total,
  limit,
  setLimit,
  setCurrentPage,
  goToPreviousPage,
  goToNextPage,
  getPageNumbers,
  goToPage,
}: ContactsTableProps) {
  const { t } = useTranslation();

  const handleMessageClick = async (contact: Contact) => {
    if (!activeChannel?.id) {
      toast({
        title: "No active channel",
        description: "Please select an active WhatsApp channel",
        variant: "destructive",
      });
      return;
    }

    setSelectedContact(contact);
    setShowMessageDialog(true);

    await fetchTemplates();
  };

  return (
    <Card>
      <CardContent className="p-0">
        {!contacts.length ? (
          <EmptyState
            icon={Users}
            title={`${t("contacts.noContactsFound")}`}
            description={
              searchQuery || selectedGroup || selectedStatus
                ? `${t("contacts.noFilters")}`
                : `${t("contacts.noContactsYet")}`
            }
            action={
              !(searchQuery || selectedGroup || selectedStatus)
                ? {
                    label: `${t("contacts.addYourFirstContact")}`,
                    onClick: () => setShowAddDialog(true),
                  }
                : {
                    label: ` ${t("contacts.clearFilters")}`,
                    onClick: clearAllFilters,
                  }
            }
            className="py-8 sm:py-12"
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 lg:px-6 py-3 lg:py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left px-3 lg:px-6 py-3 lg:py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("contacts.contact")}
                    </th>
                    <th className="text-left px-3 lg:px-6 py-3 lg:py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("contacts.phone")}
                    </th>
                    <th className="text-left px-3 lg:px-6 py-3 lg:py-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      {t("contacts.groups")}
                    </th>
                    <th className="text-left px-3 lg:px-6 py-3 lg:py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("contacts.status")}
                    </th>
                    <th className="text-left px-3 lg:px-6 py-3 lg:py-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                      {t("contacts.lastContact")}
                    </th>
                    <th className="text-left px-3 lg:px-6 py-3 lg:py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("contacts.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact: Contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 lg:px-6 py-3 lg:py-4">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={() => toggleSelectOne(contact.id)}
                        />
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs lg:text-sm font-medium text-white">
                              {contact.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-2 lg:ml-4 min-w-0">
                            <div className="text-xs lg:text-sm font-medium text-gray-900 truncate">
                              {user?.username === "demouser"
                                ? contact.name
                                    .slice(0, -1)
                                    .replace(/./g, "*") +
                                  contact.name.slice(-1)
                                : contact.name}
                            </div>
                            {contact.email && (
                              <div className="text-xs text-gray-500 truncate">
                                {user?.username === "demouser"
                                  ? contact.email
                                      .split("@")[0]
                                      .slice(0, -2)
                                      .replace(/./g, "*") +
                                    contact.email.slice(
                                      contact.email.indexOf("@") - 2
                                    )
                                  : contact.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-gray-900">
                        {user?.username === "demouser"
                          ? contact.phone.slice(0, -4).replace(/\d/g, "*") +
                            contact.phone.slice(-4)
                          : contact.phone}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(contact.groups) &&
                          contact.groups.length > 0 ? (
                            contact.groups.map(
                              (group: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {group}
                                </Badge>
                              )
                            )
                          ) : (
                            <span className="text-xs text-gray-400">
                              {t("contacts.noGroups")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4">
                        <Badge
                          variant={
                            contact.status === "active"
                              ? "default"
                              : "secondary"
                          }
                          className={`text-xs ${
                            contact.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {contact.status?.toLocaleUpperCase() || "N/A"}
                        </Badge>
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-gray-900 hidden xl:table-cell">
                        {contact.lastContact
                          ? new Date(
                              contact.lastContact
                            ).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4">
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMessageClick(contact)}
                            disabled={!channels || channels.length === 0 }
                            className="h-8 w-8 p-0"
                          >
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedContact(contact);
                              setShowEditDialog(true);
                            }}
                            className="h-8 w-8 p-0 hidden lg:flex"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteContact(contact.id)}
                            disabled={
                              user?.username === "demouser"
                                ? true
                                : deleteContactMutation.isPending
                            }
                            className="h-8 w-8 p-0 hidden lg:flex"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48"
                            >
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedContact(contact);
                                  setShowEditDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                {t("contacts.editContact.title")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenAssignGroup([contact.id])}
                              >
                                <FolderPlus className="h-4 w-4 mr-2" />
                                Add to Group
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleMessageClick(contact)}
                                disabled={
                                  !channels || channels.length === 0
                                }
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                {t("contacts.sendMessage.title")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleContactStatus(
                                    contact.id,
                                    contact.status
                                  )
                                }
                                className={
                                  contact.status === "active"
                                    ? "text-red-600"
                                    : "text-green-600"
                                }
                                disabled={user?.username === "demouser"}
                              >
                                {contact.status === "active" ? (
                                  <>
                                    <Shield className="h-4 w-4 mr-2" />
                                    {t("contacts.blockContact")}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {t("contacts.unblockContact")}
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteContact(contact.id)
                                }
                                className="text-red-600"
                                disabled={user?.username === "demouser"}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("contacts.deleteContact.title")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-3">
              {contacts.map((contact: Contact) => (
                <div
                  key={contact.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 mt-1 flex-shrink-0"
                        checked={selectedContactIds.includes(contact.id)}
                        onChange={() => toggleSelectOne(contact.id)}
                      />
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-lg font-medium text-white">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {user?.username === "demouser"
                            ? contact.name.slice(0, -1).replace(/./g, "*") +
                              contact.name.slice(-1)
                            : contact.name}
                        </div>
                        {contact.email && (
                          <div className="text-xs text-gray-500 truncate">
                            {user?.username === "demouser"
                              ? contact.email
                                  .split("@")[0]
                                  .slice(0, -2)
                                  .replace(/./g, "*") +
                                contact.email.slice(
                                  contact.email.indexOf("@") - 2
                                )
                              : contact.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        contact.status === "active"
                          ? "default"
                          : "secondary"
                      }
                      className={`text-xs whitespace-nowrap ${
                        contact.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {contact.status?.toLocaleUpperCase() || "N/A"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium text-xs">
                        Phone:
                      </span>
                      <span className="text-gray-700 text-xs">
                        {user?.username === "demouser"
                          ? contact.phone.slice(0, -4).replace(/\d/g, "*") +
                            contact.phone.slice(-4)
                          : contact.phone}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500 font-medium text-xs">
                        Groups:
                      </span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                        {Array.isArray(contact.groups) &&
                        contact.groups.length > 0 ? (
                          contact.groups.map(
                            (group: string, index: number) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {group}
                              </Badge>
                            )
                          )
                        ) : (
                          <span className="text-xs text-gray-400">
                            {t("contacts.noGroups")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium text-xs">
                        Last Contact:
                      </span>
                      <span className="text-gray-700 text-xs">
                        {contact.lastContact
                          ? new Date(
                              contact.lastContact
                            ).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMessageClick(contact)}
                      disabled={!channels || channels.length === 0}
                      className="flex-1 text-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      Message
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedContact(contact);
                        setShowEditDialog(true);
                      }}
                      className="flex-1 text-xs"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() =>
                            handleToggleContactStatus(
                              contact.id,
                              contact.status
                            )
                          }
                          className={
                            contact.status === "active"
                              ? "text-red-600"
                              : "text-green-600"
                          }
                          disabled={user?.username === "demouser"}
                        >
                          {contact.status === "active" ? (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              {t("contacts.blockContact")}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t("contacts.unblockContact")}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-600"
                          disabled={user?.username === "demouser"}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("contacts.deleteContact.title")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {contacts.length > 0 && (
          <div className="bg-gray-50 px-3 sm:px-4 md:px-6 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                Showing{" "}
                <span className="font-medium">
                  {(page - 1) * limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min((page - 1) * limit + limit, total)}
                </span>{" "}
                of <span className="font-medium">{total}</span> contacts
              </div>

              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={page === 1}
                className="text-xs px-2 sm:px-3"
              >
                <span className="hidden sm:inline">
                  {t("contacts.previous")}
                </span>
                <span className="sm:hidden">Prev</span>
              </Button>

              <div className="flex gap-1 overflow-x-auto max-w-[150px] sm:max-w-none">
                {getPageNumbers().map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className={`text-xs px-2 sm:px-3 min-w-[32px] ${
                      page === pageNum
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : ""
                    }`}
                  >
                    {pageNum}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={page === totalPages}
                className="text-xs px-2 sm:px-3"
              >
                {t("contacts.next")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
