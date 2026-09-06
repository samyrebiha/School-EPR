import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Trash2,
  AlertTriangle,
  DollarSign,
  Printer,
  BadgeCheck,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/data-table/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';
import { PaymentTransaction, DebtRecord, Expense, ExpenseCategory } from '../../types';
import { formatDZD, formatDateArabic } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

export interface PaymentsProps {
  isRecordModalOpenInitially?: boolean;
  onCloseRecordModalInitially?: () => void;
}

export const Payments: React.FC<PaymentsProps> = ({
  isRecordModalOpenInitially = false,
  onCloseRecordModalInitially,
}) => {
  const { success } = useToast();
  const { isReceptionMode } = useAuth();
  const {
    transactions,
    debts,
    expenses,
    courses,
    currentSchool,
    recordPayment,
    addDebt,
    deleteTransaction,
    deleteDebt,
    addExpense,
    deleteExpense,
  } = useData();

  const [activeTab, setActiveTab] = useState<'transactions' | 'registration_fees' | 'debts' | 'expenses'>('transactions');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all_time');
  const [debtFilter, setDebtFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(isRecordModalOpenInitially);
  const [txToDelete, setTxToDelete] = useState<PaymentTransaction | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<DebtRecord | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<PaymentTransaction | null>(null);
  const [paperSize, setPaperSize] = useState<'80mm' | 'A5'>('80mm');

  // Registration Fee (حقوق المدرسة 500 دج) State
  const [isRegFeeModalOpen, setIsRegFeeModalOpen] = useState(false);
  const [regStudentName, setRegStudentName] = useState('');
  const [regStudentPhone, setRegStudentPhone] = useState('');
  const currentCalendarYear = useMemo(() => new Date().getFullYear(), []);
  const academicYearOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    for (let i = 0; i <= 5; i++) {
      const y1 = currentCalendarYear + i;
      const y2 = y1 + 1;
      const val = `${y1}/${y2}`;
      list.push({
        value: val,
        label: i === 0 ? `${val} (الموسم الحالي)` : val,
      });
    }
    return list;
  }, [currentCalendarYear]);
  const [regAcademicYear, setRegAcademicYear] = useState(() => `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
  const [regAmount, setRegAmount] = useState('500');
  const [regNotes, setRegNotes] = useState('');
  const [simpleReceiptToPrint, setSimpleReceiptToPrint] = useState<PaymentTransaction | null>(null);

  // Manual Add Debt State
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtStudentName, setDebtStudentName] = useState('');
  const [debtStudentPhone, setDebtStudentPhone] = useState('');
  const [debtCourseTitle, setDebtCourseTitle] = useState(courses[0]?.title || 'دورة تعليمية');
  const [debtAmount, setDebtAmount] = useState('6000');
  const [debtDueDate, setDebtDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [debtSelectedStudentId, setDebtSelectedStudentId] = useState('');

  // Expense State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('salary');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseRecipient, setExpenseRecipient] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [expenseToPrint, setExpenseToPrint] = useState<Expense | null>(null);

  // Record Payment Form (Cash only)
  const [studentName, setStudentName] = useState('');
  const [courseTitle, setCourseTitle] = useState(courses[0]?.title || 'دورة تعليمية');
  const [amount, setAmount] = useState(String(courses[0]?.monthlyPrice || 6000));
  const [notes, setNotes] = useState('');
  const [targetedDebtStudentId, setTargetedDebtStudentId] = useState<string | undefined>(undefined);
  const [selectedStudentId, setSelectedStudentId] = useState('');

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

  // Registration fee filtering logic (حقوق المدرسة 500 دج)
  const isRegFeeTx = (t: PaymentTransaction) =>
    t.courseTitle?.includes('حقوق التسجيل') ||
    t.courseTitle?.includes('حقوق المدرسة') ||
    (t as any).feeCategory === 'registration_fee';

  const filteredRegistrationFees = transactions.filter(isRegFeeTx);
  const filteredCourseTransactions = filteredTransactions.filter((t) => !isRegFeeTx(t));

  // Expense filtering logic
  const filteredExpenses = expenses.filter((exp) => {
    if (selectedPeriod === 'all_time') return true;

    const expDate = new Date(exp.date);
    const now = new Date();

    if (selectedPeriod === 'this_month') {
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    }
    if (selectedPeriod === 'last_month') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return expDate.getMonth() === prevMonth.getMonth() && expDate.getFullYear() === prevMonth.getFullYear();
    }
    if (selectedPeriod === 'this_year') {
      return expDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const periodExpensesTotal = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const periodSalariesTotal = filteredExpenses.filter((e) => e.category === 'salary').reduce((acc, e) => acc + (e.amount || 0), 0);
  const periodUtilitiesTotal = filteredExpenses
    .filter((e) => e.category === 'electricity' || e.category === 'internet')
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  // Debt counts & filtering logic
  const activeDebtsCount = debts.filter((d) => d.status !== 'paid' && d.remainingAmount > 0).length;
  const paidDebtsCount = debts.filter((d) => d.status === 'paid' || d.remainingAmount <= 0).length;

  const filteredDebts = debts.filter((d) => {
    const isPaid = d.status === 'paid' || d.remainingAmount <= 0;
    if (debtFilter === 'unpaid') return !isPaid;
    if (debtFilter === 'paid') return isPaid;
    return true;
  });

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
    setSelectedStudentId('');
    setTargetedDebtStudentId(undefined);
  };

  const handleRecordRegistrationFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regStudentName.trim() || !regAmount) return;

    const amt = Number(regAmount) || 500;
    const phoneClean = regStudentPhone.trim();
    const newTx: PaymentTransaction = {
      id: `tx-reg-${Date.now()}`,
      receiptNumber: `REC-REG-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: `std-reg-${Date.now()}`,
      studentName: regStudentName.trim(),
      courseTitle: `حقوق التسجيل المدرسية (${regAcademicYear})`,
      amount: amt,
      paymentMethod: 'cash',
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      recordedBy: isReceptionMode ? 'مكتب الاستقبال' : 'إدارة المؤسسة',
      notes: phoneClean
        ? `الهاتف: ${phoneClean}${regNotes.trim() ? ` • ${regNotes.trim()}` : ''}`
        : (regNotes.trim() || 'تسديد حقوق التسجيل السنوية بالمدرسة'),
    };

    recordPayment(newTx);
    setIsRegFeeModalOpen(false);
    success(`تم تسجيل حقوق التسجيل السنوية للتلميذ "${regStudentName.trim()}" بقيمة ${formatDZD(amt)} بنجاح!`, 'تسجيل حقوق المدرسة');

    // Auto trigger simple receipt modal
    setSimpleReceiptToPrint(newTx);

    setRegStudentName('');
    setRegStudentPhone('');
    setRegAmount('500');
    setRegNotes('');
  };

  const handlePrintUltraSimpleReceipt = (tx: PaymentTransaction) => {
    const schoolName = currentSchool?.name || 'مدرستي التعليمية';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const phoneMatch = tx.notes?.match(/الهاتف:\s*([0-9\s]+)/);
    const phone = phoneMatch ? phoneMatch[1] : '';

    const matchYear = tx.courseTitle?.match(/\d{4}\s*[\/-]\s*\d{4}/);
    const seasonDisplay = matchYear ? matchYear[0].replace('/', ' / ') : regAcademicYear.replace('/', ' / ');

    const printWindow = window.open('', '_blank', 'width=380,height=520');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) للتمكن من طباعة الوصل.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>وصل حقوق التسجيل - ${tx.receiptNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 4mm;
          }
          body {
            font-family: 'Courier New', Courier, monospace, 'Cairo', Tahoma, sans-serif;
            margin: 0;
            padding: 8px;
            color: #000;
            background: #fff;
            direction: rtl;
            font-size: 13px;
            line-height: 1.4;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
          .total-box {
            font-size: 16px;
            font-weight: 900;
            text-align: center;
            padding: 8px 0;
            margin: 8px 0;
            border-top: 2px dashed #000;
            border-bottom: 2px dashed #000;
          }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 15px;">${schoolName}</div>
        <div class="center" style="font-size: 11px; margin-top: 2px;">وصل حقوق التسجيل السنوية</div>
        <div class="double-divider"></div>

        <div class="row">
          <span>رقم السند:</span>
          <span class="bold">${tx.receiptNumber}</span>
        </div>
        <div class="row">
          <span>التاريخ:</span>
          <span>${formatDateArabic(tx.date)} | ${timeStr}</span>
        </div>
        <div class="row">
          <span>اسم التلميذ:</span>
          <span class="bold" style="font-size: 13px;">${tx.studentName}</span>
        </div>
        ${phone ? `
        <div class="row">
          <span>الهاتف:</span>
          <span>${phone}</span>
        </div>` : ''}
        <div class="row">
          <span>الموسم الدراسي:</span>
          <span class="bold">${seasonDisplay}</span>
        </div>
        <div class="row">
          <span>طريقة الدفع:</span>
          <span>نقداً (Cash)</span>
        </div>

        <div class="total-box">
          المبلغ: ${(tx.amount || 500).toLocaleString('fr-DZ')} دج
        </div>

        <div class="center" style="font-size: 11px; color: #222; margin-top: 4px;">
          هذا السند يثبت تسديد حقوق المدرسة لكامل الموسم.
        </div>
        <div class="divider"></div>

        <div style="margin-top: 16px; display: flex; justify-content: space-between; font-size: 11px;">
          <span>ختم وتوقيع الاستقبال</span>
          <span>....................</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount) return;

    const amt = Number(expenseAmount) || 0;
    const newExp = addExpense({
      title: expenseTitle.trim(),
      category: expenseCategory,
      amount: amt,
      recipientName: expenseRecipient.trim() || undefined,
      date: expenseDate || new Date().toISOString().split('T')[0],
      paymentMethod: 'نقداً',
      notes: expenseNotes.trim() || undefined,
    });

    setIsExpenseModalOpen(false);
    success(`تم تسجيل المصروف بنجاح بسند رقم "${newExp.receiptNumber}" بقيمة ${formatDZD(amt)}`, 'تسجيل مصروف');

    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseRecipient('');
    setExpenseNotes('');
  };

  const handleRecordDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtStudentName.trim() || !debtAmount) return;

    const amt = Number(debtAmount) || 0;
    addDebt({
      studentId: debtSelectedStudentId || '',
      studentName: debtStudentName.trim(),
      studentPhone: debtStudentPhone.trim() || '0550 00 00 00',
      courseTitle: debtCourseTitle,
      totalAmount: amt,
      paidAmount: 0,
      remainingAmount: amt,
      dueDate: debtDueDate || new Date().toISOString().split('T')[0],
      status: 'unpaid',
    });

    setIsDebtModalOpen(false);
    success(
      `تم تسجيل المتأخرات بقيمة ${formatDZD(amt)} على التلميذ "${debtStudentName.trim()}" بنجاح!`,
      'تسجيل متأخرات'
    );

    setDebtStudentName('');
    setDebtStudentPhone('');
    setDebtAmount('6000');
    setDebtSelectedStudentId('');
  };

  const confirmDeleteTransaction = () => {
    if (!txToDelete) return;
    deleteTransaction(txToDelete.id);
    success(`تم حذف سند الدفع رقم "${txToDelete.receiptNumber}" بنجاح.`);
    setTxToDelete(null);
  };

  const confirmDeleteDebt = () => {
    if (!debtToDelete) return;
    deleteDebt(debtToDelete.id);
    success(`تمت إزالة متأخرات التلميذ "${debtToDelete.studentName}" بقيمة ${formatDZD(debtToDelete.remainingAmount)} وتصفية حسابه بنجاح!`, 'إزالة المتأخرات');
    setDebtToDelete(null);
  };

  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    deleteExpense(expenseToDelete.id);
    success(`تم حذف سند المصروف رقم "${expenseToDelete.receiptNumber}" بنجاح.`);
    setExpenseToDelete(null);
  };

  const handlePrintExpenseThermalReceipt = (expense: Expense) => {
    const schoolName = currentSchool?.name || 'مدرستي التعليمية';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const categoryLabel: Record<string, string> = {
      salary: 'أجرة عمال / موظفين',
      electricity: 'كهرباء وغاز',
      internet: 'اشتراك إنترنت واتصالات',
      rent: 'إيجار المقر',
      supplies: 'مستلزمات ومطبوعات',
      maintenance: 'صيانة وإصلاحات',
      other: 'مصروف عام',
    };

    const printWindow = window.open('', '_blank', 'width=380,height=550');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) للتمكن من طباعة الوصل.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>وصل استلام أجرة - ${expense.receiptNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 4mm;
          }
          body {
            font-family: 'Courier New', Courier, monospace, 'Segoe UI', Tahoma, sans-serif;
            margin: 0;
            padding: 8px;
            color: #000;
            background: #fff;
            direction: rtl;
            font-size: 12px;
            line-height: 1.4;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .total-box {
            font-size: 15px;
            font-weight: 800;
            text-align: center;
            padding: 6px 0;
            margin: 6px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
          }
          .sig-section {
            margin-top: 18px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
          }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px;">${schoolName}</div>
        <div class="center" style="font-size: 12px; margin-top: 2px;">سند صرف نفقات / وصل استلام أجرة</div>
        <div class="double-divider"></div>

        <div class="row">
          <span>رقم السند:</span>
          <span class="bold">${expense.receiptNumber}</span>
        </div>
        <div class="row">
          <span>التاريخ والوقت:</span>
          <span>${expense.date} | ${timeStr}</span>
        </div>
        <div class="row">
          <span>نوع المصروف:</span>
          <span>${categoryLabel[expense.category] || expense.category}</span>
        </div>

        <div class="divider"></div>

        <div class="row">
          <span>البيان:</span>
          <span class="bold">${expense.title}</span>
        </div>
        ${expense.recipientName ? `
        <div class="row">
          <span>المستلم (العامل/الجهة):</span>
          <span class="bold">${expense.recipientName}</span>
        </div>` : ''}
        <div class="row">
          <span>طريقة الصرف:</span>
          <span>${expense.paymentMethod || 'نقداً'}</span>
        </div>
        ${expense.notes ? `
        <div class="row" style="font-size: 11px; color: #444;">
          <span>ملاحظة:</span>
          <span>${expense.notes}</span>
        </div>` : ''}

        <div class="total-box">
          المبلغ المسدد: ${(expense.amount || 0).toLocaleString('fr-DZ')} دج
        </div>

        <div class="sig-section">
          <div>
            توقيع الإدارة / الصندوق:
            <div style="height: 35px;"></div>
          </div>
          <div style="text-align: left;">
            توقيع واستلام العامل:
            <div style="height: 35px;"></div>
          </div>
        </div>

        <div class="center" style="font-size: 10px; margin-top: 10px; color: #555;">
          وصل رسمي معتمد - طابعة حرارية 80mm
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
      width: '120px',
      render: (tx) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            title="طباعة وصل دفع (80mm / A5)"
            onClick={() => setReceiptToPrint(tx)}
            style={{ color: 'var(--color-primary)' }}
          >
            <Printer size={16} />
          </Button>
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

  const regFeeColumns: Column<PaymentTransaction>[] = [
    {
      key: 'receiptNumber',
      header: 'رقم السند',
      sortable: true,
      render: (tx) => (
        <span style={{ fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>
          {tx.receiptNumber}
        </span>
      ),
    },
    {
      key: 'studentName',
      header: 'اسم التلميذ وبيانات الاتصال',
      sortable: true,
      render: (tx) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{tx.studentName}</div>
          {tx.notes && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {tx.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'courseTitle',
      header: 'الموسم والبيان',
      render: () => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            color: '#16a34a',
            fontWeight: 700,
            fontSize: '0.75rem',
          }}
        >
          <BadgeCheck size={13} /> حقوق التسجيل (2025/2026)
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'المبلغ المدفوع',
      sortable: true,
      render: (tx) => (
        <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9375rem' }}>
          {formatDZD(tx.amount)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'تاريخ الدفع',
      sortable: true,
      render: (tx) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {formatDateArabic(tx.date)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'الوصل والإجراءات',
      width: '160px',
      render: (tx) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePrintUltraSimpleReceipt(tx)}
            title="طباعة وصل بسيط جداً لطابعة 80mm"
            rightIcon={<Printer size={14} />}
            style={{ color: '#16a34a', borderColor: '#86efac', fontWeight: 600 }}
          >
            وصل بسيط
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            title="حذف هذا السند"
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
      render: (d) => {
        const isPaid = d.status === 'paid' || d.remainingAmount <= 0;
        return (
          <span
            style={{
              fontWeight: 700,
              color: isPaid ? 'var(--color-success)' : 'var(--color-danger)',
              fontSize: '0.9375rem',
            }}
          >
            {isPaid ? '0 دج (خالص)' : formatDZD(d.remainingAmount)}
          </span>
        );
      },
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
      render: (d) => {
        const isPaid = d.status === 'paid' || d.remainingAmount <= 0;
        if (isPaid) {
          return <Badge variant="success">خالص (مسدد بالكامل)</Badge>;
        }
        return (
          <Badge variant={d.status === 'overdue' ? 'danger' : 'warning'}>
            {d.status === 'overdue' ? 'متأخر' : 'غير مسدد'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'الإجراءات والتحصيل',
      width: '190px',
      render: (d) => {
        const isPaid = d.status === 'paid' || d.remainingAmount <= 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {!isPaid ? (
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
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--color-success)',
                }}
              >
                تم التسديد
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              title="إزالة هذه المتأخرات وتصفية الدين"
              onClick={() => setDebtToDelete(d)}
              style={{ color: 'var(--color-danger)' }}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        );
      },
    },
  ];

  const expenseColumns: Column<Expense>[] = [
    {
      key: 'receiptNumber',
      header: 'رقم السند',
      sortable: true,
      render: (e) => (
        <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
          {e.receiptNumber}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'بيان المصروف',
      sortable: true,
      render: (e) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{e.title}</div>
          {e.notes && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {e.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'نوع المصروف',
      render: (e) => {
        const catLabels: Record<string, { label: string; variant: 'primary' | 'warning' | 'info' | 'danger' | 'success' | 'neutral' }> = {
          salary: { label: 'أجرة عمال / موظفين', variant: 'primary' },
          electricity: { label: 'كهرباء وغاز', variant: 'warning' },
          internet: { label: 'إنترنت واتصالات', variant: 'info' },
          rent: { label: 'إيجار المقر', variant: 'danger' },
          supplies: { label: 'مستلزمات وطباعة', variant: 'success' },
          maintenance: { label: 'صيانة ونظافة', variant: 'warning' },
          other: { label: 'مصاريف أخرى', variant: 'neutral' },
        };
        const cat = catLabels[e.category] || { label: e.category, variant: 'neutral' };
        return <Badge variant={cat.variant}>{cat.label}</Badge>;
      },
    },
    {
      key: 'recipientName',
      header: 'المستلم (العامل / الجهة)',
      render: (e) => (
        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {e.recipientName || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'المبلغ المصروف',
      sortable: true,
      render: (e) => (
        <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.9375rem' }}>
          -{formatDZD(e.amount)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'التاريخ',
      sortable: true,
      render: (e) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {formatDateArabic(e.date)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات والوصل',
      render: (e) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePrintExpenseThermalReceipt(e)}
            title="طباعة وصل استلام للأجرة (طابعة حرارية 80mm)"
            style={{ color: 'var(--color-primary)' }}
            rightIcon={<Printer size={13} />}
          >
            طباعة وصل
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            title="حذف هذا المصروف"
            onClick={() => setExpenseToDelete(e)}
            style={{ color: 'var(--color-danger)' }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="المالية: المدفوعات والمصاريف التشغيلية"
        description="تسجيل مقبوضات التلاميذ، ضبط المتأخرات والديون، وتسجيل المصاريف وأجور العمال مع طباعة فورية للوصولات"
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
              variant="secondary"
              rightIcon={<PlusCircle size={16} />}
              onClick={() => setIsDebtModalOpen(true)}
              style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
            >
              + تسجيل دين / متأخرات
            </Button>

            {!isReceptionMode && (
              <Button
                variant="secondary"
                rightIcon={<PlusCircle size={16} />}
                onClick={() => setIsExpenseModalOpen(true)}
                style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}
              >
                + تسجيل مصروف / أجرة
              </Button>
            )}

            <Button
              variant="primary"
              rightIcon={<BadgeCheck size={16} />}
              onClick={() => setIsRegFeeModalOpen(true)}
              style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
            >
              + تسجيل حقوق المدرسة السنوية
            </Button>

            <Button
              variant="secondary"
              rightIcon={<PlusCircle size={16} />}
              onClick={() => {
                if (courses.length > 0) {
                  const firstCourse = courses[0];
                  setCourseTitle(firstCourse.title);
                  setAmount(String(firstCourse.monthlyPrice || 6000));
                }
                setStudentName('');
                setSelectedStudentId('');
                setTargetedDebtStudentId(undefined);
                setIsRecordModalOpen(true);
              }}
            >
              + تسجيل قبض دورة نقداً
            </Button>
          </div>
        }
      />

      {/* Financial Summary Ribbon (Admin only) */}
      {!isReceptionMode && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DollarSign size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>المقبوضات المحصلة</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  +{formatDZD(periodRevenue)}
                </div>
              </div>
            </div>

            <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--color-border)' }} />

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>إجمالي المصاريف والنفقات</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#dc2626' }}>
                -{formatDZD(periodExpensesTotal)}
              </div>
            </div>

            <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--color-border)' }} />

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>أجور العمال المشمولة</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {formatDZD(periodSalariesTotal)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
            <span>طريقة الصرف والقبض: <strong>نقداً</strong></span>
            <span>•</span>
            <span>فواتير وكهرباء وإنترنت: <strong>{formatDZD(periodUtilitiesTotal)}</strong></span>
          </div>
        </div>
      )}

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
          سجل المدفوعات المقبوضة ({filteredCourseTransactions.length})
        </button>

        <button
          onClick={() => setActiveTab('registration_fees')}
          style={{
            padding: 'var(--space-2-5) var(--space-4)',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'registration_fees' ? 600 : 500,
            color: activeTab === 'registration_fees' ? '#16a34a' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'registration_fees' ? '2px solid #16a34a' : '2px solid transparent',
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
          <span>حقوق التسجيل السنوية</span>
          <span
            style={{
              padding: '1px 7px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              backgroundColor: 'rgba(22, 163, 74, 0.1)',
              color: '#16a34a',
            }}
          >
            {filteredRegistrationFees.length}
          </span>
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
                backgroundColor: activeDebtsCount > 0 ? 'var(--color-danger-bg)' : 'rgba(16, 185, 129, 0.1)',
                color: activeDebtsCount > 0 ? 'var(--color-danger)' : 'var(--color-success)',
              }}
            >
              {activeDebtsCount > 0 ? `${activeDebtsCount} غير مسدد` : 'لا توجد متأخرات'}
            </span>
          </button>

          {!isReceptionMode && (
            <button
              onClick={() => setActiveTab('expenses')}
              style={{
                padding: 'var(--space-2-5) var(--space-4)',
                fontSize: '0.875rem',
                fontWeight: activeTab === 'expenses' ? 600 : 500,
                color: activeTab === 'expenses' ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                borderBottom: activeTab === 'expenses' ? '2px solid var(--color-danger)' : '2px solid transparent',
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
              <span>المصاريف والنفقات التشغيلية</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--color-danger)',
                }}
              >
                {filteredExpenses.length}
              </span>
            </button>
          )}
        </div>

        {activeTab === 'transactions' && (
          <DataTable
            data={filteredCourseTransactions}
            columns={txColumns}
            keyExtractor={(t) => t.id}
            searchPlaceholder="ابحث برقم الإيصال أو اسم التلميذ..."
            searchFields={['receiptNumber', 'studentName', 'courseTitle']}
          />
        )}

        {activeTab === 'registration_fees' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-3-5) var(--space-4)',
                backgroundColor: 'rgba(22, 163, 74, 0.06)',
                border: '1px solid rgba(22, 163, 74, 0.25)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--space-4)',
                fontSize: '0.875rem',
                color: '#15803d',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BadgeCheck size={20} color="#16a34a" />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9375rem', color: '#166534' }}>
                    سجل حقوق التسجيل السنوية بالمدرسة
                  </strong>
                  <span style={{ fontSize: '0.8125rem', color: '#15803d' }}>
                    جميع التلاميذ الذين سددوا حقوق المدرسة الرسمية لهذا الموسم الدراسي. هذا السجل ثابت ومستقل ولا يُحذف حتى لو غادر التلميذ أي فوج.
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                rightIcon={<BadgeCheck size={15} />}
                onClick={() => setIsRegFeeModalOpen(true)}
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', fontWeight: 700 }}
              >
                + تسجيل تلميذ جديد
              </Button>
            </div>

            <DataTable
              data={filteredRegistrationFees}
              columns={regFeeColumns}
              keyExtractor={(t) => t.id}
              searchPlaceholder="ابحث باسم التلميذ، رقم الهاتف، أو رقم السند..."
              searchFields={['receiptNumber', 'studentName', 'notes']}
            />
          </div>
        )}

        {activeTab === 'debts' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-4)',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
              }}
            >
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setDebtFilter('all')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    fontWeight: debtFilter === 'all' ? 700 : 500,
                    backgroundColor: debtFilter === 'all' ? 'var(--color-primary)' : 'var(--color-bg-surface)',
                    color: debtFilter === 'all' ? '#fff' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  جميع المتأخرات والديون ({debts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDebtFilter('unpaid')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    fontWeight: debtFilter === 'unpaid' ? 700 : 500,
                    backgroundColor: debtFilter === 'unpaid' ? 'var(--color-danger)' : 'var(--color-bg-surface)',
                    color: debtFilter === 'unpaid' ? '#fff' : 'var(--color-danger)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  الديون غير المسددة ({activeDebtsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setDebtFilter('paid')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    fontWeight: debtFilter === 'paid' ? 700 : 500,
                    backgroundColor: debtFilter === 'paid' ? 'var(--color-success)' : 'var(--color-bg-surface)',
                    color: debtFilter === 'paid' ? '#fff' : 'var(--color-success)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  المسددة بالكامل (خالص) ({paidDebtsCount})
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                rightIcon={<PlusCircle size={15} />}
                onClick={() => setIsDebtModalOpen(true)}
                style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
              >
                + تسجيل دين / متأخرات جديدة
              </Button>
            </div>

            <DataTable
              data={filteredDebts}
              columns={debtColumns}
              keyExtractor={(d) => d.id}
              searchPlaceholder="ابحث باسم التلميذ أو رقم الهاتف..."
              searchFields={['studentName', 'studentPhone', 'courseTitle']}
            />
          </div>
        )}

      {activeTab === 'expenses' && (
        <DataTable
          data={filteredExpenses}
          columns={expenseColumns}
          keyExtractor={(e) => e.id}
          searchPlaceholder="ابحث في المصاريف، الفئة أو اسم المستلم..."
          searchFields={['receiptNumber', 'title', 'recipientName', 'notes']}
        />
      )}

      {/* Record Payment Modal (Cash Only) */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setTargetedDebtStudentId(undefined);
          setSelectedStudentId('');
          if (onCloseRecordModalInitially) onCloseRecordModalInitially();
        }}
        title="تسجيل عملية دفع نقداً (Cash)"
        description="تسجيل قسط أو دفع كامل نقدًا وإصدار سند قبض للمؤسسة"
      >
        <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Quick Select Registered Student */}
          {courses.flatMap((c) => c.enrolledList || []).length > 0 && (
            <Select
              label="اختر تلميذ من الأفواج المسجلة (اختياري للتعيين والتعبئة التلقائية)"
              value={selectedStudentId}
              onChange={(e) => {
                const sId = e.target.value;
                setSelectedStudentId(sId);
                const allStds = courses.flatMap((c) =>
                  (c.enrolledList || []).map((s) => ({ ...s, courseObj: c }))
                );
                const found = allStds.find((s) => s.id === sId);
                if (found) {
                  setStudentName(found.fullName);
                  setTargetedDebtStudentId(found.id);
                  if (found.courseObj) {
                    setCourseTitle(found.courseObj.title);
                    const suggestedAmount =
                      found.totalDebt && found.totalDebt > 0
                        ? found.totalDebt
                        : found.courseObj.monthlyPrice || 0;
                    setAmount(String(suggestedAmount));
                  }
                }
              }}
              options={[
                { value: '', label: '— اختر تلميذ مسجل أو اكتب يدوياً بالأسفل —' },
                ...courses.flatMap((c) =>
                  (c.enrolledList || []).map((std) => ({
                    value: std.id,
                    label: `${std.fullName} • فوج: ${c.title} ${std.totalDebt ? `(متأخرات: ${formatDZD(std.totalDebt)})` : `(${formatDZD(c.monthlyPrice || 0)})`}`,
                  }))
                ),
              ]}
            />
          )}

          <Input
            label="اسم التلميذ الكامل"
            placeholder="مثال: رحيل ربيحه"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="الدورة أو فوج الدعم"
            value={courseTitle}
            onChange={(e) => {
              const selectedTitle = e.target.value;
              setCourseTitle(selectedTitle);
              const foundCourse = courses.find((c) => c.title === selectedTitle);
              if (foundCourse) {
                setAmount(String(foundCourse.monthlyPrice || 0));
              }
            }}
            options={
              courses.length > 0
                ? [
                    ...courses.map((c) => ({
                      value: c.title,
                      label: `${c.title} (${formatDZD(c.monthlyPrice || 0)})`,
                    })),
                    ...(courseTitle && !courses.some((c) => c.title === courseTitle)
                      ? [{ value: courseTitle, label: courseTitle }]
                      : []),
                  ]
                : [{ value: courseTitle || 'دورة عامة', label: courseTitle || 'لا توجد دورات مسجلة' }]
            }
            required
          />

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="المبلغ المسدد نقداً (دج DZD)"
              type="number"
              placeholder="مثال: 6000"
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
                نقداً (Cash)
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

      {/* Print Receipt Modal (80mm / A5) */}
      <Modal
        isOpen={!!receiptToPrint}
        onClose={() => setReceiptToPrint(null)}
        title="طباعة وصل دفع فوري"
        description="وصل استلام نقدي مخصص للطابعات الحرارية (80mm) أو بحجم A5"
        maxWidth="480px"
        footer={
          <>
            <Button
              variant="primary"
              rightIcon={<Printer size={16} />}
              onClick={() => {
                if (!receiptToPrint) return;
                const targetStudent = courses
                  .flatMap((c) => c.enrolledList || [])
                  .find((s) => s.id === receiptToPrint.studentId || s.fullName === receiptToPrint.studentName);

                const sessions = targetStudent?.totalSessions || 5;
                const remaining = targetStudent?.totalDebt || 0;
                const schoolName = currentSchool?.name || 'مدرستي التعليمية';
                const dateTime = `${formatDateArabic(receiptToPrint.date)} - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

                const width = paperSize === 'A5' ? '148mm' : '80mm';

                const printWindow = window.open('', '_blank', 'width=450,height=600');
                if (!printWindow) {
                  alert('يرجى السماح بالنوافذ المنبثقة (Popups) للتمكن من الطباعة.');
                  return;
                }

                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html dir="rtl" lang="ar">
                  <head>
                    <meta charset="utf-8">
                    <title>وصل استلام - ${receiptToPrint.receiptNumber}</title>
                    <style>
                      @page {
                        size: ${paperSize === 'A5' ? 'A5 portrait' : '80mm auto'};
                        margin: 4mm;
                      }
                      body {
                        font-family: 'Courier New', Courier, monospace, 'Cairo', Tahoma, sans-serif;
                        margin: 0;
                        padding: 8px;
                        color: #000;
                        background: #fff;
                        width: ${width};
                        font-size: 13px;
                        line-height: 1.4;
                        box-sizing: border-box;
                      }
                      .header {
                        text-align: center;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 8px;
                        margin-bottom: 8px;
                      }
                      .school-name {
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 3px;
                      }
                      .receipt-title {
                        font-size: 13px;
                        font-weight: bold;
                      }
                      .meta-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 11px;
                        margin: 3px 0;
                      }
                      .divider {
                        border-top: 1px dashed #000;
                        margin: 8px 0;
                      }
                      .double-divider {
                        border-top: 2px solid #000;
                        margin: 8px 0;
                      }
                      .info-row {
                        display: flex;
                        justify-content: space-between;
                        margin: 5px 0;
                      }
                      .info-label {
                        color: #333;
                      }
                      .info-value {
                        font-weight: bold;
                      }
                      .total-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 14px;
                        font-weight: bold;
                        margin: 6px 0;
                      }
                      .footer {
                        text-align: center;
                        font-size: 11px;
                        margin-top: 10px;
                        border-top: 1px dashed #000;
                        padding-top: 6px;
                      }
                      @media print {
                        body {
                          width: ${width};
                          padding: 0;
                        }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div class="school-name">${schoolName}</div>
                      <div class="receipt-title">وصل استلام نقدي</div>
                    </div>

                    <div class="meta-row">
                      <span>رقم الوصل: <strong>${receiptToPrint.receiptNumber}</strong></span>
                    </div>
                    <div class="meta-row">
                      <span>التاريخ والوقت:</span>
                      <span>${dateTime}</span>
                    </div>

                    <div class="divider"></div>

                    <div class="info-row">
                      <span class="info-label">اسم التلميذ:</span>
                      <span class="info-value">${receiptToPrint.studentName}</span>
                    </div>

                    <div class="info-row">
                      <span class="info-label">الفوج:</span>
                      <span class="info-value">${receiptToPrint.courseTitle}</span>
                    </div>

                    <div class="info-row">
                      <span class="info-label">الحصص:</span>
                      <span class="info-value">${sessions} حصص</span>
                    </div>

                    <div class="double-divider"></div>

                    <div class="total-row">
                      <span>المبلغ المسدد:</span>
                      <span>${receiptToPrint.amount.toLocaleString('fr-DZ')} دج</span>
                    </div>

                    <div class="info-row">
                      <span class="info-label">المبلغ المتبقي:</span>
                      <span class="info-value">${remaining > 0 ? `${remaining.toLocaleString('fr-DZ')} دج` : '0 دج (خالص)'}</span>
                    </div>

                    <div class="footer">
                      شكراً لثقتكم بمؤسستنا
                    </div>

                    <script>
                      window.onload = function() {
                        window.print();
                      };
                    </script>
                  </body>
                  </html>
                `);
                printWindow.document.close();
                setReceiptToPrint(null);
              }}
            >
              طباعة الوصل الآن
            </Button>
            <Button variant="secondary" onClick={() => setReceiptToPrint(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        {receiptToPrint && (() => {
          const targetStudent = courses
            .flatMap((c) => c.enrolledList || [])
            .find((s) => s.id === receiptToPrint.studentId || s.fullName === receiptToPrint.studentName);
          const sessions = targetStudent?.totalSessions || 5;
          const remaining = targetStudent?.totalDebt || 0;
          const schoolName = currentSchool?.name || 'مدرستي التعليمية';
          const dateTime = `${formatDateArabic(receiptToPrint.date)} - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Paper Size Selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-bg-app)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>قياس ورق الطباعة:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPaperSize('80mm')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: paperSize === '80mm' ? 700 : 500,
                      backgroundColor: paperSize === '80mm' ? 'var(--color-primary)' : 'var(--color-bg-surface)',
                      color: paperSize === '80mm' ? '#fff' : 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    طابعة حرارية (80mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('A5')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: paperSize === 'A5' ? 700 : 500,
                      backgroundColor: paperSize === 'A5' ? 'var(--color-primary)' : 'var(--color-bg-surface)',
                      color: paperSize === 'A5' ? '#fff' : 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    ورق عادي (A5)
                  </button>
                </div>
              </div>

              {/* Minimalist Live Receipt Preview */}
              <div
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  fontFamily: 'Courier New, monospace, sans-serif',
                  fontSize: '0.875rem',
                  maxWidth: '340px',
                  margin: '0 auto',
                  width: '100%',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #9ca3af', paddingBottom: '8px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800 }}>{schoolName}</div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>وصل استلام نقدي</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span>رقم الوصل:</span>
                  <strong>{receiptToPrint.receiptNumber}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '8px' }}>
                  <span>التاريخ والوقت:</span>
                  <span>{dateTime}</span>
                </div>

                <div style={{ borderTop: '1px dashed #d1d5db', margin: '8px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#4b5563' }}>اسم التلميذ:</span>
                  <span style={{ fontWeight: 700 }}>{receiptToPrint.studentName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#4b5563' }}>الفوج:</span>
                  <span style={{ fontWeight: 700 }}>{receiptToPrint.courseTitle}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#4b5563' }}>الحصص:</span>
                  <span style={{ fontWeight: 700 }}>{sessions} حصص</span>
                </div>

                <div style={{ borderTop: '2px solid #111827', margin: '10px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>
                  <span>المبلغ المسدد:</span>
                  <span style={{ color: 'var(--color-primary, #2563eb)' }}>{formatDZD(receiptToPrint.amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#4b5563' }}>المبلغ المتبقي:</span>
                  <span style={{ fontWeight: 700, color: remaining > 0 ? '#dc2626' : '#16a34a' }}>
                    {remaining > 0 ? formatDZD(remaining) : '0 دج (خالص)'}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
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

      {/* Delete Debt Modal */}
      <Modal
        isOpen={!!debtToDelete}
        onClose={() => setDebtToDelete(null)}
        title="تأكيد إزالة المتأخرات والديون"
        description="هل أنت متأكد من رغبتك في إزالة المتأخرات المترتبة على هذا التلميذ؟"
        maxWidth="460px"
        footer={
          <>
            <Button variant="danger" onClick={confirmDeleteDebt}>
              نعم، إزالة الدين
            </Button>
            <Button variant="secondary" onClick={() => setDebtToDelete(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        {debtToDelete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)' }}>
            <AlertTriangle size={24} color="var(--color-danger)" />
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              سيتم إزالة المتأخرات المترتبة على التلميذ <strong>{debtToDelete.studentName}</strong> في فوج ({debtToDelete.courseTitle}) بقيمة <strong>{formatDZD(debtToDelete.remainingAmount)}</strong> وتصفية حسابه كخالص.
            </div>
          </div>
        )}
      </Modal>

      {/* Record Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="تسجيل مصروف / نفقة تشغيلية"
        description="تسجيل مصاريف الكهرباء، أجور العمال، الإنترنت، الكراء أو النفقات الأخرى"
        maxWidth="500px"
      >
        <form onSubmit={handleRecordExpense} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="بيان / عنوان المصروف"
            placeholder="مثال: فاتورة كهرباء شهر أوت، أجرة عامل النظافة..."
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="نوع وفئة المصروف"
            value={expenseCategory}
            onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
            options={[
              { value: 'salary', label: 'أجرة عمال / موظفين (حارس، نظافة، سكرتاريا)' },
              { value: 'electricity', label: 'كهرباء وغاز (سونلغاز)' },
              { value: 'internet', label: 'إنترنت واتصالات' },
              { value: 'rent', label: 'إيجار المقر والقاعات' },
              { value: 'supplies', label: 'أدوات مكتبية ومطبوعات' },
              { value: 'maintenance', label: 'صيانة وتصليحات' },
              { value: 'other', label: 'مصاريف أخرى عامة' },
            ]}
          />

          <Input
            label="اسم المستلم / العامل (مهم لوصل استلام الأجرة)"
            placeholder="مثال: كريم بن مسعود"
            value={expenseRecipient}
            onChange={(e) => setExpenseRecipient(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="المبلغ المصروف نقداً (دج)"
              type="number"
              min="100"
              placeholder="مثال: 35000"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              required
            />

            <Input
              label="تاريخ الصرف"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="ملاحظات أو تفاصيل إضافية (اختياري)"
            placeholder="أية ملاحظة تظهر في وصل الصرف..."
            value={expenseNotes}
            onChange={(e) => setExpenseNotes(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button type="submit" variant="primary">
              تسجيل المصروف وحفظ السند
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsExpenseModalOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Expense Modal */}
      <Modal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        title="تأكيد حذف سند المصروف"
        description="هل أنت متأكد من رغبتك في حذف هذا المصروف من السجلات؟"
        maxWidth="460px"
        footer={
          <>
            <Button variant="danger" onClick={confirmDeleteExpense}>
              نعم، حذف المصروف
            </Button>
            <Button variant="secondary" onClick={() => setExpenseToDelete(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        {expenseToDelete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)' }}>
            <AlertTriangle size={24} color="var(--color-danger)" />
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              سيتم حذف سند المصروف <strong>{expenseToDelete.receiptNumber}</strong> بمبلغ <strong>{formatDZD(expenseToDelete.amount)}</strong> ({expenseToDelete.title}).
            </div>
          </div>
        )}
      </Modal>

      {/* Add Debt Modal */}
      <Modal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        title="تسجيل دين / متأخرات جديدة على تلميذ"
        description="تسجيل مبالغ مستحقة ومتأخرات على تلميذ لحفظها في سجل المؤسسة وقاعدة البيانات"
        maxWidth="500px"
      >
        <form onSubmit={handleRecordDebt} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {courses.flatMap((c) => c.enrolledList || []).length > 0 && (
            <Select
              label="اختر تلميذ من الأفواج المسجلة (اختياري للتعيين السريع)"
              value={debtSelectedStudentId}
              onChange={(e) => {
                const sId = e.target.value;
                setDebtSelectedStudentId(sId);
                const allStds = courses.flatMap((c) =>
                  (c.enrolledList || []).map((s) => ({ ...s, courseTitle: c.title }))
                );
                const found = allStds.find((s) => s.id === sId);
                if (found) {
                  setDebtStudentName(found.fullName);
                  setDebtStudentPhone(found.phone || '');
                  setDebtCourseTitle(found.courseTitle || courses[0]?.title || 'دورة تعليمية');
                }
              }}
              options={[
                { value: '', label: '— أو كتابة بيانات تلميذ يدوياً —' },
                ...courses.flatMap((c) =>
                  (c.enrolledList || []).map((std) => ({
                    value: std.id,
                    label: `${std.fullName} (${c.title})`,
                  }))
                ),
              ]}
            />
          )}

          <Input
            label="اسم التلميذ الكامل"
            placeholder="مثال: عبد الرحيم"
            value={debtStudentName}
            onChange={(e) => setDebtStudentName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="رقم هاتف التلميذ / ولي الأمر"
            placeholder="مثال: 0550 00 00 00"
            value={debtStudentPhone}
            onChange={(e) => setDebtStudentPhone(e.target.value)}
          />

          <Input
            label="الدورة أو الفوج التعليمي"
            placeholder="مثال: الفوج الأول"
            value={debtCourseTitle}
            onChange={(e) => setDebtCourseTitle(e.target.value)}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="مبلغ الدين / المتأخرات (دج)"
              type="number"
              min="100"
              value={debtAmount}
              onChange={(e) => setDebtAmount(e.target.value)}
              required
            />
            <Input
              label="تاريخ الاستحقاق الأخير"
              type="date"
              value={debtDueDate}
              onChange={(e) => setDebtDueDate(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button type="submit" variant="primary" rightIcon={<PlusCircle size={15} />}>
              تسجيل وحفظ الدين
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsDebtModalOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record School Registration Fee Modal */}
      <Modal
        isOpen={isRegFeeModalOpen}
        onClose={() => setIsRegFeeModalOpen(false)}
        title="تسجيل حقوق المدرسة السنوية"
        description="تسجيل رسم التسجيل السنوي للتلميذ لحفظ هويته المدرسية وإصدار وصل فوري وبسيط"
        maxWidth="480px"
      >
        <form onSubmit={handleRecordRegistrationFee} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3-5)' }}>
          <Input
            label="اسم التلميذ الكامل"
            placeholder="مثال: سامي بن علي"
            value={regStudentName}
            onChange={(e) => setRegStudentName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="رقم هاتف التلميذ أو الولي"
            placeholder="مثال: 0550 12 34 56"
            value={regStudentPhone}
            onChange={(e) => setRegStudentPhone(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Select
              label="الموسم الدراسي"
              value={regAcademicYear}
              onChange={(e) => setRegAcademicYear(e.target.value)}
              options={academicYearOptions}
              required
            />

            <Input
              label="مبلغ حقوق التسجيل (دج)"
              type="number"
              placeholder="مثال: 500 أو 1000"
              value={regAmount}
              onChange={(e) => setRegAmount(e.target.value)}
              required
            />
          </div>

          <Input
            label="ملاحظة إضافية (اختياري)"
            placeholder="مثال: تسجيل أولي / تلميذ جديد"
            value={regNotes}
            onChange={(e) => setRegNotes(e.target.value)}
          />

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <BadgeCheck size={18} color="#16a34a" />
            <span>سيتم حفظ بيانات التلميذ وسند حقوق التسجيل دائماً، مع إمكانية طباعة الوصل فوراً بأي مبلغ تحدده.</span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button
              type="submit"
              variant="primary"
              rightIcon={<BadgeCheck size={16} />}
              style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
            >
              تسجيل وحفظ وطباعة الوصل
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsRegFeeModalOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ultra Simple Receipt Modal Preview & Print */}
      <Modal
        isOpen={!!simpleReceiptToPrint}
        onClose={() => setSimpleReceiptToPrint(null)}
        title="وصل حقوق التسجيل المدرسية"
        description="وصل بسيط ومعتمد للطابعات الحرارية (80mm) أو بحجم مصغر"
        maxWidth="400px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
            <Button
              variant="primary"
              rightIcon={<Printer size={16} />}
              onClick={() => {
                if (simpleReceiptToPrint) {
                  handlePrintUltraSimpleReceipt(simpleReceiptToPrint);
                }
              }}
              style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
            >
              طباعة هذا الوصل الآن
            </Button>
            <Button variant="secondary" onClick={() => setSimpleReceiptToPrint(null)}>
              تم الإغلاق
            </Button>
          </div>
        }
      >
        {simpleReceiptToPrint && (
          <div
            style={{
              padding: '18px',
              backgroundColor: '#fafafa',
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'Courier New, monospace',
              direction: 'rtl',
              fontSize: '0.875rem',
              color: '#111',
            }}
          >
            <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', marginBottom: '2px' }}>
              {currentSchool.name}
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#444', marginBottom: '10px' }}>
              وصل حقوق التسجيل السنوية
            </div>

            <div style={{ borderTop: '1px dashed #999', paddingTop: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>رقم السند:</span>
                <strong>{simpleReceiptToPrint.receiptNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>التاريخ:</span>
                <span>{formatDateArabic(simpleReceiptToPrint.date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>التلميذ:</span>
                <strong>{simpleReceiptToPrint.studentName}</strong>
              </div>
              {simpleReceiptToPrint.notes && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                  <span style={{ color: '#666' }}>البيان:</span>
                  <span>{simpleReceiptToPrint.notes}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>الموسم:</span>
                <span>2025 / 2026</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>طريقة الدفع:</span>
                <span>نقداً (Cash)</span>
              </div>
            </div>

            <div
              style={{
                borderTop: '2px dashed #000',
                borderBottom: '2px dashed #000',
                padding: '8px 0',
                textAlign: 'center',
                fontSize: '1.15rem',
                fontWeight: 900,
                color: '#15803d',
                margin: '10px 0',
              }}
            >
              المبلغ المدفوع: {simpleReceiptToPrint.amount} دج
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#555', marginTop: '6px' }}>
              هذا السند رسمي ومسجل بقاعدة بيانات المدرسة
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#555' }}>
              <span>ختم واستلام الإدارة</span>
              <span>..................</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
