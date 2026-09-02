import React, { useState } from 'react';
import {
  PlusCircle,
  Trash2,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/data-table/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';
import { PaymentTransaction, DebtRecord } from '../../types';
import { formatDZD, formatDateArabic } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';

export interface PaymentsProps {
  isRecordModalOpenInitially?: boolean;
  onCloseRecordModalInitially?: () => void;
}

export const Payments: React.FC<PaymentsProps> = ({
  isRecordModalOpenInitially = false,
  onCloseRecordModalInitially,
}) => {
  const { success } = useToast();
  const { transactions, debts, courses, recordPayment, deleteTransaction } = useData();

  const [activeTab, setActiveTab] = useState<'transactions' | 'debts'>('transactions');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all_time');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(isRecordModalOpenInitially);
  const [txToDelete, setTxToDelete] = useState<PaymentTransaction | null>(null);

  // Record Payment Form (Cash only)
  const [studentName, setStudentName] = useState('');
  const [courseTitle, setCourseTitle] = useState(courses[0]?.title || 'دورة تعليمية');
  const [amount, setAmount] = useState('6000');
  const [notes, setNotes] = useState('');
  const [targetedDebtStudentId, setTargetedDebtStudentId] = useState<string | undefined>(undefined);

  // Period filtering logic
  const filteredTransactions = transactions.filter((tx) => {
    if (selectedPeriod === 'all_time') return true;

    const txDate = new Date(tx.date);
    const now = new Date();

    if (selectedPeriod === 'this_month') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    if (selectedPeriod === 'last_month') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return txDate.getMonth() === prevMonth.getMonth() && txDate.getFullYear() === prevMonth.getFullYear();
    }
    if (selectedPeriod === 'this_year') {
      return txDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const periodRevenue = filteredTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !amount) return;

    const newTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      receiptNumber: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: targetedDebtStudentId || `std-${Date.now()}`,
      studentName: studentName.trim(),
      courseTitle,
      amount: Number(amount) || 5000,
      paymentMethod: 'cash', // Only Cash
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      recordedBy: 'إدارة المؤسسة',
      notes,
    };

    recordPayment(newTx, targetedDebtStudentId);
    setIsRecordModalOpen(false);
    if (onCloseRecordModalInitially) onCloseRecordModalInitially();
    success(`تم تسجيل عملية الدفع نقداً بنجاح وتسجيل السند ${newTx.receiptNumber}`, 'تمت العملية');

    setStudentName('');
    setNotes('');
    setTargetedDebtStudentId(undefined);
  };

  const confirmDeleteTransaction = () => {
    if (!txToDelete) return;
    deleteTransaction(txToDelete.id);
    success(`تم حذف سند الدفع رقم "${txToDelete.receiptNumber}" بنجاح.`);
    setTxToDelete(null);
  };

  const txColumns: Column<PaymentTransaction>[] = [
    {
      key: 'receiptNumber',
      header: 'رقم الإيصال',
      sortable: true,
      render: (tx) => (
        <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
          {tx.receiptNumber}
        </span>
      ),
    },
    {
      key: 'studentName',
      header: 'اسم التلميذ والفوج',
      sortable: true,
      render: (tx) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{tx.studentName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{tx.courseTitle}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'المبلغ المقبوض',
      sortable: true,
      render: (tx) => (
        <span style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.9375rem' }}>
          {formatDZD(tx.amount)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'طريقة الدفع',
      render: () => (
        <Badge variant="success">نقداً (Cash)</Badge>
      ),
    },
    {
      key: 'date',
      header: 'تاريخ العملية',
      sortable: true,
      render: (tx) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {formatDateArabic(tx.date)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      width: '100px',
      render: (tx) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            title="حذف سند الدفع"
            onClick={() => setTxToDelete(tx)}
            style={{ color: 'var(--color-danger)' }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  const debtColumns: Column<DebtRecord>[] = [
    {
      key: 'studentName',
      header: 'اسم التلميذ',
      sortable: true,
      render: (d) => (
        <div>
          <div style={{ fontWeight: 600 }}>{d.studentName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{d.studentPhone}</div>
        </div>
      ),
    },
    {
      key: 'courseTitle',
      header: 'الدورة / فوج الدعم',
      render: (d) => <span style={{ fontSize: '0.8125rem' }}>{d.courseTitle}</span>,
    },
    {
      key: 'totalAmount',
      header: 'المبلغ الإجمالي',
      render: (d) => <span>{formatDZD(d.totalAmount)}</span>,
    },
    {
      key: 'remainingAmount',
      header: 'المبلغ المتبقي (المتأخر)',
      sortable: true,
      render: (d) => (
        <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>
          {formatDZD(d.remainingAmount)}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'تاريخ الاستحقاق',
      sortable: true,
      render: (d) => <span style={{ fontSize: '0.8125rem' }}>{formatDateArabic(d.dueDate)}</span>,
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (d) => (
        <Badge variant={d.status === 'overdue' ? 'danger' : 'warning'}>
          {d.status === 'overdue' ? 'متأخر' : 'غير مكتمل'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'تحصيل نقدي',
      width: '120px',
      render: (d) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setStudentName(d.studentName);
            setCourseTitle(d.courseTitle);
            setAmount(String(d.remainingAmount));
            setTargetedDebtStudentId(d.studentId);
            setIsRecordModalOpen(true);
          }}
        >
          تسديد نقداً
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="سجل المدفوعات وسندات القبض"
        description="تسجيل عمليات الدفع نقداً، متابعة المداخيل، وإمكانية حذف السجلات"
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              options={[
                { value: 'all_time', label: 'كل الفترات (الإجمالي العام)' },
                { value: 'this_month', label: 'الشهر الحالي' },
                { value: 'last_month', label: 'الشهر الماضي' },
                { value: 'this_year', label: 'السنة الحالية 2026' },
              ]}
            />

            <Button
              variant="primary"
              rightIcon={<PlusCircle size={16} />}
              onClick={() => {
                if (courses.length > 0) {
                  setCourseTitle(courses[0].title);
                }
                setIsRecordModalOpen(true);
              }}
            >
              + تسجيل عملية دفع نقداً
            </Button>
          </div>
        }
      />

      {/* Revenue Summary Ribbon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3-5) var(--space-5)',
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-6)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              minHeight: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              إجمالي الإيرادات المقبوضة ({selectedPeriod === 'this_month' ? 'الشهر الحالي' : selectedPeriod === 'last_month' ? 'الشهر الماضي' : selectedPeriod === 'this_year' ? 'السنة الحالية' : 'كل الأوقات'})
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {formatDZD(periodRevenue)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
          <span>طريقة الدفع المعتمدة: <strong>نقداً (Cash Only)</strong></span>
          <span>•</span>
          <span>عدد العمليات: <strong>{filteredTransactions.length} عملية</strong></span>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-5)',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            padding: 'var(--space-2-5) var(--space-4)',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'transactions' ? 600 : 500,
            color: activeTab === 'transactions' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'transactions' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: 'var(--size-touch-min)',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            whiteSpace: 'nowrap',
          }}
        >
          سجل المدفوعات المقبوضة ({filteredTransactions.length})
        </button>

        <button
          onClick={() => setActiveTab('debts')}
          style={{
            padding: 'var(--space-2-5) var(--space-4)',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'debts' ? 600 : 500,
            color: activeTab === 'debts' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'debts' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1-5)',
            minHeight: 'var(--size-touch-min)',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            whiteSpace: 'nowrap',
          }}
        >
          <span>المتأخرات والديون</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
            }}
          >
            {debts.length}
          </span>
        </button>
      </div>

      {activeTab === 'transactions' ? (
        <DataTable
          data={filteredTransactions}
          columns={txColumns}
          keyExtractor={(t) => t.id}
          searchPlaceholder="ابحث برقم الإيصال أو اسم التلميذ..."
          searchFields={['receiptNumber', 'studentName', 'courseTitle']}
        />
      ) : (
        <DataTable
          data={debts}
          columns={debtColumns}
          keyExtractor={(d) => d.id}
          searchPlaceholder="ابحث باسم التلميذ أو رقم الهاتف..."
          searchFields={['studentName', 'studentPhone', 'courseTitle']}
        />
      )}

      {/* Record Payment Modal (Cash Only) */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setTargetedDebtStudentId(undefined);
          if (onCloseRecordModalInitially) onCloseRecordModalInitially();
        }}
        title="تسجيل عملية دفع نقداً (Cash)"
        description="تسجيل قسط أو دفع كامل نقدًا وإصدار سند قبض للمؤسسة"
      >
        <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="اسم التلميذ الكامل"
            placeholder="مثال: أمين بن علي"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="الدورة أو فوج الدعم"
            placeholder="مثال: مراجعة الرياضيات BAC"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="المبلغ المسدد نقداً (دج DZD)"
              type="number"
              placeholder="6000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="form-group">
              <label className="form-label">طريقة الدفع</label>
              <div
                style={{
                  height: 'var(--height-input)',
                  minHeight: 'var(--height-input)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 var(--space-3)',
                  backgroundColor: 'var(--color-bg-surface-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  boxSizing: 'border-box',
                }}
              >
                💵 نقداً (Cash)
              </div>
            </div>
          </div>

          <Input
            label="ملاحظات السند (اختياري)"
            placeholder="مثال: اشتراك شهر سبتمبر أو قسط أول"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: 'var(--space-2)' }}>
            <Button type="submit" variant="primary">
              تأكيد الدفع وتسجيل السند
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsRecordModalOpen(false);
                setTargetedDebtStudentId(undefined);
                if (onCloseRecordModalInitially) onCloseRecordModalInitially();
              }}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Transaction Modal */}
      <Modal
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        title="تأكيد حذف سند الدفع"
        description="هل أنت متأكد من رغبتك في حذف هذا الإيصال وسجل الدفع نهائياً؟"
        maxWidth="440px"
        footer={
          <>
            <Button variant="danger" onClick={confirmDeleteTransaction}>
              نعم، حذف السند
            </Button>
            <Button variant="secondary" onClick={() => setTxToDelete(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        {txToDelete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)' }}>
            <AlertTriangle size={24} color="var(--color-danger)" />
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              سيتم حذف سند الدفع <strong>{txToDelete.receiptNumber}</strong> بمبلغ <strong>{formatDZD(txToDelete.amount)}</strong> للتلميذ ({txToDelete.studentName}).
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
