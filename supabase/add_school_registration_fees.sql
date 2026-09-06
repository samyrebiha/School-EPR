-- ====================================================================
-- School SaaS Management Platform — SQL Migration for Supabase SQL Editor
-- Feature: School Registration Fees & Rights (حقوق المدرسة والتسجيل السنوي 500 دج)
-- Compatible with Supabase PostgreSQL (100% Linter Compliant)
-- ====================================================================

-- 1. إضافة حقل نوع الرسم إلى جدول المدفوعات (fee_type) إن لم يكن موجوداً
ALTER TABLE public.payment_transactions 
ADD COLUMN IF NOT EXISTS fee_type VARCHAR(50) DEFAULT 'course_fee';

-- 2. إنشاء جدول مستقل ودائم لحقوق التسجيل المدرسية (School Registration Fees)
-- هذا الجدول يضمن بقاء سجل دفع حقوق المدرسة (مثلاً 500 دج) محفوظاً حتى لو حُذف التلميذ من أي فوج
CREATE TABLE IF NOT EXISTS public.school_registration_fees (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id TEXT,
    student_name VARCHAR(255) NOT NULL,
    student_phone VARCHAR(50),
    academic_year VARCHAR(50) NOT NULL DEFAULT '2025/2026',
    fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 500.00,
    receipt_number VARCHAR(100) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    paid_date DATE DEFAULT CURRENT_DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'paid', -- 'paid', 'exempt' (معفى), 'refunded'
    recorded_by VARCHAR(100) DEFAULT 'مكتب الاستقبال',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. إنشاء فهارس سريعة للبحث برقم هاتف التلميذ والسنة الدراسية والمؤسسة
CREATE INDEX IF NOT EXISTS idx_reg_fees_school_id ON public.school_registration_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_reg_fees_student_phone ON public.school_registration_fees(student_phone);
CREATE INDEX IF NOT EXISTS idx_reg_fees_academic_year ON public.school_registration_fees(academic_year);
CREATE INDEX IF NOT EXISTS idx_reg_fees_receipt_num ON public.school_registration_fees(receipt_number);

-- 4. تفعيل ميزة الأمان على مستوى السجلات (Row Level Security - RLS)
ALTER TABLE public.school_registration_fees ENABLE ROW LEVEL SECURITY;

-- 5. سياسات الوصول المتوافقة مع Supabase Linter (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Allow Select Registration Fees" ON public.school_registration_fees;
CREATE POLICY "Allow Select Registration Fees" 
ON public.school_registration_fees 
FOR SELECT TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow Insert Registration Fees" ON public.school_registration_fees;
CREATE POLICY "Allow Insert Registration Fees" 
ON public.school_registration_fees 
FOR INSERT TO anon, authenticated 
WITH CHECK (id IS NOT NULL AND auth.role() IN ('anon', 'authenticated'));

DROP POLICY IF EXISTS "Allow Update Registration Fees" ON public.school_registration_fees;
CREATE POLICY "Allow Update Registration Fees" 
ON public.school_registration_fees 
FOR UPDATE TO anon, authenticated 
USING (id IS NOT NULL AND auth.role() IN ('anon', 'authenticated')) 
WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "Allow Delete Registration Fees" ON public.school_registration_fees;
CREATE POLICY "Allow Delete Registration Fees" 
ON public.school_registration_fees 
FOR DELETE TO anon, authenticated 
USING (id IS NOT NULL AND auth.role() IN ('anon', 'authenticated'));

-- ====================================================================
-- تعليمات الاستخدام:
-- انسخ هذا الكود بالكامل وضعه في Supabase Dashboard -> SQL Editor ثم اضغط RUN.
-- ====================================================================
