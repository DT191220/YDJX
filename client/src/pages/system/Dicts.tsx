import { useState, useEffect } from 'react';
import { dictService } from '../../services/dict';
import { DictType, DictData, DictTypeFormData, DictDataFormData } from '../../types/dict';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { ColumnDef } from '@tanstack/react-table';
import './Dicts.css';

export default function Dicts() {
  const [dictTypes, setDictTypes] = useState<DictType[]>([]);
  const [dictData, setDictData] = useState<DictData[]>([]);
  const [selectedType, setSelectedType] = useState<DictType | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [editingData, setEditingData] = useState<DictData | null>(null);
  const [deleteTypeId, setDeleteTypeId] = useState<number | null>(null);
  const [deleteDataId, setDeleteDataId] = useState<number | null>(null);

  const { limit, offset, total, setTotal, page, pages, setPage, setLimit } = usePagination();

  useEffect(() => {
    fetchDictTypes();
  }, [limit, offset, keyword, statusFilter]);

  useEffect(() => {
    if (selectedType) {
      fetchDictData(selectedType.id);
    }
  }, [selectedType]);

  const fetchDictTypes = async () => {
    setLoading(true);
    try {
      const response = await dictService.getDictTypes({
        limit,
        offset,
        keyword,
        status: statusFilter,
        sortBy: 'id',
        sortOrder: 'desc'
      });
      setDictTypes(response.data!.list);
      setTotal(response.data!.pagination.total);
    } catch (error) {
      console.error('获取字典类型列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDictData = async (dictTypeId: number) => {
    try {
      const response = await dictService.getDictData(dictTypeId);
      setDictData(response.data || []);
    } catch (error) {
      console.error('获取字典数据失败:', error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchDictTypes();
  };

  const handleSelectType = (type: DictType) => {
    setSelectedType(type);
  };

  const handleAddType = () => {
    setEditingType(null);
    setShowTypeModal(true);
  };

  const handleEditType = (type: DictType) => {
    setEditingType(type);
    setShowTypeModal(true);
  };

  const handleDeleteType = async () => {
    if (!deleteTypeId) return;

    try {
      await dictService.deleteDictType(deleteTypeId);
      fetchDictTypes();
      if (selectedType?.id === deleteTypeId) {
        setSelectedType(null);
        setDictData([]);
      }
      setDeleteTypeId(null);
    } catch (error) {
      console.error('删除字典类型失败:', error);
      alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleAddData = () => {
    if (!selectedType) {
      alert('请先选择一个字典类型');
      return;
    }
    setEditingData(null);
    setShowDataModal(true);
  };

  const handleEditData = (data: DictData) => {
    setEditingData(data);
    setShowDataModal(true);
  };

  const handleDeleteData = async () => {
    if (!deleteDataId) return;

    try {
      await dictService.deleteDictData(deleteDataId);
      if (selectedType) {
        fetchDictData(selectedType.id);
      }
      setDeleteDataId(null);
    } catch (error) {
      console.error('删除字典数据失败:', error);
      alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const typeColumns: ColumnDef<DictType, any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 80,
    },
    {
      accessorKey: 'dict_name',
      header: '字典名称',
    },
    {
      accessorKey: 'dict_type',
      header: '字典类型',
    },
    {
      accessorKey: 'status',
      header: '状态',
      size: 100,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <span className={`status-tag ${value === '启用' ? 'status-active' : 'status-inactive'}`}>
            {value}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '操作',
      size: 250,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="table-actions">
            <button onClick={() => handleSelectType(record)} className="btn-view">
              查看数据
            </button>
            <button onClick={() => handleEditType(record)} className="btn-edit">
              编辑
            </button>
            <button onClick={() => setDeleteTypeId(record.id)} className="btn-delete">
              删除
            </button>
          </div>
        );
      },
    },
  ];

  const dataColumns: ColumnDef<DictData, any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 80,
    },
    {
      accessorKey: 'dict_label',
      header: '字典标签',
    },
    {
      accessorKey: 'dict_value',
      header: '字典值',
    },
    {
      accessorKey: 'sort_order',
      header: '排序',
      size: 100,
    },
    {
      accessorKey: 'status',
      header: '状态',
      size: 100,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <span className={`status-tag ${value === '启用' ? 'status-active' : 'status-inactive'}`}>
            {value}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '操作',
      size: 180,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="table-actions">
            <button onClick={() => handleEditData(record)} className="btn-edit">
              编辑
            </button>
            <button onClick={() => setDeleteDataId(record.id)} className="btn-delete">
              删除
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="dicts-page">
      <div className="page-header">
        <h2>字典管理</h2>
      </div>

      <div className="dicts-container">
        {/* 左侧：字典类型列表 */}
        <div className="dict-types-panel">
          <div className="panel-header">
            <h3>字典类型</h3>
            <button onClick={handleAddType} className="btn-add">
              新建
            </button>
          </div>

          <div className="panel-toolbar">
            <input
              type="text"
              placeholder="搜索字典类型"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">全部</option>
              <option value="启用">启用</option>
              <option value="禁用">禁用</option>
            </select>
          </div>

          <Table
            columns={typeColumns}
            data={dictTypes}
            loading={loading}
          />

          <Pagination
            page={page}
            pages={pages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>

        {/* 右侧：字典数据列表 */}
        <div className="dict-data-panel">
          <div className="panel-header">
            <h3>
              {selectedType ? `字典数据：${selectedType.dict_name}` : '字典数据'}
            </h3>
            {selectedType && (
              <button onClick={handleAddData} className="btn-add">
                新建数据
              </button>
            )}
          </div>

          {selectedType ? (
            <Table
              columns={dataColumns}
              data={dictData}
              loading={false}
            />
          ) : (
            <div className="empty-state">
              <p>请在左侧选择一个字典类型查看数据</p>
            </div>
          )}
        </div>
      </div>

      {/* 字典类型表单 */}
      {showTypeModal && (
        <DictTypeFormModal
          dictType={editingType}
          onClose={() => setShowTypeModal(false)}
          onSuccess={() => {
            setShowTypeModal(false);
            fetchDictTypes();
          }}
        />
      )}

      {/* 字典数据表单 */}
      {showDataModal && selectedType && (
        <DictDataFormModal
          dictData={editingData}
          dictTypeId={selectedType.id}
          onClose={() => setShowDataModal(false)}
          onSuccess={() => {
            setShowDataModal(false);
            fetchDictData(selectedType.id);
          }}
        />
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        visible={!!deleteTypeId}
        title="确认删除"
        message="确定要删除这个字典类型吗？相关的字典数据也将被删除。"
        type="danger"
        onConfirm={handleDeleteType}
        onCancel={() => setDeleteTypeId(null)}
      />

      <ConfirmDialog
        visible={!!deleteDataId}
        title="确认删除"
        message="确定要删除这个字典数据吗？"
        type="danger"
        onConfirm={handleDeleteData}
        onCancel={() => setDeleteDataId(null)}
      />
    </div>
  );
}

// 字典类型表单
interface DictTypeFormModalProps {
  dictType: DictType | null;
  onClose: () => void;
  onSuccess: () => void;
}

function DictTypeFormModal({ dictType, onClose, onSuccess }: DictTypeFormModalProps) {
  const [formData, setFormData] = useState<DictTypeFormData>({
    dict_name: dictType?.dict_name || '',
    dict_type: dictType?.dict_type || '',
    status: dictType?.status || '启用',
    remark: dictType?.remark || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (dictType) {
        await dictService.updateDictType(dictType.id, formData);
      } else {
        await dictService.createDictType(formData);
      }
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={dictType ? '编辑字典类型' : '新建字典类型'} visible={true} onClose={onClose}>
      <form onSubmit={handleSubmit} className="dict-form">
        <div className="form-group">
          <label htmlFor="dict_name">
            字典名称 <span className="required">*</span>
          </label>
          <input
            type="text"
            id="dict_name"
            value={formData.dict_name}
            onChange={(e) => setFormData({ ...formData, dict_name: e.target.value })}
            required
            placeholder="请输入字典名称"
          />
        </div>

        <div className="form-group">
          <label htmlFor="dict_type">
            字典类型 <span className="required">*</span>
          </label>
          <input
            type="text"
            id="dict_type"
            value={formData.dict_type}
            onChange={(e) => setFormData({ ...formData, dict_type: e.target.value })}
            required
            placeholder="例如: sys_user_status"
          />
        </div>

        <div className="form-group">
          <label htmlFor="status">状态</label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as '启用' | '禁用' })}
          >
            <option value="启用">启用</option>
            <option value="禁用">禁用</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="remark">备注</label>
          <textarea
            id="remark"
            value={formData.remark}
            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            placeholder="请输入备注"
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-cancel">
            取消
          </button>
          <button type="submit" disabled={submitting} className="btn-submit">
            {submitting ? '提交中...' : '确定'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// 字典数据表单
interface DictDataFormModalProps {
  dictData: DictData | null;
  dictTypeId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function DictDataFormModal({ dictData, dictTypeId, onClose, onSuccess }: DictDataFormModalProps) {
  const [formData, setFormData] = useState<DictDataFormData>({
    dict_type_id: dictTypeId,
    dict_label: dictData?.dict_label || '',
    dict_value: dictData?.dict_value || '',
    sort_order: dictData?.sort_order || 0,
    status: dictData?.status || '启用',
    remark: dictData?.remark || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (dictData) {
        await dictService.updateDictData(dictData.id, formData);
      } else {
        await dictService.createDictData(formData);
      }
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={dictData ? '编辑字典数据' : '新建字典数据'} visible={true} onClose={onClose}>
      <form onSubmit={handleSubmit} className="dict-form">
        <div className="form-group">
          <label htmlFor="dict_label">
            字典标签 <span className="required">*</span>
          </label>
          <input
            type="text"
            id="dict_label"
            value={formData.dict_label}
            onChange={(e) => setFormData({ ...formData, dict_label: e.target.value })}
            required
            placeholder="请输入字典标签"
          />
        </div>

        <div className="form-group">
          <label htmlFor="dict_value">
            字典值 <span className="required">*</span>
          </label>
          <input
            type="text"
            id="dict_value"
            value={formData.dict_value}
            onChange={(e) => setFormData({ ...formData, dict_value: e.target.value })}
            required
            placeholder="请输入字典值"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="sort_order">排序</label>
            <input
              type="number"
              id="sort_order"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              placeholder="数字越小越靠前"
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">状态</label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as '启用' | '禁用' })}
            >
              <option value="启用">启用</option>
              <option value="禁用">禁用</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="remark">备注</label>
          <textarea
            id="remark"
            value={formData.remark}
            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            placeholder="请输入备注"
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-cancel">
            取消
          </button>
          <button type="submit" disabled={submitting} className="btn-submit">
            {submitting ? '提交中...' : '确定'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
