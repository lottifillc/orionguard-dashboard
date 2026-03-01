# تتبع تسجيل الجهاز (Device Registration Trace)

## اللوجات المضافة

تم إضافة لوجات `[TRACE]` لتتبع مسار Sync و WebSocket:

| اللوج | المعنى |
|-------|--------|
| `[TRACE] Server ready - Sync: POST /api/device/sync, WS: /ws` | السيرفر جاهز |
| `[TRACE] Sync API request received` | طلب Sync وصل للسيرفر (في server.js) |
| `[TRACE] Sync POST entered` | معالج Sync بدأ التنفيذ |
| `[TRACE] Sync rejected: ...` | طلب Sync مرفوض |
| `[TRACE] Sync error: ...` | خطأ في Sync |
| `[Sync] Request: { deviceId, companyId }` | Sync يستقبل البيانات |
| `[Sync] AUTO-CREATED DEVICE: ...` | تم إنشاء الجهاز |
| `[TRACE] WS upgrade request: path=/ws` | طلب WebSocket upgrade وصل |
| `[TRACE] WS connection opened` | اتصال WebSocket مفتوح |
| `[TRACE] WS message received: { type, raw }` | رسالة WebSocket وُصلت |
| `[WS] REGISTER received: ...` | رسالة REGISTER وُصلت |

## كيف تتتبع المشكلة

### 1. تأكد أن السيرفر يستخدم server.js

السيرفر **يجب** أن يُشغّل بـ `npm run start` (وليس `next start` فقط) لأن WebSocket يعمل عبر server.js.

```bash
# صحيح
npm run start

# خاطئ على Vercel - لا يدعم WebSocket
vercel deploy  # يستخدم next start بدون server.js
```

### 2. شغّل السيرفر وراقب اللوج

```bash
npm run start
```

انتظر حتى ترى: `[TRACE] Server ready - Sync: POST /api/device/sync, WS: /ws`

### 3. شغّل تطبيق الديسكتوب

بعد تسجيل الدخول (MainWindow مفتوح)، راقب لوج السيرفر:

**إذا لم يظهر أي لوج:**
- الطلبات لا تصل للسيرفر
- تحقق: هل الديسكتوب يرسل لـ `https://orionguard.lottifi.com`؟
- تحقق: هل النشر يستخدم server.js؟ (Vercel لا يدعمه)

**إذا ظهر `[TRACE] Sync API request received` لكن لا `[TRACE] Sync POST entered`:**
- الطلب يصل لكن Next.js لا يمرره للمعالج
- تحقق من مسار الـ API

**إذا ظهر `[TRACE] Sync POST entered` و `[Sync] Request:`:**
- Sync يعمل، تحقق من `[Sync] AUTO-CREATED DEVICE` أو خطأ لاحق

**إذا ظهر `[TRACE] WS upgrade request: path=/ws`:**
- WebSocket يصل، تحقق من `[TRACE] WS connection opened` و `[TRACE] WS message received`

### 4. فلترة اللوج

```bash
# عرض فقط TRACE و Sync و WS
npm run start 2>&1 | grep -E '\[TRACE\]|\[Sync\]|\[WS\]'
```

### 5. إذا النشر على Vercel/Railway/etc

تأكد أن:
- أمر البدء: `npm run start` (يشغّل server.js)
- بعض المنصات تستخدم `next start` افتراضياً – غيّر إلى `node server.js` أو `npx tsx server.js`
