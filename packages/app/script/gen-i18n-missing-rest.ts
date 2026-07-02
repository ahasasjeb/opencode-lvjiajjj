import { readFile } from "node:fs/promises"
import path from "node:path"

const keys = JSON.parse(
  await readFile(path.join(import.meta.dir, "i18n-missing-translations.json"), "utf8"),
) as Record<string, Record<string, string>>
const ru = keys.ru
const da = keys.da
const es = keys.es
const de = keys.de
const fr = keys.fr

const ukJson = JSON.parse(
  await readFile(path.join(import.meta.dir, "../src/i18n/uk.json"), "utf8"),
) as Record<string, string>

const ukFromRu = Object.fromEntries(
  Object.entries(ru).map(([key, value]) => {
    if (key in ukJson) return [key, ukJson[key]]
    return [
      key,
      value
        .replaceAll("Переключиться на проект", "Перемкнути на проєкт")
        .replaceAll("Следующий проект", "Наступний проєкт")
        .replaceAll("Предыдущий проект", "Попередній проєкт")
        .replaceAll("Очистить", "Очистити")
        .replaceAll("Экспорт логов", "Експорт журналів")
        .replaceAll("Произошла ошибка при запуске локального сервера.", "Під час запуску локального сервера сталася помилка.")
        .replaceAll("Свернуть проекты сервера", "Згорнути проєкти сервера")
        .replaceAll("Развернуть проекты сервера", "Розгорнути проєкти сервера")
        .replaceAll("Вернуться к основной сессии.", "Назад до основної сесії.")
        .replaceAll("Сессии подагентов нельзя использовать для запросов.", "Сесії підагентів не можна надсилати запити.")
        .replaceAll("Эта сессия не найдена", "Цю сесію не знайдено")
        .replaceAll("Закрыть вкладку", "Закрити вкладку")
        .replaceAll(
          "Эта вкладка указывает на сессию, которой больше нет на этом сервере.",
          "Ця вкладка вказує на сесію, якої більше немає на цьому сервері.",
        )
        .replaceAll("Не удаётся подключиться к этому серверу", "Не вдається підключитися до цього сервера")
        .replaceAll("Добавить проект", "Додати проєкт")
        .replaceAll("Новый проект", "Новий проєкт")
        .replaceAll("Поиск проектов", "Пошук проєктів")
        .replaceAll("Рабочая область…", "Робоча область…")
        .replaceAll("Локальный репозиторий", "Локальний репозиторій")
        .replaceAll("Запустить сессию в", "Запустити сесію в")
        .replaceAll("Локально", "Локально")
        .replaceAll("Свернуть вопрос", "Згорнути питання")
        .replaceAll("{{count}} ожидающий вопрос", "{{count}} очікуване питання")
        .replaceAll("{{count}} ожидающих вопросов", "{{count}} очікуваних питань")
        .replaceAll("Восстановить вопрос", "Відновити питання")
        .replaceAll("Неизвестная сессия", "Невідома сесія")
        .replaceAll("Пользовательские агенты", "Користувацькі агенти")
        .replaceAll("Показывать выбор агента в редакторе", "Показувати вибір агента в редакторі")
        .replaceAll("Нижняя навигация", "Нижня навігація")
        .replaceAll("Новый макет и дизайн", "Новий макет і дизайн")
        .replaceAll("Масштабирование жестом", "Масштабування жестом")
        .replaceAll("Оболочка терминала", "Командна оболонка термінала")
        .replaceAll("только терминал", "тільки термінал")
        .replaceAll("Авто (по умолчанию)", "Авто (за замовчуванням)")
        .replaceAll("Дополнительно", "Додатково")
        .replaceAll("Загрузка...", "Завантаження...")
        .replaceAll("Установка...", "Встановлення...")
        .replaceAll("Нет открытых проектов", "Немає відкритих проєктів")
        .replaceAll("Откройте проект, чтобы начать", "Відкрийте проєкт, щоб почати")
        .replaceAll("дистрибутив", "дистрибутив")
        .replaceAll("Дистрибутив", "Дистрибутив")
        .replaceAll("Готов", "Готово")
        .replaceAll("готов", "готовий")
        .replaceAll("Проверка", "Перевірка")
        .replaceAll("Проверить снова", "Перевірити знову")
        .replaceAll("Обновить", "Оновити")
        .replaceAll("Обновление", "Оновлення")
        .replaceAll("Установить", "Установити")
        .replaceAll("Установка", "Встановлення")
        .replaceAll("Добавить", "Додати")
        .replaceAll("Добавление", "Додавання")
        .replaceAll("не найдено", "не знайдено")
        .replaceAll("неизвестно", "невідомо")
        .replaceAll("Путь:", "Шлях:")
        .replaceAll("Версия:", "Версія:")
        .replaceAll("Перезагрузите Windows", "Перезавантажте Windows")
        .replaceAll("не установлен", "не встановлено")
        .replaceAll("не смог проверить", "не вдалося перевірити")
        .replaceAll("недоступен", "недоступний")
        .replaceAll("Повторить запуск", "Повторити запуск"),
    ]
  }),
)

