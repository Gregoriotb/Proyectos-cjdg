import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}) => {
  if (totalItems === 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/5 gap-4">
      <div className="text-sm text-cjdg-textMuted">
        Mostrando <span className="text-white font-medium">{startItem}</span> a <span className="text-white font-medium">{endItem}</span> de <span className="text-white font-medium">{totalItems}</span> productos
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg bg-white/5 text-cjdg-textMuted hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = page;
            if (totalPages <= 5) {
                pageNum = i + 1;
            } else if (page <= 3) {
                pageNum = i + 1;
            } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
            } else {
                pageNum = page - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  page === pageNum
                    ? 'bg-cjdg-primary text-white'
                    : 'bg-white/5 text-cjdg-textMuted hover:bg-white/10 hover:text-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg bg-white/5 text-cjdg-textMuted hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
