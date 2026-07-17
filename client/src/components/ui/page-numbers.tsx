import { Button } from "@/components/ui/button";

function getPageNumbers(currentPage: number, totalPages: number, maxPages = 5): number[] {
  const pages: number[] = [];
  const halfRange = Math.floor(maxPages / 2);

  let startPage = Math.max(1, currentPage - halfRange);
  let endPage = Math.min(totalPages, startPage + maxPages - 1);

  if (endPage - startPage < maxPages - 1) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  return pages;
}

interface PageNumbersProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PageNumbers({ currentPage, totalPages, onPageChange }: PageNumbersProps) {
  if (totalPages <= 1) {
    return (
      <span className="bg-green-600 text-white px-3 py-1 rounded text-sm min-w-[32px] text-center inline-block">
        1
      </span>
    );
  }

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
      {pages[0] > 1 && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            className="text-xs px-2 sm:px-3 min-w-[32px]"
          >
            1
          </Button>
          {pages[0] > 2 && (
            <span className="text-xs px-1 py-1 text-gray-400 self-center">…</span>
          )}
        </>
      )}
      {pages.map((pageNum) => (
        <Button
          key={pageNum}
          variant={currentPage === pageNum ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(pageNum)}
          className={`text-xs px-2 sm:px-3 min-w-[32px] ${
            currentPage === pageNum
              ? "bg-green-600 text-white hover:bg-green-700"
              : ""
          }`}
        >
          {pageNum}
        </Button>
      ))}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="text-xs px-1 py-1 text-gray-400 self-center">…</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            className="text-xs px-2 sm:px-3 min-w-[32px]"
          >
            {totalPages}
          </Button>
        </>
      )}
    </div>
  );
}
