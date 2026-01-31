import { useState, useEffect } from 'react';
import { financeService, Voucher, VoucherItem } from '../../services/finance';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { ColumnDef } from '@tanstack/react-table';
import '../system/Students.css';

const SOURCE_TYPE_MAP: Record<string, string> = {
  'student_payment': '学员缴费',
  'payment_reversal': '缴费冲销',
  'student_discount': '学员减免',
  'discount_reversal': '减免冲销',
  'coach_salary': '教练工资',
  'submit_confirm': '上缴确认',
  'submit_revoke': '撤销上缴',
  'manual': '手动录入'
};

export default function Vouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [keyword, setKeyword] = useState('');
  const [sourceType, setSourceType] = useState('');
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [voucherItems, setVoucherItems] = useState<VoucherItem[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { limit, offset, total, setTotal, page, pages, setPage, setLimit } = usePagination();

  useEffect(() => {
    fetchVouchers();
  }, [limit, offset]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await financeService.getVouchers({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        keyword: keyword || undefined,
        source_type: sourceType || undefined,
        limit,
        offset,
        sortBy: 'voucher_date',
        sortOrder: 'DESC'
      });
      if (response.data) {
        setVouchers(response.data.list || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('获取凭证列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchVouchers();
  };

  const handleViewDetail = async (voucher: Voucher) => {
    try {
      const response = await financeService.getVoucherDetail(voucher.id);
      if (response.data) {
        setSelectedVoucher(response.data);
        setVoucherItems(response.data.items || []);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('获取凭证详情失败:', error);
      alert('获取凭证详情失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await financeService.deleteVoucher(deleteId);
      alert('凭证删除成功');
      setDeleteId(null);
      fetchVouchers();
    } catch (error: any) {
      console.error('删除凭证失败:', error);
      alert(error.message || '删除失败');
    }
  };

  const getSourceTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      'student_payment': 'badge-green',
      'payment_reversal': 'badge-red',
      'student_discount': 'badge-yellow',
      'discount_reversal': 'badge-red',
      'coach_salary': 'badge-orange',
      'submit_confirm': 'badge-purple',
      'submit_revoke': 'badge-red',
      'manual': 'badge-blue'
    };
    return badges[type] || 'badge-gray';
  };

  const columns: ColumnDef<Voucher, any>[] = [
    {
      accessorKey: 'voucher_no',
      header: '凭证号',
      size: 120,
    },
    {
      accessorKey: 'voucher_date',
      header: '记账日期',
      size: 100,
      cell: ({ row }) => row.original.voucher_date?.substring(0, 10),
    },
    {
      accessorKey: 'description',
      header: '摘要',
      size: 200,
      cell: ({ row }) => row.original.description || '-',
    },
    {
      accessorKey: 'total_debit',
      header: '借方金额',
      size: 100,
      cell: ({ row }) => (
        <span className="text-blue">
          ¥{parseFloat(String(row.original.total_debit || 0)).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'total_credit',
      header: '贷方金额',
      size: 100,
      cell: ({ row }) => (
        <span className="text-green">
          ¥{parseFloat(String(row.original.total_credit || 0)).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'source_type',
      header: '来源',
      size: 100,
      cell: ({ row }) => (
        <span className={`badge ${getSourceTypeBadge(row.original.source_type)}`}>
          {SOURCE_TYPE_MAP[row.original.source_type] || row.original.source_type}
        </span>
      ),
    },
    {
      accessorKey: 'creator_name',
      header: '制单人',
      size: 80,
      cell: ({ row }) => row.original.creator_name || '-',
    },
    {
      header: '操作',
      size: 150,
      cell: ({ row }) => (
        <div className="action-buttons">
          <button
            onClick={() => handleViewDetail(row.original)}
            className="btn btn-info btn-sm"
          >
            详情
          </button>
          {row.original.source_type === 'manual' && (
            <button
              onClick={() => setDeleteId(row.original.id)}
              className="btn btn-danger btn-sm"
            >
              删除
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="students-page">
      <div className="page-header">
        <h1>凭证管理</h1>
      </div>

      <div className="search-panel">
        <div className="search-row">
          <div className="search-item">
            <label>开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="search-item">
            <label>结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="search-item">
            <label>来源类型</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
            >
              <option value="">全部</option>
              <option value="student_payment">学员缴费</option>
              <option value="coach_salary">教练工资</option>
              <option value="manual">手动录入</option>
            </select>
          </div>
          <div className="search-item">
            <label>关键字</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="凭证号或摘要"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} className="btn btn-primary">
            查询
          </button>
        </div>
      </div>

      <div className="table-container">
        <Table columns={columns} data={vouchers} loading={loading} />
      </div>

      <Pagination
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* 凭证详情Modal */}
      <Modal
        title={`凭证详情 - ${selectedVoucher?.voucher_no}`}
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        width="800px"
      >
        {selectedVoucher && (
          <div>
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><strong>凭证号：</strong>{selectedVoucher.voucher_no}</div>
                <div><strong>记账日期：</strong>{selectedVoucher.voucher_date?.substring(0, 10)}</div>
                <div><strong>摘要：</strong>{selectedVoucher.description || '-'}</div>
                <div><strong>来源：</strong>{SOURCE_TYPE_MAP[selectedVoucher.source_type] || selectedVoucher.source_type}</div>
                <div><strong>制单人：</strong>{selectedVoucher.creator_name || '-'}</div>
                <div><strong>创建时间：</strong>{selectedVoucher.created_at?.substring(0, 19).replace('T', ' ')}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>摘要</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>科目</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', width: '120px' }}>借方金额</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', width: '120px' }}>贷方金额</th>
                </tr>
              </thead>
              <tbody>
                {voucherItems.map((item, index) => (
                  <tr key={index}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.summary || '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      {item.subject_code} - {item.subject_name || ''}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', color: '#1890ff' }}>
                      {item.entry_type === '借' ? `¥${parseFloat(String(item.amount)).toFixed(2)}` : ''}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', color: '#52c41a' }}>
                      {item.entry_type === '贷' ? `¥${parseFloat(String(item.amount)).toFixed(2)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#fafafa', fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>合计</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', color: '#1890ff' }}>
                    ¥{voucherItems.filter(i => i.entry_type === '借').reduce((sum, i) => sum + parseFloat(String(i.amount)), 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', color: '#52c41a' }}>
                    ¥{voucherItems.filter(i => i.entry_type === '贷').reduce((sum, i) => sum + parseFloat(String(i.amount)), 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        visible={!!deleteId}
        title="确认删除"
        message="删除凭证后无法恢复，确定要删除吗？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
