import { useState } from 'react';

export function usePagination(initialLimit = 5) {
  const [limit, setLimit] = useState(initialLimit);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);

  const setPage = (newPage: number) => {
    setOffset((newPage - 1) * limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0); // 重置到第一页
  };

  return {
    limit,
    offset,
    total,
    page,
    pages,
    setLimit: handleLimitChange,
    setPage,
    setTotal,
  };
}
