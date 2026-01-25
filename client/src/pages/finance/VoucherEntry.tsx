import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeService, Subject, VoucherItem } from '../../services/finance';
import { useAuth } from '../../hooks/useAuth';
import '../system/Students.css';
import './VoucherEntry.css';

interface VoucherItemForm extends VoucherItem {
  key: number;
}

export default function VoucherEntry() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<VoucherItemForm[]>([
    { key: 1, entry_type: '借', subject_code: '', amount: '', summary: '' },
    { key: 2, entry_type: '贷', subject_code: '', amount: '', summary: '' }
  ]);
  const [nextKey, setNextKey] = useState(3);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await financeService.getSubjects({ is_active: 'true' });
      if (response.data) {
        setSubjects(response.data);
      }
    } catch (error) {
      console.error('获取科目列表失败:', error);
    }
  };

  // 计算借贷合计
  const totals = useMemo(() => {
    const debit = items
      .filter(i => i.entry_type === '借')
      .reduce((sum, i) => sum + (parseFloat(String(i.amount)) || 0), 0);
    const credit = items
      .filter(i => i.entry_type === '贷')
      .reduce((sum, i) => sum + (parseFloat(String(i.amount)) || 0), 0);
    return {
      debit,
      credit,
      diff: Math.abs(debit - credit),
      isBalanced: Math.abs(debit - credit) < 0.001 && debit > 0
    };
  }, [items]);

  const handleAddItem = (type: '借' | '贷') => {
    setItems([...items, {
      key: nextKey,
      entry_type: type,
      subject_code: '',
      amount: '',
      summary: ''
    }]);
    setNextKey(nextKey + 1);
  };

  const handleRemoveItem = (key: number) => {
    if (items.length <= 2) {
      alert('凭证至少需要两条分录');
      return;
    }
    setItems(items.filter(item => item.key !== key));
  };

  const handleItemChange = (key: number, field: keyof VoucherItemForm, value: any) => {
    setItems(items.map(item => 
      item.key === key ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!voucherDate) {
      alert('请选择记账日期');
      return;
    }

    // 检查所有分录是否填写完整
    for (const item of items) {
      if (!item.subject_code) {
        alert('请选择所有分录的会计科目');
        return;
      }
      if (!item.amount || parseFloat(String(item.amount)) <= 0) {
        alert('请填写有效的金额（必须大于0）');
        return;
      }
    }

    // 检查借贷平衡
    if (!totals.isBalanced) {
      alert(`借贷不平衡！借方: ¥${totals.debit.toFixed(2)}，贷方: ¥${totals.credit.toFixed(2)}，差额: ¥${totals.diff.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const response = await financeService.createVoucher({
        voucher_date: voucherDate,
        description,
        creator_id: user?.id,
        creator_name: user?.realName || user?.username,
        items: items.map(({ key, ...rest }) => ({
          ...rest,
          amount: parseFloat(String(rest.amount))
        }))
      });

      if (response.data) {
        alert(`凭证创建成功！凭证号: ${response.data.voucher_no}`);
        // 重置表单
        setDescription('');
        setItems([
          { key: nextKey, entry_type: '借', subject_code: '', amount: '', summary: '' },
          { key: nextKey + 1, entry_type: '贷', subject_code: '', amount: '', summary: '' }
        ]);
        setNextKey(nextKey + 2);
      }
    } catch (error: any) {
      console.error('创建凭证失败:', error);
      alert(error.message || '创建凭证失败');
    } finally {
      setLoading(false);
    }
  };

  const getSubjectName = (code: string) => {
    const subject = subjects.find(s => s.subject_code === code);
    return subject ? subject.subject_name : '';
  };

  return (
    <div className="students-page">
      <div className="page-header">
        <h1>凭证录入</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/finance/vouchers')} className="btn btn-default">
            返回列表
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="voucher-form">
        <div className="voucher-header">
          <div className="form-row">
            <div className="form-group">
              <label>记账日期 *</label>
              <input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>摘要</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入凭证摘要"
              />
            </div>
          </div>
        </div>

        <div className="voucher-items">
          <table className="voucher-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>借/贷</th>
                <th style={{ width: '200px' }}>会计科目</th>
                <th>摘要</th>
                <th style={{ width: '150px' }}>借方金额</th>
                <th style={{ width: '150px' }}>贷方金额</th>
                <th style={{ width: '80px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key}>
                  <td>
                    <select
                      value={item.entry_type}
                      onChange={(e) => handleItemChange(item.key, 'entry_type', e.target.value)}
                      className="entry-type-select"
                    >
                      <option value="借">借</option>
                      <option value="贷">贷</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={item.subject_code}
                      onChange={(e) => handleItemChange(item.key, 'subject_code', e.target.value)}
                      className="subject-select"
                    >
                      <option value="">请选择科目</option>
                      {subjects.map(subject => (
                        <option key={subject.subject_code} value={subject.subject_code}>
                          {subject.subject_code} - {subject.subject_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.summary || ''}
                      onChange={(e) => handleItemChange(item.key, 'summary', e.target.value)}
                      placeholder="分录摘要"
                      className="summary-input"
                    />
                  </td>
                  <td>
                    {item.entry_type === '借' ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.amount}
                        onChange={(e) => handleItemChange(item.key, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="amount-input debit"
                      />
                    ) : (
                      <span className="empty-cell">-</span>
                    )}
                  </td>
                  <td>
                    {item.entry_type === '贷' ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.amount}
                        onChange={(e) => handleItemChange(item.key, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="amount-input credit"
                      />
                    ) : (
                      <span className="empty-cell">-</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.key)}
                      className="btn btn-danger btn-sm"
                      disabled={items.length <= 2}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan={3} style={{ textAlign: 'right', paddingRight: '20px' }}>
                  <strong>合计</strong>
                </td>
                <td className="total-debit">
                  ¥{totals.debit.toFixed(2)}
                </td>
                <td className="total-credit">
                  ¥{totals.credit.toFixed(2)}
                </td>
                <td></td>
              </tr>
              {!totals.isBalanced && totals.debit > 0 && (
                <tr className="balance-warning">
                  <td colSpan={6} style={{ color: '#ff4d4f', textAlign: 'center' }}>
                    借贷不平衡！差额: ¥{totals.diff.toFixed(2)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>

          <div className="item-actions">
            <button type="button" onClick={() => handleAddItem('借')} className="btn btn-info">
              + 添加借方
            </button>
            <button type="button" onClick={() => handleAddItem('贷')} className="btn btn-success">
              + 添加贷方
            </button>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: '20px' }}>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !totals.isBalanced}
          >
            {loading ? '保存中...' : '保存凭证'}
          </button>
        </div>
      </form>
    </div>
  );
}
