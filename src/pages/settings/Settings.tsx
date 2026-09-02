import React, { useState } from 'react';
import {
  Building,
  CreditCard,
  Shield,
  Save,
  CheckCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

export interface SettingsProps {
  onNavigate?: (page: string) => void;
}

export const Settings: React.FC<SettingsProps> = () => {
  const { currentSchool, updateSchoolProfile } = useSchool();
  const { success } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'finance' | 'security'>('profile');

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
                    الدفع نقداً فقط (Cash Only)
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

      {activeTab === 'security' && (
        <Card title="معلومات ترخيص المنصة">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-success)', fontWeight: 600, fontSize: '0.875rem' }}>
              <Shield size={20} />
              <span>ترخيص المنصة ساري المفعول</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              الخطة المعتمدة: <strong>الخطة الاحترافية (30,000 دج)</strong> • معرف المؤسسة: <code style={{ backgroundColor: 'var(--color-bg-surface-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{currentSchool.code}</code>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
