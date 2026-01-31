import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import './Table.css';

interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  loading?: boolean;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  maxHeight?: string;
}

export default function Table<T>({
  data,
  columns,
  loading = false,
  maxHeight = '500px',
}: TableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="table-container">
      {loading ? (
        <div className="table-loading">加载中...</div>
      ) : data.length === 0 ? (
        <div className="table-empty">暂无数据</div>
      ) : (
        <div className="table-scroll-wrapper" style={{ maxHeight }}>
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