const noFromDa = Object.fromEntries(
  Object.entries(da).map(([key, value]) => [
    key,
    value
      .replaceAll("Skift til projekt", "Bytt til prosjekt")
      .replaceAll("Næste projekt", "Neste prosjekt")
      .replaceAll("Forrige projekt", "Forrige prosjekt")
      .replaceAll("Ryd", "Tøm")
      .replaceAll("Eksporter logfiler", "Eksporter logger")
      .replaceAll("session", "økt")
      .replaceAll("Session", "Økt")
      .replaceAll("sessioner", "økter")
      .replaceAll("Sessioner", "Økter")
      .replaceAll("projekt", "prosjekt")
      .replaceAll("Projekt", "Prosjekt")
      .replaceAll("Avanceret", "Avansert")
      .replaceAll("Downloader", "Laster ned")
      .replaceAll("Installerer", "Installerer"),
  ]),
)

const brFromEs = Object.fromEntries(
  Object.entries(es).map(([key, value]) => [
    key,
    value
      .replaceAll("Añadir", "Adicionar")
      .replaceAll("añadir", "adicionar")
      .replaceAll("Buscar", "Pesquisar")
      .replaceAll("buscar", "pesquisar")
      .replaceAll("sesión", "sessão")
      .replaceAll("Sesión", "Sessão")
      .replaceAll("sesiones", "sessões")
      .replaceAll("Sesiones", "Sessões")
      .replaceAll("proyecto", "projeto")
      .replaceAll("Proyecto", "Projeto")
      .replaceAll("proyectos", "projetos")
      .replaceAll("Crear", "Criar")
      .replaceAll("crear", "criar")
      .replaceAll("Avanzado", "Avançado")
      .replaceAll("Descargando", "Baixando")
      .replaceAll("Instalando", "Instalando")
      .replaceAll("Instalar", "Instalar"),
  ]),
)

const bsFromDe = Object.fromEntries(
  Object.entries(de).map(([key, value]) => [
    key,
    value
      .replaceAll("Projekt", "Projekat")
      .replaceAll("projekt", "projekat")
      .replaceAll("Sitzung", "Sesija")
      .replaceAll("sitzung", "sesija")
      .replaceAll("Sitzungen", "Sesije")
      .replaceAll("sitzungen", "sesije")
      .replaceAll("Erweitert", "Napredno")
      .replaceAll("Herunterladen", "Preuzimanje")
      .replaceAll("Wird installiert", "Instaliranje"),
  ]),
)

