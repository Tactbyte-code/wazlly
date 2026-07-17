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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export function TablePagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Rows per page selector - Full width on mobile, auto on desktop */}
      <div className="flex items-center justify-between sm:justify-start gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Rows per page:
        </span>
        <Select
          value={itemsPerPage.toString()}
          onValueChange={(value) => {
            onItemsPerPageChange(Number(value));
            onPageChange(1);
          }}
        >
          <SelectTrigger
            className="w-[70px] sm:w-[80px]"
            data-testid="select-items-per-page"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25" data-testid="option-items-per-page-25">
              25
            </SelectItem>
            <SelectItem value="50" data-testid="option-items-per-page-50">
              50
            </SelectItem>
            <SelectItem value="100" data-testid="option-items-per-page-100">
              100
            </SelectItem>
            <SelectItem value="250" data-testid="option-items-per-page-250">
              250
            </SelectItem>
            <SelectItem value="500" data-testid="option-items-per-page-500">
              500
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pagination controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        {/* Item count - Centered on mobile */}
        <span className="text-sm text-muted-foreground text-center sm:text-left">
          {startItem}-{endItem} of {totalItems}
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentPage === 1}
            data-testid="button-previous-page"
            className="flex-1 sm:flex-none"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <span className="text-sm whitespace-nowrap px-2">
            Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            data-testid="button-next-page"
            className="flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
