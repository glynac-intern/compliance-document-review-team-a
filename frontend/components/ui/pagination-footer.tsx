import { Button } from "@/components/ui/button";

interface PaginationFooterProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function PaginationFooter({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
}: PaginationFooterProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-500">
      <span>
        Showing {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="xs"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="xs"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