const ar: Record<string, string> = {
  "command.project.index": "التبديل إلى المشروع {{index}}",
  "command.project.next": "المشروع التالي",
  "command.project.previous": "المشروع السابق",
  "common.clear": "مسح",
  "error.page.action.exportLogs": "تصدير السجلات",
  "error.page.description.localServerStartup": "حدث خطأ أثناء بدء الخادم المحلي.",
  "home.server.collapse": "طي مشاريع الخادم",
  "home.server.expand": "توسيع مشاريع الخادم",
  "session.child.backToParent": "العودة إلى الجلسة الرئيسية.",
  "session.child.promptDisabled": "لا يمكن إرسال مطالبات إلى جلسات الوكيل الفرعي.",
  "session.error.notFound": "تعذر العثور على هذه الجلسة",
  "session.error.notFound.closeTab": "إغلاق التبويب",
  "session.error.notFound.description": "يشير هذا التبويب إلى جلسة لم تعد موجودة على هذا الخادم.",
  "session.error.serverConnection": "تعذر الاتصال بهذا الخادم",
  "session.new.project.add": "إضافة مشروع",
  "session.new.project.new": "مشروع جديد",
  "session.new.project.search": "البحث في المشاريع",
  "session.new.workspace.existing": "مساحة العمل…",
  "session.new.workspace.local": "مستودع محلي",
  "session.new.workspace.runIn": "تشغيل الجلسة في",
  "session.new.workspace.triggerLocal": "محلي",
  "session.question.minimize": "تصغير السؤال",
  "session.question.pending.one": "{{count}} سؤال معلق",
  "session.question.pending.other": "{{count}} أسئلة معلقة",
  "session.question.restore": "استعادة السؤال",
  "session.tab.unknown": "جلسة غير معروفة",
  "settings.general.row.mobileTitlebarBottom.description": "وضع شريط العنوان وتبويبات الجلسة في أسفل الشاشة على الجوال",
  "settings.general.row.mobileTitlebarBottom.title": "التنقل السفلي",
  "settings.general.row.newLayoutDesigns.description": "تفعيل التخطيط والصفحة الرئيسية والمحرر وواجهة الجلسة المعاد تصميمها",
  "settings.general.row.newLayoutDesigns.title": "تخطيط وتصاميم جديدة",
  "settings.general.row.pinchZoom.description": "السماح بالتكبير بقرص لوحة اللمس وCtrl+التمرير",
  "settings.general.row.pinchZoom.title": "التكبير بالقرص",
  "settings.general.row.shell.autoDefault": "تلقائي (افتراضي)",
  "settings.general.row.shell.description": "اختر الصدفة المستخدمة للطرفية. تُستخدم الصدفات المتوافقة أيضًا لاستدعاءات أدوات الوكيل.",
  "settings.general.row.shell.terminalOnly": "الطرفية فقط",
  "settings.general.row.shell.title": "صدفة الطرفية",
  "settings.general.row.showCustomAgents.description": "إظهار منتقي الوكيل في المحرر",
  "settings.general.row.showCustomAgents.title": "وكلاء مخصصون",
  "settings.general.row.showFileTree.description": "إظهار لوحة شجرة الملفات في الجلسات",
  "settings.general.row.showFileTree.title": "شجرة الملفات",
  "settings.general.row.showNavigation.description": "إظهار أزرار الرجوع والتقدم في شريط عنوان سطح المكتب",
  "settings.general.row.showNavigation.title": "عناصر التنقل",
  "settings.general.row.showSearch.description": "إظهار زر البحث ولوحة الأوامر في شريط العنوان",
  "settings.general.row.showSearch.title": "لوحة الأوامر",
  "settings.general.row.showStatus.description": "إظهار زر حالة الخادم في شريط العنوان",
  "settings.general.row.showStatus.title": "حالة الخادم",
  "settings.general.row.showTerminal.description": "إظهار زر الطرفية في شريط عنوان سطح المكتب",
  "settings.general.row.showTerminal.title": "الطرفية",
  "settings.general.section.advanced": "متقدم",
  "settings.updates.action.downloading": "جارٍ التنزيل...",
  "settings.updates.action.installing": "جارٍ التثبيت...",
  "sidebar.empty.description": "افتح مشروعًا للبدء",
  "sidebar.empty.title": "لا توجد مشاريع مفتوحة",
  "wsl.onboarding.adding": "جارٍ الإضافة...",
  "wsl.onboarding.allDistrosAdded": "تمت إضافة جميع التوزيعات المثبتة بالفعل.",
  "wsl.onboarding.checkAgain": "إعادة الفحص",
  "wsl.onboarding.checkingDistro": "جارٍ فحص {{distro}}...",
  "wsl.onboarding.checkingDistros": "جارٍ فحص التوزيعات...",
  "wsl.onboarding.checkingOpencode": "جارٍ فحص OpenCode...",
  "wsl.onboarding.checkingOpencodeIn": "جارٍ فحص OpenCode في {{distro}}...",
  "wsl.onboarding.checkingRuntime": "جارٍ فحص WSL...",
  "wsl.onboarding.chooseDistroFirst": "اختر توزيعة أولًا.",
  "wsl.onboarding.desktopVersion": "سطح المكتب {{version}}",
  "wsl.onboarding.distroNotInstalled": "لم يتم تثبيت {{distro}} بعد.",
  "wsl.onboarding.distroReady": "{{distro}} جاهز.",
  "wsl.onboarding.distroStatus.checking": "جارٍ الفحص...",
  "wsl.onboarding.distroStatus.missingTools": "bash وcurl مفقودان",
  "wsl.onboarding.distroStatus.opencodeMissing": "OpenCode غير مثبت",
  "wsl.onboarding.distroStatus.ready": "جاهز",
  "wsl.onboarding.distroStatus.unsupported": "غير مدعوم · استخدم WSL 2",
  "wsl.onboarding.finishingDistro": "جارٍ إنهاء إعداد {{distro}}.",
  "wsl.onboarding.install": "تثبيت",
  "wsl.onboarding.installDistro": "تثبيت توزيعة",
  "wsl.onboarding.installOpencode": "تثبيت OpenCode",
  "wsl.onboarding.installOpencodeIn": "تثبيت OpenCode في {{distro}}.",
  "wsl.onboarding.installWsl": "تثبيت WSL",
  "wsl.onboarding.installedDistros": "التوزيعات المثبتة",
  "wsl.onboarding.installing": "جارٍ التثبيت...",
  "wsl.onboarding.installingDistro": "جارٍ تثبيت {{distro}}...",
  "wsl.onboarding.listingDistros": "جارٍ سرد التوزيعات...",
  "wsl.onboarding.loadFailed": "تعذر تحميل حالة WSL.",
  "wsl.onboarding.loading": "جارٍ التحميل...",
  "wsl.onboarding.needAnotherDistro": "هل تحتاج توزيعة أخرى؟",
  "wsl.onboarding.needAnotherDistroHint": "ثبّت توزيعة Linux من كتالوج WSL",
  "wsl.onboarding.next": "التالي",
  "wsl.onboarding.noDistros": "لم يتم اكتشاف توزيعات بعد.",
  "wsl.onboarding.notFound": "غير موجود",
  "wsl.onboarding.openDistroOnce": "افتح {{distro}} مرة واحدة لإنهاء الإعداد.",
  "wsl.onboarding.openTerminal": "فتح الطرفية",
  "wsl.onboarding.opencodeReady": "OpenCode جاهز.",
  "wsl.onboarding.opencodeReadyIn": "OpenCode جاهز في {{distro}}.",
  "wsl.onboarding.path": "المسار: {{path}}",
  "wsl.onboarding.pickDistro": "اختر توزيعة أو ثبّت واحدة أدناه.",
  "wsl.onboarding.ready": "WSL جاهز.",
  "wsl.onboarding.refresh": "تحديث",
  "wsl.onboarding.required": "WSL مطلوب للمتابعة.",
  "wsl.onboarding.restartRequired": "يحتاج Windows إلى إعادة تشغيل لإنهاء تثبيت WSL.",
  "wsl.onboarding.searchDistros": "البحث في التوزيعات",
  "wsl.onboarding.step.distro": "اختر التوزيعة",
  "wsl.onboarding.step.opencode": "OpenCode",
  "wsl.onboarding.toolsRequired": "تحتاج هذه التوزيعة إلى bash وcurl.",
  "wsl.onboarding.unknown": "غير معروف",
  "wsl.onboarding.updateOpencode": "تحديث OpenCode",
  "wsl.onboarding.updateOpencodeIn": "تحديث OpenCode في {{distro}}.",
  "wsl.onboarding.updatingOpencode": "جارٍ تحديث OpenCode...",
  "wsl.onboarding.updatingOpencodeIn": "جارٍ تحديث OpenCode في {{distro}}...",
  "wsl.onboarding.version": "الإصدار: {{version}}",
  "wsl.onboarding.versionMismatch": "الإصدار المثبت لا يطابق إصدار تطبيق سطح المكتب.",
  "wsl.onboarding.windowsRestartRequired": "أعد تشغيل Windows لإنهاء تثبيت WSL، ثم أعد فتح OpenCode.",
  "wsl.onboarding.wsl2Required": "WSL 2 مطلوب.",
  "wsl.onboarding.wslNotInstalled.description":
    "WSL (Windows Subsystem for Linux) مطلوب قبل أن يتمكن OpenCode من إضافة خادم WSL",
  "wsl.onboarding.wslNotInstalled.title": "WSL غير مثبت",
  "wsl.onboarding.wslUnavailable.description": "تعذر على OpenCode التحقق من WSL على هذا الجهاز.",
  "wsl.onboarding.wslUnavailable.title": "WSL غير متاح",
  "wsl.server.add": "إضافة خادم WSL",
  "wsl.server.addShort": "إضافة WSL",
  "wsl.server.label": "WSL",
  "wsl.server.menu.label": "خادم WSL",
  "wsl.server.retryStart": "إعادة محاولة البدء",
  "wsl.server.updating": "جارٍ التحديث...",
}

