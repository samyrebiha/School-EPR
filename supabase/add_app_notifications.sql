-- ====================================================================
-- جدول التنبيهات والتحديثات والرسائل الإدارية (App Notifications)
-- يمكن إرسال الرسائل والتحديثات مباشرة عبر هذا السكربت في Supabase SQL Editor
-- ====================================================================

-- 1. إنشاء جدول الإشعارات والتحديثات
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id TEXT, -- اختياري: اتركه NULL لتصل الرسالة لجميع المدارس، أو ضع معرّف مدرسة معينة
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'update', -- 'update' (تحديث جديد), 'announcement' (إعلان إداري), 'alert' (تنبيه هام), 'info' (معلومة)
    sender VARCHAR(100) DEFAULT 'إدارة النظام',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. إنشاء فهارس سريعة
CREATE INDEX IF NOT EXISTS idx_notifications_is_active ON public.app_notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON public.app_notifications(school_id);

-- 3. تفعيل الأمان وسياسات القراءة والكتابة
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Select Notifications" ON public.app_notifications;
CREATE POLICY "Allow Select Notifications" ON public.app_notifications 
    FOR SELECT TO anon, authenticated 
    USING (is_active = true);

DROP POLICY IF EXISTS "Allow All Notifications" ON public.app_notifications;
CREATE POLICY "Allow All Notifications" ON public.app_notifications 
    FOR ALL TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- 4. تمكين البث المباشر (Realtime) للجدول لتصل الرسالة فوراً للجرس دون إعادة تحميل الصفحة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'app_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- إذا كان مفعلاً بالفعل
END $$;

-- ====================================================================
-- أمثلة جاهزة للإرسال عبر SQL Editor (انسخ وعدّل حسب رغبتك):
-- ====================================================================

-- مثال 1: إرسال تحديث جديد للمنصة لجميع المدارس
-- INSERT INTO public.app_notifications (title, message, type, sender)
-- VALUES (
--   'تحديث جديد للنظام 🚀',
--   'تم تحديث المنصة بنجاح! تم إضافة كشف الحضور بصيغة PDF وقابلية طي القائمة الجانبية وجرس الإشعارات الفوري.',
--   'update',
--   'فريق التطوير'
-- );

-- مثال 2: إرسال تنبيه إداري هام
-- INSERT INTO public.app_notifications (title, message, type, sender)
-- VALUES (
--   'تنبيه بخصوص نهاية الدورة الشهرية ⚠️',
--   'يرجى من جميع موظفي الاستقبال مراجعة تسوية ديون التلاميذ وتأكيد حضور حصص نهاية الأسبوع.',
--   'alert',
--   'الإدارة العامة'
-- );

-- مثال 3: رسالة مخصصة لمدرسة معينة فقط (باستخدام school_id)
-- INSERT INTO public.app_notifications (school_id, title, message, type, sender)
-- VALUES (
--   'school-1788371708568',
--   'رسالة خاصة بمدرستكم 📢',
--   'مرحباً بكم، تم تفعيل الميزات الجديدة الخاصة بحساب مدرستكم بنجاح.',
--   'info',
--   'الدعم الفني'
-- );
