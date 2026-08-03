/**
 * English → Arabic phrase dictionary used to translate builder content
 * when the user toggles the doc language to "ar" or "bilingual".
 *
 * Order matters — longer phrases first, so "Make Payment Now" translates as
 * a single phrase before falling through to "Make Payment".
 */

export const EN_TO_AR: Array<[string, string]> = [
  // ── Headlines ────────────────────────────────────────────────────
  ["Payment Reminder", "تذكير بالدفع"],
  ["FINAL NOTICE", "إشعار نهائي"],
  ["A one-time settlement offer", "عرض تسوية لمرة واحدة"],
  ["We've got your payment plan", "تم تأكيد خطة الدفع"],
  ["We didn't see your scheduled payment", "لم نتلقَّ دفعتك المجدولة"],
  ["We're here to help", "نحن هنا لمساعدتك"],
  ["Welcome to Tamara!", "أهلاً بك في تمارا!"],
  ["Welcome aboard", "أهلاً وسهلاً"],
  ["Start writing here", "ابدأ الكتابة هنا"],

  // ── Greetings + signoffs ─────────────────────────────────────────
  ["Dear Mr./Ms.", "السيد/السيدة"],
  ["Dear", "عزيزي"],
  ["Hi there", "مرحباً"],
  ["Hey", "مرحباً"],
  ["Hi", "مرحباً"],
  ["The Tamara Team", "فريق تمارا"],
  ["Customer Care Team — Mashreq Bank", "فريق خدمة العملاء — بنك المشرق"],
  ["Customer Care — Emirates NBD", "خدمة العملاء — الإمارات دبي الوطني"],
  ["Customer Care — First Abu Dhabi Bank", "خدمة العملاء — بنك أبوظبي الأول"],
  ["CashNow Collections", "كاش ناو للتحصيل"],
  ["Collections Team", "فريق التحصيل"],

  // ── Body sentences ───────────────────────────────────────────────
  [
    "This is a friendly reminder that your installment of",
    "هذا تذكير ودي بأن قسطك بقيمة",
  ],
  ["This is a FINAL NOTICE regarding your overdue balance of", "هذا إشعار نهائي بخصوص رصيدك المتأخر بقيمة"],
  ["was due on", "استحق بتاريخ"],
  ["due since", "مستحق منذ"],
  ["for account", "للحساب"],
  ["To avoid additional charges, please settle the outstanding balance at your earliest convenience.", "لتجنب الرسوم الإضافية، يرجى تسوية الرصيد المستحق في أقرب وقت ممكن."],
  [
    "If you have already made this payment, please disregard this notice.",
    "إذا كنت قد سدّدت هذا المبلغ مسبقاً، يرجى تجاهل هذا الإشعار.",
  ],
  [
    "For assistance, reply to this email or call us during business hours.",
    "للمساعدة، يرجى الرد على هذا البريد أو الاتصال بنا خلال ساعات العمل.",
  ],
  [
    "Reference: Account",
    "المرجع: الحساب رقم",
  ],
  [
    "Despite previous reminders, this amount remains unpaid. If payment is not received within",
    "بالرغم من التذكيرات السابقة، لا يزال هذا المبلغ غير مسدد. إذا لم نستلم الدفعة خلال",
  ],
  [
    "calendar days, we will be compelled to escalate this matter in accordance with applicable regulations and our contractual terms.",
    "أيام تقويمية، سنضطر إلى تصعيد هذا الأمر وفقاً للأنظمة المعمول بها وشروطنا التعاقدية.",
  ],
  [
    "we're offering a one-time settlement to clear your outstanding balance of",
    "نقدم لك تسوية لمرة واحدة لتسديد رصيدك المستحق البالغ",
  ],
  [
    "we understand things don't always go to plan. If you're facing temporary financial difficulty, our team can walk through your options with you — privately and without judgement. No payment is requested in this email.",
    "نتفهم أن الأمور لا تسير دائماً كما هو مخطط. إذا كنت تواجه صعوبة مالية مؤقتة، فإن فريقنا يستطيع مراجعة الخيارات معك — بسرية تامة ودون أحكام. لا يُطلب أي دفع في هذا البريد.",
  ],
  [
    "Thanks for joining,",
    "شكراً لانضمامك،",
  ],
  [
    "Your account",
    "حسابك",
  ],
  [
    "is now ready. Activate your access in a single tap and you're set.",
    "أصبح جاهزاً. فعّل وصولك بنقرة واحدة وأنت جاهز للانطلاق.",
  ],
  [
    "Thanks for committing to pay",
    "شكراً لالتزامك بالدفع",
  ],
  [
    "on",
    "بتاريخ",
  ],
  [
    "We've locked this in for your account",
    "تم تأكيد هذا الموعد لحسابك",
  ],
  [
    "There's nothing else you need to do until then.",
    "لا داعي لأي إجراء آخر حتى ذلك التاريخ.",
  ],
  [
    "you'd committed to pay",
    "كنت قد التزمت بدفع",
  ],
  [
    "but the payment hasn't reached us yet. Things happen — let's set up a new plan.",
    "لكن الدفعة لم تصل إلينا بعد. الأمور تحدث — لنقم بإعداد خطة جديدة.",
  ],
  ["Need to negotiate?", "تحتاج للتفاوض؟"],
  ["Submit a counter-offer", "قدّم عرضاً مضاداً"],
  ["or reply to this email to talk to a person.", "أو رد على هذا البريد للتحدث مع شخص."],
  ["Need to change the date?", "تحتاج لتغيير التاريخ؟"],
  ["Just reply to this email or open the plan above.", "فقط رد على هذا البريد أو افتح الخطة أعلاه."],
  ["Already paid?", "هل سددت بالفعل؟"],
  [
    "Reply with your reference number and we'll match it up.",
    "رد برقم المرجع وسنطابقه.",
  ],
  ["Need a hand?", "هل تحتاج مساعدة؟"],
  [
    "Reply to this email and we'll walk you through it.",
    "رد على هذا البريد وسنرشدك خطوة بخطوة.",
  ],
  [
    "To discuss a payment arrangement, contact Customer Care during business hours.",
    "لمناقشة ترتيبات الدفع، تواصل مع خدمة العملاء خلال ساعات العمل.",
  ],
  [
    "If you'd prefer to settle online, you can do that too — tap the option above to see your hardship plan.",
    "إذا كنت تفضّل التسوية عبر الإنترنت، يمكنك ذلك أيضاً — اضغط الخيار أعلاه لمعرفة خطة المساعدة.",
  ],

  // ── CTAs and supporting copy ─────────────────────────────────────
  ["Make Payment", "ادفع الآن"],
  ["Pay Now", "ادفع الآن"],
  ["Pay Online", "ادفع عبر الإنترنت"],
  ["Click me", "اضغط هنا"],
  ["Accept Settlement", "قبول التسوية"],
  ["View payment plan", "عرض خطة الدفع"],
  ["Pick a new date", "اختر تاريخاً جديداً"],
  ["Activate my account", "تفعيل حسابي"],
  ["Talk to a human", "تحدّث مع موظف"],
  ["Make a payment", "إجراء دفعة"],
  ["Tap to pay AED", "اضغط للدفع درهم"],
  ["now", "الآن"],
  ["Done in 10 seconds", "تتم في 10 ثوانٍ"],
  ["Tap to pay", "اضغط للدفع"],
  ["tap to confirm", "اضغط للتأكيد"],
  ["Tap to see details or modify", "اضغط لعرض التفاصيل أو التعديل"],
  ["Reschedule in a couple of taps", "إعادة الجدولة في خطوات بسيطة"],
  ["Takes about 30 seconds", "تستغرق حوالي 30 ثانية"],
  ["Reply to this email or use the link", "رد على هذا البريد أو استخدم الرابط"],

  // ── Numbers + amounts (kept as placeholders) ─────────────────────
  ["AED", "درهم"],
  ["off", "خصم"],
  ["that's", "أي"],
  ["This offer expires on", "ينتهي هذا العرض في"],

  // ── Short connectors (placed AFTER longer phrases) ──────────────
  ["was due", "كان مستحقاً"],
  ["expires on", "ينتهي في"],

  // ── Time + date words ────────────────────────────────────────────
  ["7 calendar days", "7 أيام تقويمية"],
  ["business hours", "ساعات العمل"],

  // ── Sample copy + scaffolding ────────────────────────────────────
  ["Drag blocks from the left rail, or ask Composer GPT to draft this email for you.", "اسحب الكتل من الشريط الجانبي الأيسر، أو اطلب من Composer GPT صياغة هذا البريد لك."],
  ["Start writing…", "ابدأ الكتابة..."],
  ["New paragraph.", "فقرة جديدة."],

  // ── Generic small fillers ────────────────────────────────────────
  ["please", "يرجى"],
  ["thank you", "شكراً لك"],
  ["thanks", "شكراً"],
]

/** Common section/field labels also used in modules + tables. */
export const EN_TO_AR_LABELS: Array<[string, string]> = [
  ["Item", "البند"],
  ["Amount", "المبلغ"],
  ["Outstanding", "المستحق"],
  ["Late fee", "رسوم التأخير"],
  ["Pay button", "زر الدفع"],
  ["Schedule payment", "جدولة الدفع"],
  ["Talk to an agent", "تحدث مع موظف"],
  ["Unsubscribe", "إلغاء الاشتراك"],
  ["Reply", "رد"],
]

/** Arabic-friendly font stack. */
export const ARABIC_FONT_STACK =
  "Tajawal, 'Noto Naskh Arabic', 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif"