const th: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(fr).map(([key, value]) => [
      key,
      value
        .replaceAll("Projet", "โปรเจกต์")
        .replaceAll("projet", "โปรเจกต์")
        .replaceAll("session", "เซสชัน")
        .replaceAll("Session", "เซสชัน"),
    ]),
  ),
  "command.project.index": "สลับไปยังโปรเจกต์ {{index}}",
  "command.project.next": "โปรเจกต์ถัดไป",
  "command.project.previous": "โปรเจกต์ก่อนหน้า",
  "common.clear": "ล้าง",
  "error.page.action.exportLogs": "ส่งออกบันทึก",
  "error.page.description.localServerStartup": "เกิดข้อผิดพลาดขณะเริ่มเซิร์ฟเวอร์ในเครื่อง",
  "home.server.collapse": "ยุบโปรเจกต์ของเซิร์ฟเวอร์",
  "home.server.expand": "ขยายโปรเจกต์ของเซิร์ฟเวอร์",
  "session.child.backToParent": "กลับไปยังเซสชันหลัก",
  "session.child.promptDisabled": "ไม่สามารถส่งพรอมต์ไปยังเซสชันซับเอเจนต์ได้",
  "session.error.notFound": "ไม่พบเซสชันนี้",
  "session.error.notFound.closeTab": "ปิดแท็บ",
  "session.error.notFound.description": "แท็บนี้ชี้ไปยังเซสชันที่ไม่มีอยู่บนเซิร์ฟเวอร์นี้แล้ว",
  "session.error.serverConnection": "เชื่อมต่อเซิร์ฟเวอร์นี้ไม่ได้",
  "session.new.project.add": "เพิ่มโปรเจกต์",
  "session.new.project.new": "โปรเจกต์ใหม่",
  "session.new.project.search": "ค้นหาโปรเจกต์",
  "session.new.workspace.existing": "พื้นที่ทำงาน…",
  "session.new.workspace.local": "ที่เก็บในเครื่อง",
  "session.new.workspace.runIn": "รันเซสชันใน",
  "session.new.workspace.triggerLocal": "ในเครื่อง",
  "session.question.minimize": "ย่อคำถาม",
  "session.question.pending.one": "คำถามที่รอดำเนินการ {{count}} รายการ",
  "session.question.pending.other": "คำถามที่รอดำเนินการ {{count}} รายการ",
  "session.question.restore": "กู้คืนคำถาม",
  "session.tab.unknown": "เซสชันไม่ทราบชื่อ",
  "settings.general.section.advanced": "ขั้นสูง",
  "settings.updates.action.downloading": "กำลังดาวน์โหลด...",
  "settings.updates.action.installing": "กำลังติดตั้ง...",
  "sidebar.empty.description": "เปิดโปรเจกต์เพื่อเริ่มต้น",
  "sidebar.empty.title": "ไม่มีโปรเจกต์ที่เปิดอยู่",
  "wsl.server.add": "เพิ่มเซิร์ฟเวอร์ WSL",
  "wsl.server.addShort": "เพิ่ม WSL",
  "wsl.server.menu.label": "เซิร์ฟเวอร์ WSL",
  "wsl.server.retryStart": "ลองเริ่มใหม่",
  "wsl.server.updating": "กำลังอัปเดต...",
}

