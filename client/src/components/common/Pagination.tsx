import './Pagination.css';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (size: number) => void;
}

export default function Pagination({
  page,
  pages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const handlePrev = () => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < pages) {
      onPageChange(page + 1);
    }
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onLimitChange) {
      onLimitChange(Number(e.target.value));
    }
  };

  return (
    <div className="pagination">
      <div className="pagination-info">
        共 {total} 条记录，第 {page} / {pages || 1} 页
      </div>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={handlePrev}
          disabled={page === 1}
        >
          上一页
        </button>
        <span className="pagination-current">{page}</span>
        <button
          className="pagination-btn"
          onClick={handleNext}
          disabled={page >= pages}
        >
          下一页
        </button>
        {onLimitChange && (
          <select
            className="pagination-size"
            value={limit}
            onChange={handleLimitChange}
          >
            <option value="5">5条/页</option>
            <option value="10">10条/页</option>
            <option value="20">20条/页</option>
            <option value="30">30条/页</option>
            <option value="50">50条/页</option>
          </select>
        )}
      </div>
    </div>
  );
}
