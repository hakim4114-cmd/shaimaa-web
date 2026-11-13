import type { Dictionary } from "./en";

const ar: Dictionary = {
  app: {
    name: "Merchant OS",
    tagline: "إدارة عمليات التجارة بالدفع عند الاستلام"
  },
  nav: {
    groups: { operations: "العمليات", catalog: "الكتالوج", money: "المال", growth: "النمو", system: "النظام" },
    commandCenter: "لوحة القيادة",
    orders: "الطلبات",
    shipping: "الشحن",
    returns: "المرتجعات",
    customers: "العملاء",
    support: "خدمة العملاء",
    products: "المنتجات",
    inventory: "المخزون",
    production: "الإنتاج",
    finance: "المالية",
    cod: "التحصيلات",
    marketing: "التسويق",
    assistant: "المساعد الذكي",
    settings: "الإعدادات",
    designSystem: "نظام التصميم",
    comingInPhase: "المرحلة {phase}",
    collapse: "طي الشريط الجانبي",
    expand: "توسيع الشريط الجانبي",
    openMenu: "فتح القائمة",
    closeMenu: "إغلاق القائمة"
  },
  topbar: {
    search: "بحث…",
    searchShortcut: "Ctrl K",
    searchPlaceholder: "ابحث في الصفحات والإجراءات",
    searchEmpty: "لا توجد نتائج.",
    searchAvailable: "الصفحات",
    searchSoon: "غير متوفر بعد",
    notifications: "الإشعارات",
    notificationsEmpty: "لا جديد",
    notificationsEmptyHint: "ستظهر هنا تنبيهات المخزون والطلبات المتأخرة وتذكيرات التحصيل.",
    preferences: "التفضيلات",
    theme: "المظهر",
    themeLight: "فاتح",
    themeDark: "داكن",
    themeSystem: "حسب النظام",
    language: "اللغة"
  },
  commandCenter: {
    title: "لوحة القيادة",
    description: "نظرة شاملة على نشاطك، محسوبة من الطلبات والمخزون والتحصيلات الفعلية.",
    setupTitle: "اربط قاعدة البيانات للبدء",
    setupDescription:
      "لا يعرض Merchant OS أرقامًا وهمية أبدًا. ستظهر المؤشرات هنا بعد ربط مشروع Supabase وتسجيل الطلبات.",
    stepProject: "أنشئ مشروع Supabase",
    stepMigrations: "طبّق ملفات الترحيل في supabase/migrations",
    stepEnv: "اضبط NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY",
    configured: "مُعدّ",
    notConfigured: "غير مُعدّ",
    manualStep: "خطوة يدوية",
    nextTitle: "الخطوة التالية",
    nextDescription: "تضيف المرحلة الثانية تسجيل الدخول والمنتجات والمخزون والطلبات والشحن والمرتجعات وتقارير التحصيل."
  },
  orderStatus: {
    new: "جديد",
    confirmation_pending: "في انتظار التأكيد",
    confirmed: "مؤكد",
    preparing: "قيد التحضير",
    ready_to_ship: "جاهز للشحن",
    shipped: "تم الشحن",
    delivered: "تم التسليم",
    cancelled: "ملغى",
    refused: "مرفوض",
    returned: "مُرتجع",
    exchange_requested: "طلب استبدال"
  },
  common: {
    cancel: "إلغاء",
    confirm: "تأكيد",
    save: "حفظ",
    delete: "حذف",
    close: "إغلاق",
    loading: "جارٍ التحميل…",
    required: "إلزامي",
    optional: "اختياري"
  },
  designSystem: {
    title: "نظام التصميم",
    description: "مرجع المكوّنات المشتركة. يظهر في بيئة التطوير فقط.",
    buttons: "الأزرار",
    inputs: "حقول النماذج",
    badges: "حالات الطلب",
    metrics: "بطاقات المؤشرات",
    table: "الجدول",
    feedback: "التنبيهات",
    emptyState: "الحالة الفارغة",
    skeleton: "هيكل التحميل",
    sampleLabel: "القيم أدناه أمثلة توضيحية ومُعلَّمة على هذا الأساس.",
    toastButton: "إظهار إشعار",
    toastMessage: "تم الحفظ",
    dialogButton: "حذف العنصر",
    dialogTitle: "حذف هذا العنصر؟",
    dialogDescription: "لا يمكن التراجع عن هذا الإجراء.",
    deleted: "تم حذف العنصر",
    fieldName: "اسم المنتج",
    fieldPrice: "السعر (درهم)",
    fieldNotes: "ملاحظات داخلية",
    fieldCity: "المدينة",
    hintPrice: "استخدم نقطة أو فاصلة للكسور، بدون فواصل الآلاف."
  }
};

export default ar;