const tr: Record<string, string> = {
  "command.project.index": "{{index}} numaralı projeye geç",
  "command.project.next": "Sonraki proje",
  "command.project.previous": "Önceki proje",
  "common.clear": "Temizle",
  "error.page.action.exportLogs": "Günlükleri dışa aktar",
  "error.page.description.localServerStartup": "Yerel sunucu başlatılırken bir hata oluştu.",
  "home.server.collapse": "Sunucu projelerini daralt",
  "home.server.expand": "Sunucu projelerini genişlet",
  "session.child.backToParent": "Ana oturuma dön.",
  "session.child.promptDisabled": "Alt ajan oturumlarına istem gönderilemez.",
  "session.error.notFound": "Bu oturum bulunamadı",
  "session.error.notFound.closeTab": "Sekmeyi kapat",
  "session.error.notFound.description": "Bu sekme artık bu sunucuda bulunmayan bir oturumu işaret ediyor.",
  "session.error.serverConnection": "Bu sunucuya bağlanılamıyor",
  "session.new.project.add": "Proje ekle",
  "session.new.project.new": "Yeni proje",
  "session.new.project.search": "Projeleri ara",
  "session.new.workspace.existing": "Çalışma alanı…",
  "session.new.workspace.local": "Yerel depo",
  "session.new.workspace.runIn": "Oturumu şurada çalıştır",
  "session.new.workspace.triggerLocal": "Yerel",
  "session.question.minimize": "Soruyu küçült",
  "session.question.pending.one": "{{count}} bekleyen soru",
  "session.question.pending.other": "{{count}} bekleyen soru",
  "session.question.restore": "Soruyu geri yükle",
  "session.tab.unknown": "Bilinmeyen oturum",
  "settings.general.row.mobileTitlebarBottom.description":
    "Mobilde başlık çubuğunu ve oturum sekmelerini ekranın altına yerleştir",
  "settings.general.row.mobileTitlebarBottom.title": "Alt gezinme",
  "settings.general.row.newLayoutDesigns.description": "Yeniden tasarlanan düzen, ana sayfa, düzenleyici ve oturum arayüzünü etkinleştir",
  "settings.general.row.newLayoutDesigns.title": "Yeni düzen ve tasarımlar",
  "settings.general.row.pinchZoom.description": "Trackpad sıkıştırma ve Ctrl+scroll ile yakınlaştırmaya izin ver",
  "settings.general.row.pinchZoom.title": "Sıkıştırarak yakınlaştır",
  "settings.general.row.shell.autoDefault": "Otomatik (Varsayılan)",
  "settings.general.row.shell.description":
    "Terminaliniz için kullanılan kabuğu seçin. Uyumlu kabuklar ajan araç çağrıları için de kullanılır.",
  "settings.general.row.shell.terminalOnly": "yalnızca terminal",
  "settings.general.row.shell.title": "Terminal kabuğu",
  "settings.general.row.showCustomAgents.description": "Düzenleyicide ajan seçiciyi göster",
  "settings.general.row.showCustomAgents.title": "Özel ajanlar",
  "settings.general.row.showFileTree.description": "Oturumlarda dosya ağacı panelini göster",
  "settings.general.row.showFileTree.title": "Dosya ağacı",
  "settings.general.row.showNavigation.description": "Masaüstü başlık çubuğunda geri ve ileri düğmelerini göster",
  "settings.general.row.showNavigation.title": "Gezinme denetimleri",
  "settings.general.row.showSearch.description": "Başlık çubuğunda arama ve komut paleti düğmesini göster",
  "settings.general.row.showSearch.title": "Komut paleti",
  "settings.general.row.showStatus.description": "Başlık çubuğunda sunucu durumu düğmesini göster",
  "settings.general.row.showStatus.title": "Sunucu durumu",
  "settings.general.row.showTerminal.description": "Masaüstü başlık çubuğunda terminal düğmesini göster",
  "settings.general.row.showTerminal.title": "Terminal",
  "settings.general.section.advanced": "Gelişmiş",
  "settings.updates.action.downloading": "İndiriliyor...",
  "settings.updates.action.installing": "Kuruluyor...",
  "sidebar.empty.description": "Başlamak için bir proje açın",
  "sidebar.empty.title": "Açık proje yok",
  "wsl.onboarding.adding": "Ekleniyor...",
  "wsl.onboarding.allDistrosAdded": "Kurulu tüm dağıtımlar zaten eklendi.",
  "wsl.onboarding.checkAgain": "Yeniden kontrol et",
  "wsl.onboarding.checkingDistro": "{{distro}} kontrol ediliyor...",
  "wsl.onboarding.checkingDistros": "Dağıtımlar kontrol ediliyor...",
  "wsl.onboarding.checkingOpencode": "OpenCode kontrol ediliyor...",
  "wsl.onboarding.checkingOpencodeIn": "{{distro}} içinde OpenCode kontrol ediliyor...",
  "wsl.onboarding.checkingRuntime": "WSL kontrol ediliyor...",
  "wsl.onboarding.chooseDistroFirst": "Önce bir dağıtım seçin.",
  "wsl.onboarding.desktopVersion": "masaüstü {{version}}",
  "wsl.onboarding.distroNotInstalled": "{{distro}} henüz kurulmadı.",
  "wsl.onboarding.distroReady": "{{distro}} hazır.",
  "wsl.onboarding.distroStatus.checking": "Kontrol ediliyor...",
  "wsl.onboarding.distroStatus.missingTools": "bash, curl eksik",
  "wsl.onboarding.distroStatus.opencodeMissing": "OpenCode kurulu değil",
  "wsl.onboarding.distroStatus.ready": "Hazır",
  "wsl.onboarding.distroStatus.unsupported": "Desteklenmiyor · WSL 2 kullanın",
  "wsl.onboarding.finishingDistro": "{{distro}} kurulumu tamamlanıyor.",
  "wsl.onboarding.install": "Kur",
  "wsl.onboarding.installDistro": "Dağıtım kur",
  "wsl.onboarding.installOpencode": "OpenCode kur",
  "wsl.onboarding.installOpencodeIn": "{{distro}} içine OpenCode kur.",
  "wsl.onboarding.installWsl": "WSL kur",
  "wsl.onboarding.installedDistros": "Kurulu dağıtımlar",
  "wsl.onboarding.installing": "Kuruluyor...",
  "wsl.onboarding.installingDistro": "{{distro}} kuruluyor...",
  "wsl.onboarding.listingDistros": "Dağıtımlar listeleniyor...",
  "wsl.onboarding.loadFailed": "WSL durumu yüklenemedi.",
  "wsl.onboarding.loading": "Yükleniyor...",
  "wsl.onboarding.needAnotherDistro": "Başka bir dağıtıma mı ihtiyacınız var?",
  "wsl.onboarding.needAnotherDistroHint": "WSL kataloğundan bir Linux dağıtımı kurun",
  "wsl.onboarding.next": "İleri",
  "wsl.onboarding.noDistros": "Henüz dağıtım algılanmadı.",
  "wsl.onboarding.notFound": "bulunamadı",
  "wsl.onboarding.openDistroOnce": "Kurulumu tamamlamak için {{distro}} bir kez açın.",
  "wsl.onboarding.openTerminal": "Terminali aç",
  "wsl.onboarding.opencodeReady": "OpenCode hazır.",
  "wsl.onboarding.opencodeReadyIn": "OpenCode {{distro}} içinde hazır.",
  "wsl.onboarding.path": "Yol: {{path}}",
  "wsl.onboarding.pickDistro": "Bir dağıtım seçin veya aşağıdan kurun.",
  "wsl.onboarding.ready": "WSL hazır.",
  "wsl.onboarding.refresh": "Yenile",
  "wsl.onboarding.required": "Devam etmek için WSL gerekli.",
  "wsl.onboarding.restartRequired": "WSL kurulumunu tamamlamak için Windows'un yeniden başlatılması gerekiyor.",
  "wsl.onboarding.searchDistros": "Dağıtımları ara",
  "wsl.onboarding.step.distro": "Dağıtım seç",
  "wsl.onboarding.step.opencode": "OpenCode",
  "wsl.onboarding.toolsRequired": "Bu dağıtım bash ve curl gerektirir.",
  "wsl.onboarding.unknown": "bilinmiyor",
  "wsl.onboarding.updateOpencode": "OpenCode güncelle",
  "wsl.onboarding.updateOpencodeIn": "{{distro}} içindeki OpenCode'u güncelle.",
  "wsl.onboarding.updatingOpencode": "OpenCode güncelleniyor...",
  "wsl.onboarding.updatingOpencodeIn": "{{distro}} içinde OpenCode güncelleniyor...",
  "wsl.onboarding.version": "Sürüm: {{version}}",
  "wsl.onboarding.versionMismatch": "Kurulu sürüm masaüstü uygulama sürümüyle eşleşmiyor.",
  "wsl.onboarding.windowsRestartRequired": "WSL kurulumunu tamamlamak için Windows'u yeniden başlatın, ardından OpenCode'u tekrar açın.",
  "wsl.onboarding.wsl2Required": "WSL 2 gerekli.",
  "wsl.onboarding.wslNotInstalled.description":
    "OpenCode bir WSL sunucusu eklemeden önce WSL (Windows Subsystem for Linux) gerekir",
  "wsl.onboarding.wslNotInstalled.title": "WSL kurulu değil",
  "wsl.onboarding.wslUnavailable.description": "OpenCode bu makinede WSL'yi doğrulayamadı.",
  "wsl.onboarding.wslUnavailable.title": "WSL kullanılamıyor",
  "wsl.server.add": "WSL sunucusu ekle",
  "wsl.server.addShort": "WSL ekle",
  "wsl.server.label": "WSL",
  "wsl.server.menu.label": "WSL sunucusu",
  "wsl.server.retryStart": "Başlatmayı yeniden dene",
  "wsl.server.updating": "Güncelleniyor...",
}

const rest = { uk: ukFromRu, ar, no: noFromDa, br: brFromEs, bs: bsFromDe, th, tr }

for (const [locale, translations] of Object.entries(rest)) {
  const missing = Object.keys(ru).filter((key) => !(key in translations))
  if (missing.length) console.error(`${locale} missing ${missing.length}:`, missing)
}

await Bun.write(path.join(import.meta.dir, "i18n-missing-rest.json"), JSON.stringify(rest, null, 2) + "\n")
console.log("Done")