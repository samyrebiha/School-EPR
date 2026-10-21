import React, { useState, useEffect } from 'react';
import {
  Building,
  CreditCard,
  Shield,
  Save,
  CheckCircle,
  Type,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTypography } from '../../contexts/TypographyContext';
import { formatDateArabic } from '../../utils/formatters';

export interface SettingsProps {
  onNavigate?: (page: string) => void;
}

export const Settings: React.FC<SettingsProps> = () => {
  const { currentSchool, updateSchoolProfile } = useSchool();
  const { isReceptionMode } = useAuth();
  const { success } = useToast();
  const {
    currentFontId,
    currentFontSizeId,
    currentFont,
    currentFontSize,
    changeFont,
    changeFontSize,
    availableFonts,
    availableFontSizes,
  } = useTypography();

  const [activeTab, setActiveTab] = useState<'profile' | 'finance' | 'typography' | 'security'>(
    isReceptionMode ? 'typography' : 'profile'
  );

  // School Form State
  const [name, setName] = useState(currentSchool.name);
  const [logoText, setLogoText] = useState(currentSchool.logoText);
  const [phone, setPhone] = useState(currentSchool.phone);
  const [email, setEmail] = useState(currentSchool.email);
  const [address, setAddress] = useState(currentSchool.address);
  const [wilaya, setWilaya] = useState(currentSchool.wilaya);
  const [receiptFooter, setReceiptFooter] = useState(
    'شكرًا لثقتكم بمؤسستنا التعليمية. يرجى الاحتفاظ بهذا الوصل النقدي للاستظهار به عند الحاجة.'
  );

  useEffect(() => {
    setName(currentSchool.name);
    setLogoText(currentSchool.logoText);
    setPhone(currentSchool.phone);
    setEmail(currentSchool.email);
    setAddress(currentSchool.address);
    setWilaya(currentSchool.wilaya);
  }, [currentSchool]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchoolProfile({
      name,
      logoText,
      phone,
      email,
      address,
      wilaya,
    });
    success('تم حفظ وتحديث بيانات المدرسة بنجاح!', 'تم الحفظ');
  };

  const handleSaveFinance = (e: React.FormEvent) => {
    e.preventDefault();
    success('تم حفظ إعدادات الدفع النقدي ونصوص الإيصالات بنجاح!', 'تم الحفظ');
  };

  return (
    <div>
      <PageHeader
        title="إعدادات المؤسسة"
        description="تهيئة الملف التعريفي، طريقة الدفع النقدي المعتمدة، ونصوص الإيصالات الرسمية"
      />

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-6)',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '10px 16px',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'profile' ? 600 : 500,
            color: activeTab === 'profile' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'profile' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Building size={16} />
          <span>ملف المؤسسة</span>
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          style={{
            padding: '10px 16px',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'finance' ? 600 : 500,
            color: activeTab === 'finance' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'finance' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <CreditCard size={16} />
          <span>طرق الدفع والإيصالات</span>
        </button>

        <button
          onClick={() => setActiveTab('typography')}
          style={{
            padding: '10px 16px',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'typography' ? 600 : 500,
            color: activeTab === 'typography' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'typography' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Type size={16} />
          <span>الخط والمظهر</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          style={{
            padding: '10px 16px',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'security' ? 600 : 500,
            color: activeTab === 'security' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'security' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Shield size={16} />
          <span>الأمان والترخيص</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'profile' && (
        <Card title="بيانات المؤسسة والشعار">
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '680px' }}>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
              <Input
                label="اسم المدرسة أو المركز"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="الاسم المختصر (الشعار)"
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
              <Input
                label="رقم الهاتف للتواصل"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Input
                label="البريد الإلكتروني الرسمي"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
              <Input
                label="العنوان"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
              <Input
                label="الولاية"
                value={wilaya}
                onChange={(e) => setWilaya(e.target.value)}
                required
              />
            </div>

            <div style={{ paddingTop: 'var(--space-2)' }}>
              <Button type="submit" variant="primary" rightIcon={<Save size={16} />}>
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'finance' && (
        <Card title="طريقة الدفع المعتمدة ونصوص الإيصالات">
          <form onSubmit={handleSaveFinance} style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '680px' }}>
            {/* Cash Only Banner */}
            <div
              style={{
                padding: '16px 18px',
                backgroundColor: 'var(--color-primary-light)',
                border: '1px solid var(--color-primary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={22} color="var(--color-primary)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-primary)' }}>
                    الدفع نقداً
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    تم تفعيل الدفع نقداً كطريقة حصرية لمعاملات وسندات قبض المؤسسة
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                مفعل وحصري
              </span>
            </div>

            <Textarea
              label="نص تذييل الإيصالات الرسمية القابلة للطباعة"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
            />

            <Button type="submit" variant="primary" style={{ alignSelf: 'flex-start' }} rightIcon={<Save size={16} />}>
              حفظ إعدادات المالية
            </Button>
          </form>
        </Card>
      )}

      {/* Tab: Typography & Appearance */}
      {activeTab === 'typography' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '840px' }}>
          <Card
            title="إعدادات الخط"
            description="تخصيص نوع الخط وحجمه في كافة واجهات المنصة"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              
              {/* Section 1: Font Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '10px' }}>
                  نوع الخط
                </label>
                
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                  }}
                  className="sm:grid-cols-1"
                >
                  {availableFonts.map((f) => {
                    const isSelected = currentFontId === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => changeFont(f.id)}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          backgroundColor: isSelected ? 'var(--color-primary-light, rgba(23, 107, 103, 0.08))' : 'var(--color-bg-surface)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                            {f.name}
                          </span>
                          {isSelected ? (
                            <span
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-primary)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Check size={12} strokeWidth={3} />
                            </span>
                          ) : (
                            <span
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: '1.5px solid var(--color-border)',
                              }}
                            />
                          )}
                        </div>

                        <div
                          style={{
                            fontFamily: f.fontFamily,
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            lineHeight: 1.5,
                            marginTop: '2px',
                          }}
                        >
                          {f.sampleText}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Font Size Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '10px' }}>
                  حجم الخط
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '10px',
                  }}
                  className="sm:grid-cols-2"
                >
                  {availableFontSizes.map((s) => {
                    const isSelected = currentFontSizeId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => changeFontSize(s.id)}
                        style={{
                          padding: '12px 8px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          backgroundColor: isSelected ? 'var(--color-primary-light, rgba(23, 107, 103, 0.08))' : 'var(--color-bg-surface)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                          {s.label}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {s.sizePx}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Live Preview */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '10px' }}>
                  معاينة مباشرة
                </label>

                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-surface-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        مؤسسة {currentSchool.name}
                      </h4>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        فوج الرياضيات — الأستاذ سليم بوقرة
                      </p>
                    </div>

                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {currentFont.name} • {currentFontSize.label}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '10px',
                    }}
                    className="sm:grid-cols-1"
                  >
                    <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>عدد التلاميذ</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>24 تلميذ</div>
                    </div>
                    <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>الاشتراك الشهري</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>2,000 دج</div>
                    </div>
                    <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>التوقيت</div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '4px' }}>السبت والثلاثاء (05:00 مساءً)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  onClick={() => {
                    success('تم حفظ إعدادات الخط بنجاح', 'تم الحفظ');
                  }}
                >
                  حفظ الإعدادات
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    changeFont('cairo');
                    changeFontSize('md');
                    success('تمت استعادة خط Cairo القياسي', 'إعادة التعيين');
                  }}
                >
                  استعادة الافتراضي (Cairo)
                </Button>
              </div>

            </div>
          </Card>
        </div>
      )}

      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '840px' }}>
          {/* Main License Status Card */}
          <Card title="معلومات ترخيص المنصة وبيانات الاعتماد">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header Status Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-success)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Shield size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.9375rem' }}>
                      ترخيص النظام معتمد وساري المفعول
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      نظام إداري معتمد للمؤسسات التعليمية ومراكز التدريس والدعم المدرسي
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-success)',
                      color: '#FFF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    ترخيص نشط وموثق
                  </span>
                </div>
              </div>

              {/* General Institution & License Data Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}
                className="md:grid-cols-1"
              >
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--color-bg-surface-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    المؤسسة المرخصة
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                    {currentSchool.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {currentSchool.wilaya}
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--color-bg-surface-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    المعرف الرقمي للمؤسسة (Tenant Code)
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                    {currentSchool.code}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    معرف الحساب المعتمد في السحابة
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--color-bg-surface-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    صلاحية وسريان الترخيص
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-success)' }}>
                    ساري المفعول
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    حتى: {currentSchool.subscriptionEnd ? formatDateArabic(currentSchool.subscriptionEnd) : 'مفعل سنوياً'}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Legal Notice & Terms of Usage Card */}
          <Card title="البنود القانونية واتفاقية استخدام النظام">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8125rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <CheckCircle size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>1. حق الاستخدام القانوني الممنوح:</strong> يُمنح هذا الترخيص حصرياً لمؤسسة &quot;{currentSchool.name}&quot; لاستخدام النظام في إدارة أنشطتها التربوية، تسجيل التلاميذ، متابعة الحضور والغياب، وإصدار الوصولات المالية وإدارة أتعاب الأساتذة وفق مدة العقد المبرم مع إدارة المنصة.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <CheckCircle size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>2. حماية وسرية البيانات والخصوصية:</strong> تلتزم المنصة بأعلى معايير الأمان والتشفير لحماية سرية بيانات التلاميذ وأولياء أمورهم والأساتذة والسجلات المالية. لا يتم مشاركة أو بيع أي بيانات لأي طرف ثالث، وتظل البيانات ملكية خاصة وتامة للمؤسسة.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <CheckCircle size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>3. حقوق الملكية الفكرية والتصميم:</strong> جميع عناصر المنصة البرمجية، والتصاميم، والخوارزميات المحاسبية، وحقوق التأليف محمية بموجب التشريعات الوطنية والدولية الخاصة بحماية الملكية الفكرية والبرمجيات الرقمية. يُحظر نسخ، إعادة هندسة، أو إعادة توزيع أي جزء من النظام دون إذن كتابي مسبق.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <CheckCircle size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>4. مسؤولية البيانات والدعم الفني:</strong> تقع المسؤولية الكاملة على إدارة المؤسسة فيما يخص دقة وصحة البيانات المدخلة في النظام والحفاظ على سرية بيانات حسابات الدخول. يشمل الترخيص الدعم التقني والتحديثات الدورية للنظام طيلة فترة الترخيص المعتمدة.
                </div>
              </div>
            </div>
          </Card>

          {/* Technical System Information */}
          <Card title="المواصفات التقنية والمعلومات العامة">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                fontSize: '0.75rem',
              }}
              className="sm:grid-cols-2"
            >
              <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>نوع النظام</div>
                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>منصة سحابية متكاملة (SaaS)</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>إصدار المنصة</div>
                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>v2.4 (Enterprise Ed.)</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>أمن وتشفير البيانات</div>
                <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>SSL / End-to-End Encrypted</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>الدعم والتحديثات</div>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>مشمول ونشط</div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
