# brandguidelines.md

# School SaaS — Brand & UI Guidelines

## 1. Brand Direction

### Brand Personality

الهوية البصرية للمنتج يجب أن تعكس:

* Professional
* Calm
* Trustworthy
* Modern
* Organized
* Premium
* Simple
* Educational

المنتج موجه لأصحاب المدارس ومراكز التعليم، لذلك يجب أن يشعر المستخدم أن النظام:

> **موثوق، منظم، هادئ، وسهل الاستخدام.**

لا تستخدم أسلوبًا بصريًا طفوليًا أو ألوانًا تعليمية صارخة.

---

# 2. Design Philosophy

اعتمد المبدأ:

> **Calm SaaS Interface**

التصميم يجب أن يكون نظيفًا وهادئًا، مع استخدام اللون الأساسي بشكل محدود.

الأولوية:

```text
Clarity
↓
Hierarchy
↓
Consistency
↓
Functionality
↓
Decoration
```

لا تستخدم الزخرفة على حساب سهولة الاستخدام.

---

# 3. Typography

## Primary Font

استخدم:

> **IBM Sans Arabic**

في جميع أنحاء النظام.

يشمل:

* Headings
* Body
* Buttons
* Inputs
* Tables
* Navigation
* Cards
* Modals
* Notifications

لا تستخدم أكثر من عائلة Font واحدة في الواجهة.

---

## Font Weights

استخدم الأوزان حسب الحاجة:

* 400 — Regular
* 500 — Medium
* 600 — SemiBold
* 700 — Bold

الاستخدام:

### 400

النصوص العادية والمعلومات الثانوية.

### 500

Navigation / Labels / Secondary emphasis.

### 600

العناوين الصغيرة والأزرار.

### 700

العناوين الرئيسية والقيم المهمة.

لا تفرط في استخدام Bold.

---

# 4. Direction

النظام:

> RTL — Right to Left

يجب أن تكون جميع الصفحات RTL بشكل أصلي.

لا تعتمد على حلول CSS سطحية لعكس الواجهة.

الـLayout يجب أن يكون مصممًا للعربية من البداية.

---

# 5. Color Philosophy

الألوان هادئة ومحايدة.

تجنب:

* Neon colors
* Saturated gradients
* ألوان كثيرة
* الأحمر والأخضر في كل مكان
* Purple gradients
* ألوان قوية للخلفيات

الألوان الأساسية يجب أن تكون:

> Neutral + Deep Blue/Teal accent

---

# 6. Primary Color

### Deep Teal

```text
Primary: #176B67
Primary Hover: #125955
Primary Light: #E8F4F2
```

يستخدم في:

* Primary Buttons
* Active Navigation
* Links
* Selected states
* Important actions
* Brand accents

لا تجعل كل عناصر الواجهة باللون الأساسي.

---

# 7. Neutral Colors

## Background

```text
App Background: #F7F8FA
Surface: #FFFFFF
Surface Secondary: #F3F5F7
```

الصفحة الأساسية تكون:

> #F7F8FA

والـCards والجداول:

> #FFFFFF

---

## Text

```text
Primary Text: #172024
Secondary Text: #667278
Muted Text: #929CA1
Disabled Text: #B8BEC2
```

استخدم Primary Text للعناوين والمعلومات المهمة.

استخدم Secondary Text للمعلومات المساندة.

---

# 8. Borders

استخدم Borders خفيفة جدًا.

```text
Border: #E5E8EA
Border Strong: #D9DEE1
```

لا تعتمد على Shadows قوية للفصل بين العناصر.

الأفضل:

> Border + Surface contrast

---

# 9. Semantic Colors

استخدم الألوان الدلالية فقط عندما يكون لها معنى.

## Success

```text
Success: #2F7D5A
Success Background: #EAF6F0
```

الاستخدام:

* Paid
* Active
* Present
* Completed

---

## Warning

```text
Warning: #B7791F
Warning Background: #FFF7E6
```

الاستخدام:

* Pending
* Partially Paid
* Upcoming
* Attention required

---

## Danger

```text
Danger: #B94A48
Danger Background: #FCEEEE
```

الاستخدام:

* Failed
* Overdue
* Absent
* Delete
* Critical errors

---

## Info

```text
Info: #467A9B
Info Background: #EDF5FA
```

الاستخدام:

* Informational messages
* General notifications
* Help states

---

# 10. Color Usage Ratio

استخدم تقريبًا:

```text
70% Neutral
20% Surface / Gray
8% Primary
2% Semantic Colors
```

الألوان ليست للزينة.

كل لون يجب أن يكون له وظيفة.

---

# 11. Buttons

## Primary Button

Background:

```text
#176B67
```

Text:

```text
#FFFFFF
```

استخدامه:

* إضافة تلميذ
* تسجيل دفع
* حفظ
* إنشاء دورة

---

## Secondary Button

Background:

```text
#FFFFFF
```

Border:

```text
#E5E8EA
```

Text:

```text
#172024
```

---

## Ghost Button

