import { useState, useEffect, useMemo } from 'react';
import { studentService } from '../../services/student';
import { classTypeService } from '../../services/payment';
import { coachService } from '../../services/coach';
import { Student, StudentFormData, EnrollmentStatus, LicenseType } from '../../types/student';
import { ClassType } from '../../types/payment';
import { Coach } from '../../types/coach';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { useDict } from '../../hooks/useDict';
import { ColumnDef } from '@tanstack/react-table';
import './Students.css';

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [coachFilter, setCoachFilter] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { limit, offset, total, setTotal, page, pages, setPage, setLimit } = usePagination();
  
  // 使用字典获取报名状态选项
  const { options: enrollmentStatusOptions } = useDict('enrollment_status');

  useEffect(() => {
    fetchStudents();
  }, [limit, offset, statusFilter, coachFilter, dateStart, dateEnd]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentService.getStudents({
        limit,
        offset,
        keyword,
        status: statusFilter as any,
        coach_name: coachFilter,
        enrollment_date_start: dateStart,
        enrollment_date_end: dateEnd,
        sortBy: 'id',
        sortOrder: 'desc'
      });
      setStudents(response.data!.list);
      setTotal(response.data!.pagination.total);
    } catch (error) {
      console.error('获取学员列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchStudents();
  };

  const handleReset = async () => {
    setKeyword('');
    setStatusFilter('');
    setCoachFilter('');
    setDateStart('');
    setDateEnd('');
    setPage(1);
    
    // 使用清空的参数直接调用API
    setLoading(true);
    try {
      const response = await studentService.getStudents({
        limit,
        offset: 0,
        keyword: '',
        status: '' as any,
        coach_name: '',
        enrollment_date_start: '',
        enrollment_date_end: '',
        sortBy: 'id',
        sortOrder: 'desc'
      });
      setStudents(response.data!.list);
      setTotal(response.data!.pagination.total);
    } catch (error) {
      console.error('获取学员列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingStudent(null);
    setShowModal(true);
  };

  const handleView = (student: Student) => {
    setViewingStudent(student);
    setShowViewModal(true);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await studentService.deleteStudent(deleteId);
      fetchStudents();
      setDeleteId(null);
    } catch (error) {
      console.error('删除学员失败:', error);
      alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const columns: ColumnDef<Student, any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'name',
      header: '姓名',
      size: 100,
    },
    {
      accessorKey: 'phone',
      header: '手机号',
      size: 120,
    },
    {
      accessorKey: 'gender',
      header: '性别',
      size: 60,
    },
    {
      accessorKey: 'age',
      header: '年龄',
      size: 60,
    },
    {
      id: 'class_type',
      header: '报名班型',
      size: 120,
      cell: ({ row }) => {
        const record = row.original;
        return record.class_type_name || '-';
      },
    },
    {
      accessorKey: 'status',
      header: '报名状态',
      size: 120,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        const statusClass = value === '报名已缴费' ? 'status-success' : 
                           value === '已退费' ? 'status-danger' :
                           value === '报名部分缴费' || value === '报名未缴费' ? 'status-active' : 
                           'status-inactive';
        return <span className={`status-tag ${statusClass}`}>{value}</span>;
      },
    },
    {
      accessorKey: 'enrollment_date',
      header: '报名日期',
      size: 110,
    },
    {
      accessorKey: 'coach_name',
      header: '所属教练',
      size: 100,
    },
    {
      id: 'actions',
      header: '操作',
      size: 200,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="table-actions">
            <button onClick={() => handleView(record)} className="btn-view">
              查看
            </button>
            <button onClick={() => handleEdit(record)} className="btn-edit">
              编辑
            </button>
            <button onClick={() => setDeleteId(record.id)} className="btn-delete">
              删除
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="students-page">
      <div className="page-header">
        <h2>学员基本信息</h2>
        <button onClick={handleAdd} className="btn-primary">
          新建学员
        </button>
      </div>

      <div className="search-panel">
        <div className="search-row">
          <input
            type="text"
            placeholder="搜索姓名、身份证号、手机号"
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
            <option value="">全部状态</option>
            {enrollmentStatusOptions.map(opt => (
              <option key={opt.dict_value} value={opt.dict_value}>{opt.dict_label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="教练姓名"
            value={coachFilter}
            onChange={(e) => setCoachFilter(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="search-row">
          <label>报名日期：</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="date-input"
          />
          <span>至</span>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="date-input"
          />
          
          <button onClick={handleSearch} className="btn btn-primary">
            查询
          </button>
          <button 
            onClick={handleReset}
            className="btn btn-secondary"
          >
            重置
          </button>
        </div>
      </div>

      <Table
        data={students}
        columns={columns}
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

      {showModal && (
        <StudentFormModal
          student={editingStudent}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchStudents();
          }}
        />
      )}

      {showViewModal && viewingStudent && (
        <StudentViewModal
          student={viewingStudent}
          onClose={() => setShowViewModal(false)}
        />
      )}

      <ConfirmDialog
        visible={!!deleteId}
        title="确认删除"
        message="确定要删除这个学员吗？删除后无法恢复。"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

interface StudentFormModalProps {
  student: Student | null;
  onClose: () => void;
  onSuccess: () => void;
}

function StudentFormModal({ student, onClose, onSuccess }: StudentFormModalProps) {
  // 身份证号解析籍贯的映射表（前6位行政区划代码）
  const getRegionFromIdCard = (idCard: string): string => {
    if (idCard.length < 6) return '';
    const provinceCode = idCard.substring(0, 2);
    
    const provinceMap: Record<string, string> = {
      '11': '北京', '12': '天津', '13': '河北', '14': '山西', '15': '内蒙古',
      '21': '辽宁', '22': '吉林', '23': '黑龙江',
      '31': '上海', '32': '江苏', '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
      '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西', '46': '海南',
      '50': '重庆', '51': '四川', '52': '贵州', '53': '云南', '54': '西藏',
      '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏', '65': '新疆',
      '71': '台湾', '81': '香港', '82': '澳门'
    };
    
    return provinceMap[provinceCode] || '';
  };

  // 从身份证号提取出生日期
  const getBirthDateFromIdCard = (idCard: string): string => {
    if (idCard.length < 14) return '';
    const year = idCard.substring(6, 10);
    const month = idCard.substring(10, 12);
    const day = idCard.substring(12, 14);
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<StudentFormData>({
    name: student?.name || '',
    id_card: student?.id_card || '',
    phone: student?.phone || '',
    gender: student?.gender || '男',
    address: student?.address || '',
    native_place: student?.native_place || '',
    status: student?.status || '报名未缴费',
    enrollment_date: student?.enrollment_date 
      ? student.enrollment_date.split('T')[0]
      : '',
    medical_history: student?.medical_history || '',
    has_driving_experience: student?.has_driving_experience || '无',
    driving_years: student?.driving_years || 0,
    previous_school_history: student?.previous_school_history || '',
    emergency_contact: student?.emergency_contact || '',
    emergency_phone: student?.emergency_phone || '',
    coach_id: student?.coach_id,
    coach_name: student?.coach_name || '',
    coach_subject2_name: student?.coach_subject2_name || '',
    coach_subject3_name: student?.coach_subject3_name || '',
    license_type: student?.license_type || 'C1'
  });
  const [birthDate, setBirthDate] = useState<string>(student?.birth_date || '');
  const [submitting, setSubmitting] = useState(false);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedClassType, setSelectedClassType] = useState<number | null>(student?.class_type_id || null);

  // 使用字典获取下拉选项
  const { options: licenseTypeOptions } = useDict('license_type');
  const { options: drivingExpOptions } = useDict('driving_experience');
  const { options: enrollmentStatusOptions } = useDict('enrollment_status');
  
  // 可手动编辑的报名状态列表（从字典获取并过滤）
  const editableStatusOptions = useMemo(() => {
    const options = enrollmentStatusOptions.filter(opt => 
      ['咨询中', '预约报名', '报名未缴费'].includes(opt.dict_value)
    );
    // 如果编辑学员且其当前状态不在可选列表中（可能已被禁用），添加当前状态选项以便正确显示
    if (student?.status && !options.some(opt => opt.dict_value === student.status)) {
      options.unshift({ 
        id: -1, 
        dict_type: 'enrollment_status', 
        dict_value: student.status, 
        dict_label: student.status, 
        sort_order: 0, 
        status: '禁用',
        created_at: '',
        updated_at: ''
      });
    }
    return options;
  }, [enrollmentStatusOptions, student?.status]);

  useEffect(() => {
    fetchClassTypes();
    fetchCoaches();
  }, []);

  const fetchClassTypes = async () => {
    try {
      const response = await classTypeService.getEnabledClassTypes();
      setClassTypes(response.data || []);
    } catch (error) {
      console.error('获取班型列表失败:', error);
    }
  };

  const fetchCoaches = async () => {
    try {
      const response = await coachService.getCoaches({
        limit: 1000,
        offset: 0,
        status: '在职'
      });
      setCoaches(response.data?.list || []);
    } catch (error) {
      console.error('获取教练列表失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 验证报名班型是否已选择
      if (!selectedClassType) {
        alert('请选择报名班型');
        setSubmitting(false);
        return;
      }

      // 当报名状态为"报名未缴费"时，报名日期和驾照类型必填
      if (formData.status === '报名未缴费') {
        if (!formData.enrollment_date) {
          alert('报名状态为"报名未缴费"时，报名日期为必填项');
          setSubmitting(false);
          return;
        }
        if (!formData.license_type) {
          alert('报名状态为"报名未缴费"时，驾照类型为必填项');
          setSubmitting(false);
          return;
        }
      }

      // 直接使用表单中的日期字符串，不进行时区转换
      const submitData = {
        ...formData,
        enrollment_date: formData.enrollment_date || '',
        class_type_id: selectedClassType
      };

      if (student?.id) {
        await studentService.updateStudent(student.id, submitData);
      } else {
        await studentService.createStudent(submitData);
      }
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={student?.id ? '编辑学员' : '新建学员'}
      visible={true}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="student-form">
        <div className="form-section">
          <h3>基本信息</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">
                姓名 <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="请输入姓名"
              />
            </div>

            <div className="form-group">
              <label htmlFor="id_card">
                身份证号 <span className="required">*</span>
              </label>
              <input
                type="text"
                id="id_card"
                value={formData.id_card}
                onChange={(e) => {
                  const idCard = e.target.value;
                  setFormData({ ...formData, id_card: idCard });
                  
                  // 根据身份证号自动设置性别（第17位，奇数为男，偶数为女）
                  if (idCard.length === 18) {
                    const genderCode = parseInt(idCard[16]);
                    const gender = genderCode % 2 === 1 ? '男' : '女';
                    const nativePlace = getRegionFromIdCard(idCard);
                    const birth = getBirthDateFromIdCard(idCard);
                    setFormData(prev => ({ ...prev, id_card: idCard, gender, native_place: nativePlace }));
                    setBirthDate(birth);
                  }
                }}
                required
                maxLength={18}
                placeholder="请输入18位身份证号"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">
                手机号 <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                maxLength={11}
                placeholder="请输入手机号"
              />
            </div>

            <div className="form-group">
              <label htmlFor="gender">
                性别 <span className="required">*</span>
              </label>
              <input
                type="text"
                id="gender"
                value={formData.gender}
                readOnly
                disabled
                className="readonly-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="address">现住址</label>
              <input
                type="text"
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="请输入现住址"
              />
            </div>

            <div className="form-group">
              <label htmlFor="native_place">籍贯</label>
              <input
                type="text"
                id="native_place"
                value={formData.native_place}
                readOnly
                disabled
                className="readonly-input"
                placeholder="根据身份证号自动填充"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="birth_date">出生日期</label>
              <input
                type="date"
                id="birth_date"
                value={birthDate}
                readOnly
                disabled
                className="readonly-input"
              />
            </div>

            <div className="form-group">
              {/* 占位，保持布局 */}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>报名信息</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="class_type">
                报名班型 <span className="required">*</span>
              </label>
              <select
                id="class_type"
                value={selectedClassType || ''}
                onChange={(e) => setSelectedClassType(e.target.value ? parseInt(e.target.value) : null)}
                required
              >
                <option value="">请选择班型</option>
                {classTypes.map((classType) => (
                  <option key={classType.id} value={classType.id}>
                    {classType.name} - ¥{parseFloat(String(classType.contract_amount)).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="license_type">
                驾照类型 {formData.status === '报名未缴费' && <span className="required">*</span>}
              </label>
              <select
                id="license_type"
                value={formData.license_type || 'C1'}
                onChange={(e) => setFormData({ ...formData, license_type: e.target.value as LicenseType })}
                required={formData.status === '报名未缴费'}
                disabled={!!(student?.id && student.status === '报名未缴费')}
                style={student?.id && student.status === '报名未缴费' ? { backgroundColor: '#f5f7fa', color: '#909399', cursor: 'not-allowed' } : undefined}
                title={student?.id && student.status === '报名未缴费' ? '报名后驾照类型不可修改' : undefined}
              >
                {licenseTypeOptions.map(opt => (
                  <option key={opt.dict_value} value={opt.dict_value}>{opt.dict_label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">报名状态</label>
              {/* 已产生缴费行为的学员，报名状态不可手动修改 */}
              {/* 已报名（报名未缴费）的学员，报名状态也不可手动修改 */}
              {(student && student.payment_status && student.payment_status !== '未缴费') || 
               (student?.id && student.status === '报名未缴费') ? (
                <input
                  type="text"
                  id="status"
                  value={formData.status}
                  disabled
                  style={{ backgroundColor: '#f5f7fa', color: '#909399', cursor: 'not-allowed' }}
                  title={student?.payment_status !== '未缴费' 
                    ? '已产生缴费记录，报名状态由缴费状态自动同步，不可手动修改' 
                    : '已完成报名，报名状态不可修改'}
                />
              ) : (
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as EnrollmentStatus })}
                >
                  {editableStatusOptions.map((opt) => (
                    <option key={opt.dict_value} value={opt.dict_value}>{opt.dict_label}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="enrollment_date">
                报名日期 {formData.status === '报名未缴费' && <span className="required">*</span>}
              </label>
              <input
                type="date"
                id="enrollment_date"
                value={formData.enrollment_date}
                onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
                required={formData.status === '报名未缴费'}
                disabled={!!(student?.id && student.status === '报名未缴费')}
                style={student?.id && student.status === '报名未缴费' ? { backgroundColor: '#f5f7fa', color: '#909399', cursor: 'not-allowed' } : undefined}
                title={student?.id && student.status === '报名未缴费' ? '报名后报名日期不可修改' : undefined}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="coach_name">所属教练</label>
              <select
                id="coach_name"
                value={formData.coach_name}
                onChange={(e) => setFormData({ ...formData, coach_name: e.target.value })}
              >
                <option value="">请选择教练</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.name}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="coach_subject2_name">科二教学教练</label>
              <select
                id="coach_subject2_name"
                value={formData.coach_subject2_name}
                onChange={(e) => setFormData({ ...formData, coach_subject2_name: e.target.value })}
              >
                <option value="">请选择教练</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.name}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="coach_subject3_name">科三教学教练</label>
              <select
                id="coach_subject3_name"
                value={formData.coach_subject3_name}
                onChange={(e) => setFormData({ ...formData, coach_subject3_name: e.target.value })}
              >
                <option value="">请选择教练</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.name}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              {/* 占位 */}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>其他信息</h3>
          
          <div className="form-group">
            <label htmlFor="medical_history">既往病史</label>
            <textarea
              id="medical_history"
              value={formData.medical_history}
              onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
              placeholder="请输入既往病史"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="has_driving_experience">驾驶经历</label>
              <select
                id="has_driving_experience"
                value={formData.has_driving_experience}
                onChange={(e) => setFormData({ ...formData, has_driving_experience: e.target.value as any })}
              >
                {drivingExpOptions.map(opt => (
                  <option key={opt.dict_value} value={opt.dict_value}>{opt.dict_label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="driving_years">曾驾驶年限</label>
              <input
                type="number"
                id="driving_years"
                value={formData.driving_years}
                onChange={(e) => setFormData({ ...formData, driving_years: parseInt(e.target.value) || 0 })}
                min="0"
                placeholder="年"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="previous_school_history">他校学习过往</label>
            <textarea
              id="previous_school_history"
              value={formData.previous_school_history}
              onChange={(e) => setFormData({ ...formData, previous_school_history: e.target.value })}
              placeholder="请输入他校学习过往"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="emergency_contact">紧急联系人</label>
              <input
                type="text"
                id="emergency_contact"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                placeholder="请输入紧急联系人"
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergency_phone">紧急联系电话</label>
              <input
                type="tel"
                id="emergency_phone"
                value={formData.emergency_phone}
                onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                maxLength={11}
                placeholder="请输入联系电话"
              />
            </div>
          </div>
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

interface StudentViewModalProps {
  student: Student;
  onClose: () => void;
}

function StudentViewModal({ student, onClose }: StudentViewModalProps) {
  return (
    <Modal
      title="学员详情"
      visible={true}
      onClose={onClose}
    >
      <div className="student-detail">
        <div className="detail-section">
          <h3>基本信息</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>姓名：</label>
              <span>{student.name}</span>
            </div>
            <div className="detail-item">
              <label>身份证号：</label>
              <span>{student.id_card}</span>
            </div>
            <div className="detail-item">
              <label>手机号：</label>
              <span>{student.phone}</span>
            </div>
            <div className="detail-item">
              <label>性别：</label>
              <span>{student.gender}</span>
            </div>
            <div className="detail-item">
              <label>出生日期：</label>
              <span>{student.birth_date || '-'}</span>
            </div>
            <div className="detail-item">
              <label>年龄：</label>
              <span>{student.age}岁</span>
            </div>
            <div className="detail-item">
              <label>籍贯：</label>
              <span>{student.native_place || '-'}</span>
            </div>
            <div className="detail-item">
              <label>现住址：</label>
              <span>{student.address || '-'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>报名信息</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>报名班型：</label>
              <span>{student.class_type_name || '-'}</span>
            </div>
            <div className="detail-item">
              <label>报名状态：</label>
              <span className="status-tag">{student.status}</span>
            </div>
            <div className="detail-item">
              <label>报名日期：</label>
              <span>{student.enrollment_date || '-'}</span>
            </div>
            <div className="detail-item">
              <label>所属教练：</label>
              <span>{student.coach_name || '-'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>其他信息</h3>
          <div className="detail-grid">
            <div className="detail-item full-width">
              <label>既往病史：</label>
              <span>{student.medical_history || '-'}</span>
            </div>
            <div className="detail-item">
              <label>驾驶经历：</label>
              <span>{student.has_driving_experience}</span>
            </div>
            <div className="detail-item">
              <label>驾驶年限：</label>
              <span>{student.driving_years}年</span>
            </div>
            <div className="detail-item full-width">
              <label>学车经历：</label>
              <span>{student.previous_school_history || '-'}</span>
            </div>
            <div className="detail-item">
              <label>紧急联系人：</label>
              <span>{student.emergency_contact || '-'}</span>
            </div>
            <div className="detail-item">
              <label>紧急联系电话：</label>
              <span>{student.emergency_phone || '-'}</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-cancel">
            关闭
          </button>
        </div>
      </div>
    </Modal>
  );
}
