import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building,
  CheckCircle,
  Lock,
  LogOut,
  PlusCircle,
  Search,
  DollarSign,
  Clock,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Shield,
  Trash2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';
import { SchoolTenant } from '../../types';
import { formatDZD, formatDateArabic } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';

export interface SuperAdminProps {
  onExit: () => void;
}

export const SuperAdmin: React.FC<SuperAdminProps> = ({ onExit }) => {
  const { success, warning } = useToast();
  const { schools, addSchool, deleteSchool, toggleSchoolStatus, extendSchoolSubscription } = useData();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [passcodeError, setPasscodeError] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<SchoolTenant | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<SchoolTenant | null>(null);

  // Password visibility toggle per school
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Extend Duration Modal State
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendMonths, setExtendMonths] = useState('6');

  // Add School Modal
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolUsername, setNewSchoolUsername] = useState('');
  const [newSchoolPassword, setNewSchoolPassword] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolWilaya, setNewSchoolWilaya] = useState('الجزائر العاصمة (16)');
  const [newSchoolPrice, setNewSchoolPrice] = useState('30000');
  const [newSchoolDuration, setNewSchoolDuration] = useState('12');
  const [copiedSchoolId, setCopiedSchoolId] = useState<string | null>(null);

  // Check remembered passcode on mount
  useEffect(() => {
    const savedPass = localStorage.getItem('super_admin_saved_passcode');
    const isRemembered = localStorage.getItem('super_admin_remembered') === 'true';
    if (savedPass && isRemembered) {
      setPasscode(savedPass);
      setRememberMe(true);
      if (savedPass === '0000' || savedPass === 'admin2026' || savedPass === '123456') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim();
    if (clean === '0000' || clean === 'admin2026' || clean === '123456') {
      if (rememberMe) {
        localStorage.setItem('super_admin_saved_passcode', clean);
        localStorage.setItem('super_admin_remembered', 'true');
      } else {
        localStorage.removeItem('super_admin_saved_passcode');
        localStorage.removeItem('super_admin_remembered');
      }

      setIsAuthenticated(true);
      setPasscodeError(false);
      success('تم الدخول بنجاح إلى بوابة مالك المنصة المركزية!', 'مصادقة ناجحة');
    } else {
      setPasscodeError(true);
      warning('رمز المرور غير صحيح. (الرمز الافتراضي: 0000)');
    }
  };

  const handleLogoutAdmin = () => {
    setIsAuthenticated(false);
    onExit();
  };

  const handleToggle = (schoolId: string) => {
    toggleSchoolStatus(schoolId);
    success('تم تحديث حالة ترخيص المدرسة بنجاح!');
  };

  const handleExtend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;

    const months = Number(extendMonths) || 6;
    extendSchoolSubscription(selectedSchool.id, months);

    setIsExtendModalOpen(false);
    success(`تم تمديد اشتراك "${selectedSchool.name}" لمدة ${months} أشهر إضافية بنجاح!`, 'تمديد الاشتراك');
    setSelectedSchool(null);
  };

  const confirmDeleteSchool = () => {
    if (!schoolToDelete) return;
    deleteSchool(schoolToDelete.id);
    success(`تم حذف مدرسة "${schoolToDelete.name}" وكافة سجلاتها وعملياتها الحسابية بنجاح.`, 'تم حذف المؤسسة');
    setSchoolToDelete(null);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'Sch';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '2026@';
    setNewSchoolPassword(pass);
  };

  const copyCredentials = (school: SchoolTenant) => {
    const text = `بيانات الدخول للمؤسسة التعليمية:\nالمدرسة: ${school.name}\nاسم المستخدم: ${school.username}\nكلمة المرور: ${school.password}\nالولاية: ${school.wilaya}\nنهاية الاشتراك: ${school.subscriptionEnd}`;
    navigator.clipboard.writeText(text);
    setCopiedSchoolId(school.id);
    setTimeout(() => setCopiedSchoolId(null), 2500);
    success(`تم نسخ بيانات الدخول لمدرسة "${school.name}" إلى الحافظة بنجاح!`, 'تم النسخ');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newSchoolUsername.trim() || !newSchoolPassword.trim()) {
      warning('يرجى ملء اسم المدرسة، واسم المستخدم، وكلمة السر المخصصة.');
      return;
    }

    const today = new Date();
    const endDate = new Date(today);
    const months = Number(newSchoolDuration) || 12;
    endDate.setMonth(endDate.getMonth() + months);

    const cleanUsername = newSchoolUsername.trim().toLowerCase().replace(/\s+/g, '_');
    const priceVal = Number(newSchoolPrice) || 30000;

    const newTenant: SchoolTenant = {
      id: `school-${Date.now()}`,
      name: newSchoolName.trim(),
      code: `SCH-${Math.floor(1000 + Math.random() * 9000)}`,
      username: cleanUsername,
      password: newSchoolPassword.trim(),
      phone: newSchoolPhone.trim() || '0550 00 00 00',
      email: `${cleanUsername}@school.dz`,
      address: 'المقر الرئيسي للمؤسسة',
      wilaya: newSchoolWilaya,
      plan: 'professional',
      planStatus: 'active',
      subscriptionStart: today.toISOString().split('T')[0],
      subscriptionEnd: endDate.toISOString().split('T')[0],
      studentsCount: 0,
      revenueGenerated: priceVal,
      logoText: newSchoolName.slice(0, 15),
    };

    addSchool(newTenant);
    setIsAddSchoolOpen(false);
    success(
      `تم تسجيل مدرسة "${newSchoolName}" بنجاح! اسم المستخدم: ${cleanUsername} | السعر: ${formatDZD(priceVal)} | الصلاحية: ${months} شهر`,
      'تم إنشاء حساب المؤسسة'
    );

    setNewSchoolName('');
    setNewSchoolUsername('');
    setNewSchoolPassword('');
    setNewSchoolPhone('');
    setNewSchoolPrice('30000');
    setNewSchoolDuration('12');
  };

  const togglePasswordReveal = (schoolId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [schoolId]: !prev[schoolId],
    }));
  };

  // Locked Gate Screen
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg-app)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-4)',
          direction: 'rtl',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '430px',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8) var(--space-6)',
            boxShadow: '0 4px 20px rgba(23, 32, 36, 0.08)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4) auto',
              boxShadow: '0 2px 8px rgba(23, 107, 103, 0.15)',
            }}
          >
            <ShieldAlert size={30} />
          </div>

          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
            بوابة مالك المنصة المركزية
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
            منطقة سرية خاصة بمالك المنصة لإنشاء حسابات المدارس وتعيين بيانات الدخول
          </p>

          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="رمز المرور السري"
              type={showPasscode ? 'text' : 'password'}
              placeholder="0000"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (passcodeError) setPasscodeError(false);
              }}
              prefixIcon={<Lock size={17} />}
              suffixIcon={
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: showPasscode ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    transition: 'color var(--transition-fast)',
                  }}
                  tabIndex={-1}
                  title={showPasscode ? 'إخفاء الرمز' : 'إظهار الرمز'}
                >
                  {showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              error={passcodeError ? 'رمز المرور غير صحيح (الرمز الافتراضي: 0000)' : undefined}
              required
              autoFocus
            />

            {/* Remember Me Checkbox */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                marginTop: '-4px',
              }}
            >
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                  userSelect: 'none',
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--color-primary)',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                />
                <span>تذكر رمز المرور على هذا الجهاز</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              style={{
                height: '46px',
                fontSize: '0.9375rem',
                fontWeight: 700,
                marginTop: 'var(--space-1)',
              }}
            >
              فتح لوحة التحكم المركزية
            </Button>

            <Button type="button" variant="ghost" onClick={onExit} style={{ marginTop: 'var(--space-1)' }}>
              العودة للمنصة الرئيسية
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const activeSchoolsCount = schools.filter((s) => s.planStatus === 'active').length;
  const totalRevenue = schools.reduce((acc, s) => acc + (s.revenueGenerated || 30000), 0);

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.wilaya.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-app)',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Super Admin Dedicated Responsive Topbar */}
      <header
        style={{
          minHeight: '64px',
          backgroundColor: 'var(--color-bg-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--container-padding)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--color-text-primary)' }}>
                لوحة مالك المنصة المركزية
              </span>
              <Badge variant="primary">الرابط السري</Badge>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              إدارة تراخيص المؤسسات وتعيين بيانات الدخول
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            rightIcon={<PlusCircle size={16} />}
            onClick={() => {
              generateRandomPassword();
              setIsAddSchoolOpen(true);
            }}
          >
            + تسجيل مدرسة جديدة وبيانات الدخول
          </Button>

          <Button
            variant="secondary"
            onClick={handleLogoutAdmin}
            rightIcon={<LogOut size={16} />}
          >
            خروج من اللوحة
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          padding: 'var(--space-5) var(--container-padding) var(--space-8) var(--container-padding)',
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-4" style={{ marginBottom: 'var(--space-6)' }}>
          <StatCard
            title="إجمالي المدارس المسجلة"
            value={`${schools.length} مدارس`}
            subtitle="حسابات نشطة ومخصصة"
            icon={<Building size={20} />}
          />
          <StatCard
            title="المدارس النشطة والمفعلة"
            value={`${activeSchoolsCount} مدارس`}
            subtitle="اشتراكات سارية المفعول"
            icon={<CheckCircle size={20} color="var(--color-success)" />}
          />
          <StatCard
            title="الخطة المعتمدة في المنصة"
            value="الخطة الاحترافية"
            subtitle="مخصصة لكل مدرسة"
            icon={<Sparkles size={20} color="var(--color-primary)" />}
          />
          <StatCard
            title="إجمالي الإيرادات المحققة"
            value={formatDZD(totalRevenue)}
            subtitle="اشتراكات التراخيص الفعلية"
            icon={<DollarSign size={20} color="var(--color-success)" />}
          />
        </div>

        {/* Schools Table */}
        <div className="table-container">
          <div className="table-toolbar">
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '12px',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="ابحث باسم المدرسة، اسم المستخدم، أو الولاية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: 'var(--height-input)',
                  paddingRight: '36px',
                  paddingLeft: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  backgroundColor: 'var(--color-bg-surface)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              عدد المؤسسات: {filteredSchools.length}
            </span>
          </div>

          <div className="table-responsive">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>المؤسسة / المدرسة</th>
                  <th>بيانات الدخول المخصصة</th>
                  <th>قيمة الترخيص والولاية</th>
                  <th>نهاية الاشتراك</th>
                  <th>حالة الترخيص</th>
                  <th>التحكم في التفعيل</th>
                  <th>تمديد المدة</th>
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school) => {
                  const isRevealed = !!revealedPasswords[school.id];
                  const isCopied = copiedSchoolId === school.id;

                  return (
                    <tr key={school.id}>
                      <td data-label="المؤسسة / المدرسة">
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{school.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                            معرف: {school.code}
                          </div>
                        </div>
                      </td>

                      {/* Enhanced Credentials Box */}
                      <td data-label="بيانات الدخول">
                        <div
                          style={{
                            padding: '10px 12px',
                            backgroundColor: 'var(--color-bg-surface-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            minWidth: '220px',
                            boxShadow: 'var(--shadow-xs)',
                          }}
                        >
                          <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>المستخدم:</span>
                            <span
                              style={{
                                color: 'var(--color-primary)',
                                backgroundColor: 'var(--color-primary-light)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                              }}
                            >
                              {school.username}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>كلمة المرور:</span>
                            <span
                              style={{
                                color: 'var(--color-text-primary)',
                                backgroundColor: 'var(--color-bg-surface)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                                border: '1px solid var(--color-border)',
                                letterSpacing: isRevealed ? 'normal' : '2px',
                              }}
                            >
                              {isRevealed ? school.password : '••••••••'}
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                              marginTop: '2px',
                              paddingTop: '6px',
                              borderTop: '1px solid var(--color-border)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => togglePasswordReveal(school.id)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--color-bg-surface)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                              }}
                              title={isRevealed ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                            >
                              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                              <span>{isRevealed ? 'إخفاء' : 'إظهار'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => copyCredentials(school)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: isCopied ? 'var(--color-success-bg)' : 'var(--color-primary-light)',
                                border: `1px solid ${isCopied ? 'var(--color-success)' : 'var(--color-primary)'}`,
                                color: isCopied ? 'var(--color-success)' : 'var(--color-primary)',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                              }}
                              title="نسخ بيانات الدخول للمدرسة"
                            >
                              {isCopied ? <CheckCircle size={13} /> : <Copy size={13} />}
                              <span>{isCopied ? 'تم النسخ ✓' : 'نسخ البيانات'}</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      <td data-label="قيمة الترخيص والولاية">
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.875rem' }}>
                          {formatDZD(school.revenueGenerated || 30000)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {school.wilaya} • {school.phone}
                        </div>
                      </td>

                      <td data-label="نهاية الاشتراك">
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                          {formatDateArabic(school.subscriptionEnd)}
                        </span>
                      </td>

                      <td data-label="حالة الترخيص">
                        <Badge variant={school.planStatus === 'active' ? 'success' : 'danger'}>
                          {school.planStatus === 'active' ? 'مفعلة ونشطة' : 'معطلة'}
                        </Badge>
                      </td>

                      <td data-label="التحكم في التفعيل">
                        <Button
                          variant={school.planStatus === 'active' ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => handleToggle(school.id)}
                        >
                          {school.planStatus === 'active' ? 'تعطيل المدرسة' : 'تفعيل فوري'}
                        </Button>
                      </td>

                      <td data-label="تمديد المدة">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedSchool(school);
                            setIsExtendModalOpen(true);
                          }}
                          rightIcon={<Clock size={13} />}
                        >
                          تمديد المدة
                        </Button>
                      </td>

                      <td data-label="حذف">
                        <Button
                          variant="ghost"
                          size="sm"
                          isIconOnly
                          title="حذف المدرسة وسجلاتها نهائياً"
                          onClick={() => setSchoolToDelete(school)}
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Delete School Confirmation Modal */}
      <Modal
        isOpen={!!schoolToDelete}
        onClose={() => setSchoolToDelete(null)}
        title="تأكيد حذف المدرسة وسجلاتها"
        description="تحذير أمني: سيتم حذف المدرسة وجميع حساباتها وسجلاتها المالية نهائياً!"
        maxWidth="460px"
        footer={
          <>
            <Button variant="danger" onClick={confirmDeleteSchool}>
              نعم، حذف المدرسة وسجلاتها
            </Button>
            <Button variant="secondary" onClick={() => setSchoolToDelete(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        {schoolToDelete && (
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <AlertTriangle size={24} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
              هل أنت متأكد من رغبتك في حذف مدرسة <strong>&quot;{schoolToDelete.name}&quot;</strong> (المستخدم: <code>{schoolToDelete.username}</code>)؟
              <br />
              <strong style={{ color: 'var(--color-danger)' }}>تنبيه:</strong> سيتم حذف كافة بيانات الدورات، التلاميذ، وسندات القبض المرتبطة بهذه المدرسة فورياً.
            </div>
          </div>
        )}
      </Modal>

      {/* Extend Duration Modal */}
      <Modal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        title={`تمديد اشتراك: ${selectedSchool?.name}`}
        description={`الاشتراك ينتهي حالياً في: ${selectedSchool?.subscriptionEnd}`}
      >
        <form onSubmit={handleExtend} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Select
            label="المدة المراد إضافتها للاشتراك"
            value={extendMonths}
            onChange={(e) => setExtendMonths(e.target.value)}
            options={[
              { value: '1', label: '+ شهر واحد (1 شهر)' },
              { value: '3', label: '+ 3 أشهر (ثلاثي)' },
              { value: '6', label: '+ 6 أشهر (نصف سنة)' },
              { value: '12', label: '+ 12 شهر (سنة كاملة)' },
              { value: '24', label: '+ سنتين (24 شهر)' },
            ]}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button type="submit" variant="primary">
              تأكيد التمديد وتحديث الترخيص
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsExtendModalOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add School Modal with Custom Credentials */}
      <Modal
        isOpen={isAddSchoolOpen}
        onClose={() => setIsAddSchoolOpen(false)}
        title="تسجيل مدرسة جديدة وتعيين بيانات الدخول"
        description="حدد اسم المدرسة وبيانات الدخول المخصصة (اسم المستخدم وكلمة المرور)"
        maxWidth="520px"
      >
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="اسم المدرسة أو المركز التعليمي"
            placeholder="مثال: أكاديمية النجاح والتفوق"
            value={newSchoolName}
            onChange={(e) => {
              setNewSchoolName(e.target.value);
              if (!newSchoolUsername) {
                setNewSchoolUsername(e.target.value.toLowerCase().replace(/\s+/g, '_').slice(0, 15));
              }
            }}
            required
            autoFocus
          />

          {/* Credentials Box */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--color-primary-light)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={15} />
              <span>بيانات الدخول المخصصة للمدرسة</span>
            </div>

            <Input
              label="اسم المستخدم"
              placeholder="مثال: najah_academy"
              value={newSchoolUsername}
              onChange={(e) => setNewSchoolUsername(e.target.value)}
              required
            />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>كلمة المرور المخصصة</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                  }}
                >
                  ↻ توليد كلمة سر عشوائية
                </button>
              </div>
              <Input
                placeholder="Pass2026@"
                value={newSchoolPassword}
                onChange={(e) => setNewSchoolPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="رقم الهاتف للتواصل"
              placeholder="0550 12 34 56"
              value={newSchoolPhone}
              onChange={(e) => setNewSchoolPhone(e.target.value)}
              required
            />
            <Input
              label="الولاية"
              placeholder="الجزائر العاصمة (16)"
              value={newSchoolWilaya}
              onChange={(e) => setNewSchoolWilaya(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="سعر الاشتراك / الترخيص (دج DZD)"
              type="number"
              placeholder="30000"
              value={newSchoolPrice}
              onChange={(e) => setNewSchoolPrice(e.target.value)}
              prefixIcon={<DollarSign size={16} />}
              required
            />

            <Select
              label="مدة صلاحية الترخيص الممنوحة"
              value={newSchoolDuration}
              onChange={(e) => setNewSchoolDuration(e.target.value)}
              options={[
                { value: '1', label: '1 شهر (تجريبي / شهري)' },
                { value: '3', label: '3 أشهر (ثلاثي)' },
                { value: '6', label: '6 أشهر (نصف سنوي)' },
                { value: '12', label: '12 شهر (سنة كاملة - افتراضي)' },
                { value: '24', label: '24 شهر (سنتين)' },
                { value: '36', label: '36 شهر (3 سنوات)' },
              ]}
            />
          </div>

          {/* Dynamic Summary Preview */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--color-bg-surface-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>الخطة المعتمدة والقيمة:</span>
              <strong style={{ color: 'var(--color-primary)' }}>الخطة الاحترافية ({formatDZD(Number(newSchoolPrice) || 30000)})</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>تاريخ انتهاء الترخيص المحسوب:</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>
                {(() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + (Number(newSchoolDuration) || 12));
                  return formatDateArabic(d.toISOString().split('T')[0]);
                })()}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button type="submit" variant="primary">
              تأكيد التسجيل وإنشاء بيانات الدخول
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsAddSchoolOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
