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
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  Upload,
  Plus,
  Download,
  Trash2,
  FolderPlus,
} from "lucide-react";
import { type Contact } from "./types";

interface ContactsToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedGroup: string | null;
  setSelectedGroup: (group: string | null) => void;
  selectedStatus: string | null;
  setSelectedStatus: (status: string | null) => void;
  groupsData: any[];
  handleExportAllContacts: () => void;
  handleCSVUpload: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  handleExcelUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleExcelDownload: () => void;
  handleExportSelectedContacts: () => void;
  handleOpenAssignGroup: (contactIds: string[]) => void;
  setShowBulkDeleteDialog: (show: boolean) => void;
  selectedContactIds: string[];
  user: any;
  setLocation: (path: string) => void;
  isImporting?: boolean;
}

export function ContactsToolbar({
  searchQuery,
  setSearchQuery,
  selectedGroup,
  setSelectedGroup,
  selectedStatus,
  setSelectedStatus,
  groupsData,
  handleExportAllContacts,
  handleCSVUpload,
  handleExcelUpload,
  handleExcelDownload,
  handleExportSelectedContacts,
  handleOpenAssignGroup,
  setShowBulkDeleteDialog,
  selectedContactIds,
  user,
  setLocation,
  isImporting = false,
}: ContactsToolbarProps) {
  const { t } = useTranslation();

  return (
    <>
      <Card>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={`${t("contacts.searchContacts")}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {selectedGroup || `${t("contacts.allGroups")}`}
                    </span>
                    <span className="sm:hidden">
                      {selectedGroup
                        ? selectedGroup.substring(0, 8) + "..."
                        : "Groups"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => setSelectedGroup(null)}
                    className={!selectedGroup ? "bg-gray-100" : ""}
                  >
                    {t("contacts.allGroups")}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setLocation("/groups")}
                    className="text-green-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("groups.createButton") || "Create Group"}
                  </DropdownMenuItem>
                  {groupsData?.length > 0 && (
                    <>
                      <DropdownMenuItem disabled className="py-1">
                        <span className="text-xs text-gray-500 uppercase">
                          {t("contacts.availableGroups")}
                        </span>
                      </DropdownMenuItem>

                      {groupsData?.map((group) => (
                        <DropdownMenuItem
                          key={group.id}
                          onClick={() => setSelectedGroup(group.name)}
                          className={
                            selectedGroup === group.name ? "bg-gray-100" : ""
                          }
                        >
                          {group.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {selectedStatus || `${t("contacts.allStatuses")}`}
                    </span>
                    <span className="sm:hidden">Status</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => setSelectedStatus(null)}
                    className={!selectedStatus ? "bg-gray-100" : ""}
                  >
                    {t("contacts.allStatuses")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedStatus("active")}
                    className={
                      selectedStatus === "active" ? "bg-gray-100" : ""
                    }
                  >
                    {t("contacts.active")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedStatus("blocked")}
                    className={
                      selectedStatus === "blocked" ? "bg-gray-100" : ""
                    }
                  >
                    {t("contacts.blocked")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAllContacts}
                disabled={user?.username === "demouser"}
                className="text-xs sm:text-sm"
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">
                  {t("contacts.exportAllContacts")}
                </span>
                <span className="sm:hidden">Export</span>
              </Button>

              {user?.username === "demouser" ? (
                <Button
                  disabled={true}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm"
                  asChild
                >
                  <span>
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {t("contacts.importContacts")}
                    </span>
                    <span className="sm:hidden">Import</span>
                  </span>
                </Button>
              ) : (
                <label className={isImporting ? "cursor-not-allowed opacity-60" : "cursor-pointer"}>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    disabled={isImporting}
                    onChange={(e) => {
                      if (e.target.files?.[0]?.name.endsWith(".csv")) {
                        handleCSVUpload(e);
                      } else {
                        handleExcelUpload(e);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    disabled={isImporting}
                    asChild
                  >
                    <span>
                      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      <span className="hidden sm:inline">
                        {isImporting ? "Importing…" : t("contacts.importContacts")}
                      </span>
                      <span className="sm:hidden">{isImporting ? "…" : "Import"}</span>
                    </span>
                  </Button>
                </label>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleExcelDownload}
                className="text-xs sm:text-sm"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                <span className="hidden lg:inline">
                  {t("contacts.downloadSampleExcel")}
                </span>
                <span className="lg:hidden">Sample</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedContactIds.length > 0 && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs sm:text-sm font-medium">
                {selectedContactIds.length} {t("contacts.contact")}
                {selectedContactIds.length > 1 ? "s" : ""}{" "}
                {t("contacts.selected")}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelectedContacts}
                  disabled={user?.username === "demouser"}
                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {t("contacts.exportSelected")}
                  </span>
                  <span className="sm:hidden">Export</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenAssignGroup(selectedContactIds)}
                  disabled={user?.username === "demouser"}
                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  <FolderPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Add to Group</span>
                  <span className="sm:hidden">Group</span>
                </Button>
                <Button
                  disabled={user?.username === "demouser"}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none text-red-600 text-xs sm:text-sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {t("contacts.deleteSelected")}
                  </span>
                  <span className="sm:hidden">Delete</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