بدون Border وبدون Background واضح.

يستخدم للإجراءات الثانوية.

---

## Danger Button

استخدمه فقط للعمليات الخطرة:

* حذف
* تعطيل
* إلغاء

لا تستخدم اللون الأحمر كعنصر جمالي.

---

# 12. Border Radius

اعتمد نظام Radius موحد.

```text
Small: 8px
Medium: 10px
Large: 14px
XL: 18px
```

الاستخدام:

### 8px

Inputs / Small buttons / Tags.

### 10px

Buttons / Dropdowns.

### 14px

Cards / Tables / Panels.

### 18px

Large containers / Modal الرئيسية.

تجنب الـborder-radius المبالغ فيه.

لا تجعل جميع العناصر Pills.

---

# 13. Shadows

استخدم Shadows خفيفة جدًا.

مثال:

```text
0 1px 3px rgba(23, 32, 36, 0.05)
```

Modal:

```text
0 12px 40px rgba(23, 32, 36, 0.12)
```

لا تستخدم Shadows قوية.

---

# 14. Cards

Cards يجب أن تكون بسيطة.

```text
Background: #FFFFFF
Border: #E5E8EA
Radius: 14px
```

يفضل Border خفيف بدل Shadow واضح.

---

# 15. Dashboard Cards

بطاقات الإحصائيات:

```text
┌─────────────────────────┐
│ إجمالي التلاميذ         │
│                         │
│ 428                     │
│ ↑ 8.4% هذا الشهر        │
└─────────────────────────┘
```

يجب أن تكون:

* واضحة
* قليلة
* سهلة القراءة

لا تستخدم Icon ضخم.

---

# 16. Sidebar

Sidebar هو عنصر أساسي في النظام.

يجب أن يكون:

* Clean
* Compact
* Stable
* Easy to scan

Background:

```text
#FFFFFF
```

Border:

```text
#E5E8EA
```

Active item:

```text
Background: #E8F4F2
Text: #176B67
```

Inactive:

```text
Text: #667278
```

---

# 17. Sidebar Structure

```text
الشعار

الرئيسية

الإدارة
  التلاميذ
  الأساتذة

التعليم
  الدورات
  الدعم
  الجدول
  القاعات
  الحضور

المالية
  المدفوعات
  الديون
  المصاريف
  مستحقات الأساتذة

التقارير

────────────────

الإعدادات
```

استخدم Sections واضحة.

---

# 18. Topbar

Topbar يحتوي على:

```text
Global Search
Notifications
School Switcher
User Menu
```

يجب ألا يكون مزدحمًا.

---

# 19. Tables

الجداول من أهم عناصر النظام.

يجب أن تكون:

* واضحة
* مريحة للعين
* سهلة البحث
* قابلة للتصفية

Header:

```text
Background: #F7F8FA
Text: #667278
```

Rows:

```text
Background: #FFFFFF
Border: #E5E8EA
```

Hover:

```text
#FAFBFB
```

لا تستخدم Zebra stripes بشكل مبالغ فيه.

---

# 20. Status Badges

استخدم Badges بسيطة.

### Paid

أخضر هادئ.

### Partially Paid

أصفر هادئ.

### Overdue

أحمر هادئ.

### Active

أخضر.

### Inactive

رمادي.

### Pending

أصفر.

لا تجعل الـBadge صارخًا.

---

# 21. Forms

Forms يجب أن تكون مريحة.

Label:

```text
Font Weight: 500
Color: #172024
```

Input:

```text
Background: #FFFFFF
Border: #D9DEE1
Radius: 10px
```

Focus:

```text
Border: #176B67
```

Placeholder:

```text
#929CA1
```

---

# 22. Input Height

اعتمد:

```text
Default: 44px
Large: 48px
Small: 36px
```

استخدم 44px كخيار افتراضي.

---

# 23. Modals

Modal يجب أن تكون بسيطة ومركزة.

```text
Background: #FFFFFF
Radius: 18px
```

Structure:

```text
Title
Description

Form / Content

Actions
```

لا تجعل Modal ضخمة بدون حاجة.

---

# 24. Empty States

لا تعرض صفحة فارغة.

مثلاً عند عدم وجود تلاميذ:

```text
لا يوجد تلاميذ بعد

ابدأ بإضافة أول تلميذ إلى المدرسة.

[ + إضافة تلميذ ]
```

استخدم Illustration بسيطة فقط إذا كانت مفيدة.

لا تستخدم رسومات طفولية.

---

# 25. Loading States

استخدم Skeleton Loading للبيانات الرئيسية.

لا تعرض Spinner في كل مكان.

يجب أن يشعر المستخدم أن النظام سريع.

---

# 26. Error States

رسائل الأخطاء:

* واضحة
* قصيرة
* مفهومة

بدل:

> Error 500

استخدم:

> حدث خطأ أثناء تحميل البيانات. حاول مرة أخرى.

---

# 27. Toast Notifications

استخدم Toasts للعمليات السريعة.

مثال:

