import React, { useState, useEffect } from 'react';
import { School, ShieldCheck, Lock, User as UserIcon, AlertCircle, Eye, EyeOff, CheckSquare, Square, FileText, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useData } from '../../contexts/DataContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../contexts/ToastContext';
import { supabaseService } from '../../services/supabaseService';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { switchSchool } = useSchool();
  const { schools } = useData();
  const { success } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Legal Modals State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Load saved username on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('school_epr_remembered_user');
    if (savedUser) {
      setIdentifier(savedUser);
      setRememberMe(true);
    }
  }, []);

  const normalizeArabic = (text: string) => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[إأآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '') // remove harakat
      .replace(/\s+/g, ' ');
  };

  const findSchool = (schoolList: typeof schools, ident: string) => {
    const cleanIdent = ident.trim().toLowerCase();
    const normIdent = normalizeArabic(ident);
    const numericPhone = cleanIdent.replace(/[^0-9]/g, '');

    return schoolList.find((s) => {
      const u = s.username?.trim().toLowerCase();
      const n = s.name ? normalizeArabic(s.name) : '';
      const c = s.code?.trim().toLowerCase();
      const e = s.email?.trim().toLowerCase();
      const p = s.phone ? s.phone.replace(/[^0-9]/g, '') : '';

      return (
        u === cleanIdent ||
        normIdent === n ||
        s.name?.trim().toLowerCase() === cleanIdent ||
        c === cleanIdent ||
        e === cleanIdent ||
        (numericPhone.length >= 8 && p.includes(numericPhone))
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const cleanPass = password.trim();

    // 1. Try finding in current schools state
    let matchedSchool = findSchool(schools, identifier);

    // 2. If not found, try dynamic refresh from Supabase
    if (!matchedSchool) {
      try {
        const freshSchools = await supabaseService.fetchSchools();
        if (freshSchools && freshSchools.length > 0) {
          matchedSchool = findSchool(freshSchools, identifier);
        }
      } catch (err) {
        console.warn('Fallback fetch failed:', err);
      }
    }

    if (!matchedSchool) {
      setErrorMessage('اسم المستخدم أو المدرسة غير مسجل في النظام. يرجى التأكد من كتابة اسم المستخدم (مثل: global) أو اسم المدرسة الصحيح.');
      setIsLoading(false);
      return;
    }

    if (matchedSchool.password !== cleanPass) {
      setErrorMessage('كلمة المرور غير صحيحة. يرجى التحقق والمحاولة مجدداً.');
      setIsLoading(false);
      return;
    }

    if (matchedSchool.planStatus === 'suspended') {
      setErrorMessage('عذراً، ترخيص هذه المدرسة معطل حالياً من طرف إدارة المنصة. يرجى التواصل مع الدعم الفني.');
      setIsLoading(false);
      return;
    }

    // Handle Remember Me
    if (rememberMe) {
      localStorage.setItem('school_epr_remembered_user', identifier.trim());
    } else {
      localStorage.removeItem('school_epr_remembered_user');
    }

    // Successful Login
    switchSchool(matchedSchool.id);
    login(matchedSchool.name, matchedSchool.email, matchedSchool.id);
    success(`مرحباً بكم في نظام إدارة "${matchedSchool.name}"!`, 'تسجيل دخول ناجح');
    setIsLoading(false);
  };

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
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-text-inverse)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4) auto',
              boxShadow: '0 4px 12px rgba(23, 107, 103, 0.25)',
            }}
          >
            <School size={30} />
          </div>

          <h1
            style={{
              fontSize: '1.4375rem',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              marginBottom: '6px',
              letterSpacing: '-0.01em',
            }}
          >
            تسجيل الدخول للمؤسسة
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            أدخل اسم المستخدم وكلمة المرور للوصول إلى لوحة الإدارة
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              color: 'var(--color-danger)',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              animation: 'fadeIn 150ms ease',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="اسم المستخدم"
            type="text"
            placeholder="اسم مستخدم المدرسة أو الرمز"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            prefixIcon={<UserIcon size={17} />}
            required
            autoFocus
          />

          <Input
            label="كلمة المرور"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            prefixIcon={<Lock size={17} />}
            suffixIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: showPassword ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'color var(--transition-fast)',
                }}
                tabIndex={-1}
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            required
          />

          {/* Remember Me Checkbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
              <span>تذكر بيانات الدخول</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
            style={{
              marginTop: 'var(--space-2)',
              height: '46px',
              fontSize: '0.9375rem',
              fontWeight: 700,
            }}
          >
            دخول إلى لوحة إدارة المدرسة
          </Button>
        </form>

        {/* Security badge & Legal Footer */}
        <div
          style={{
            marginTop: 'var(--space-6)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: 'var(--color-text-muted)',
            }}
          >
            <ShieldCheck size={16} color="var(--color-success)" />
            <span>منصة تعليمية مشفرة ومؤمنة بالكامل</span>
          </div>

          {/* Privacy Policy & Terms of Service Links */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-3)',
              color: 'var(--color-text-muted)',
              marginTop: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                padding: '2px 4px',
                textDecoration: 'underline',
              }}
            >
              سياسة الخصوصية
            </button>

            <span>•</span>

            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                padding: '2px 4px',
                textDecoration: 'underline',
              }}
            >
              الشروط والأحكام
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="سياسة الخصوصية وحماية البيانات"
        description="التزامنا بحماية سرية وأمان بيانات مؤسستكم التعليمية"
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <p>
            نلتزم بحماية سرية وأمان كافة بيانات مؤسستكم التعليمية، بما في ذلك سجلات الأساتذة، بيانات التلاميذ، والمعاملات المالية. يتم تشفير البيانات وتخزينها بشكل معزول تماماً، ولا يتم مشاركتها مع أي طرف ثالث.
          </p>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--color-bg-surface-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-primary)',
            }}
          >
            لمزيد من التفاصيل والبنود الرسمية، <strong>كل شيء موجود في العقد الذي لديكم منه النسخة</strong>.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button variant="primary" size="sm" onClick={() => setShowPrivacyModal(false)}>
              فهمت ذلك
            </Button>
          </div>
        </div>
      </Modal>

      {/* Terms and Conditions Modal */}
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="الشروط والأحكام"
        description="شروط وضوابط استخدام المنصة والخدمات الإدارية"
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <p>
            يُمنح ترخيص استخدام هذا النظام الإداري وفق مدة وخطة الاشتراك المعتمدة، وتتحمل إدارة المدرسة المسؤولية الكاملة عن الحفاظ على سرية بيانات الدخول وصحة السجلات المالية والتربوية المدخلة.
          </p>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--color-bg-surface-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-primary)',
            }}
          >
            تخضع كافة حقوق والتزامات الطرفين للاتفاقية المبرمة، و<strong>كل شيء موجود في العقد الذي لديكم منه النسخة</strong>.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button variant="primary" size="sm" onClick={() => setShowTermsModal(false)}>
              موافق
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