> تم تسجيل الدفع بنجاح.

أو:

> تم تحديث بيانات التلميذ.

يجب أن تختفي تلقائيًا.

---

# 28. Icons

استخدم Icon Set واحد فقط في كامل النظام.

يفضل:

> Lucide Icons

خصائص الأيقونات:

* Simple
* Linear
* Consistent
* 1.5–2px stroke

لا تستخدم Icons مختلفة الأسلوب.

---

# 29. Icon Sizes

```text
16px — Table / Small actions
18px — Buttons
20px — Navigation
24px — Important UI
```

تجنب Icons ضخمة في Dashboard.

---

# 30. Spacing System

اعتمد نظام spacing ثابت:

```text
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
```

لا تستخدم قيمًا عشوائية.

---

# 31. Page Layout

كل صفحة يجب أن تحتوي على:

```text
Page Header
    ↓
Context / Filters
    ↓
Main Content
```

مثال:

```text
التلاميذ
إدارة جميع تلاميذ المدرسة

[بحث] [فلاتر]              [+ إضافة تلميذ]

────────────────────────────────

Students Table
```

---

# 32. Page Header

العنوان:

```text
Font Size: 24–28px
Weight: 700
```

الوصف:

```text
14–16px
Color: #667278
```

Primary Action يكون في الجهة المناسبة حسب RTL.

---

# 33. Responsive

Desktop:

Sidebar ثابت.

Tablet:

Sidebar يمكن تصغيره.

Mobile:

Sidebar يتحول إلى Drawer.

الجداول:

* لا تكسر التصميم
* استخدم horizontal scrolling عند الضرورة
* أو Responsive Cards للبيانات المهمة

---

# 34. Mobile Navigation

على الهاتف:

```text
☰
Logo
Page title

Content
```

لا تجعل Sidebar يأخذ مساحة الشاشة.

---

# 35. Financial UI

المالية تحتاج إلى وضوح خاص.

استخدم:

* DZD
* أرقام واضحة
* Thousands separators

مثال:

> 125,000 دج

بدل:

> 125000

الحالات المالية يجب أن تكون واضحة:

```text
Paid
Partially Paid
Unpaid
Overdue
```

لا تعتمد على اللون وحده؛ استخدم النص أيضًا.

---

# 36. Financial Dashboard

الإيرادات والمصاريف وصافي الدخل يجب أن تكون واضحة.

مثال:

```text
الإيرادات
485,000 دج

المصاريف
172,000 دج

صافي الدخل
313,000 دج
```

لا تستخدم تصميمًا صاخبًا للأرقام.

---

# 37. Charts

Charts يجب أن تكون:

* Minimal
* Clean
* Easy to read

استخدم Primary Color بشكل أساسي.

تجنب:

* 3D Charts
* Gradients
* ألوان كثيرة
* Charts بدون معنى

---

# 38. Accessibility

يجب مراعاة:

* Contrast جيد
* Focus states
* Keyboard navigation
* Labels واضحة
* Buttons لها أسماء واضحة
* عدم الاعتماد على اللون وحده

---

# 39. Animation

استخدم Animation خفيفة فقط.

Transitions:

```text
150–200ms
```

استخدمها في:

* Hover
* Dropdown
* Modal
* Sidebar
* Toast

لا تستخدم animations مبالغ فيها.

---

# 40. Design Don'ts

لا تستخدم:

❌ Neon colors
❌ Glassmorphism مبالغ فيه
❌ Heavy gradients
❌ Huge rounded cards
❌ Excessive shadows
❌ Cartoon illustrations
❌ Excessive animations
❌ أكثر من خط
❌ أكثر من 4–5 ألوان أساسية
❌ واجهات مزدحمة
❌ Text صغير جدًا

---

# 41. Overall Visual Reference

التصميم النهائي يجب أن يقع بصريًا بين:

```text
Modern SaaS
        +
Fintech clarity
        +
Education professionalism
```

لكن دون نسخ تصميم أي منتج موجود.

الهدف هو بناء هوية مستقلة للمنتج.

---

# 42. Design Priority

عند التعارض بين الجمال وسهولة الاستخدام:

> اختر سهولة الاستخدام.

عند التعارض بين كثرة المعلومات ووضوحها:

> اختر الوضوح.

عند التعارض بين Animation والأداء:

> اختر الأداء.

---

# 43. Final Visual Identity

الهوية النهائية:

```text
Font:
IBM Sans Arabic

Direction:
RTL

Primary:
#176B67

Background:
#F7F8FA

Surface:
#FFFFFF

Text:
#172024

Secondary:
#667278

Border:
#E5E8EA

Success:
#2F7D5A

Warning:
#B7791F

Danger:
#B94A48

Info:
#467A9B
```

الشعور المطلوب:

> **هادئ — موثوق — احترافي — منظم — حديث.**

يجب أن يبدو المنتج كـ **SaaS تجاري حقيقي جاهز للبيع للمدارس**، وليس مشروعًا جامعيًا أو Dashboard تجريبيًا.
