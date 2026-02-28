# Screenshot Capture Flow — Trace Checklist

Explicit logging has been added at every stage. Use this checklist to trace where the flow stops.

---

## STEP 1 — Desktop Receiving Command

**Desktop project:** `OrionGuard/Services/Realtime/WebSocketService.cs`

**Logs added:**
- `CAPTURE_SCREEN COMMAND RECEIVED`
- `Timestamp: {DateTime.UtcNow}`
- `Screenshot captured successfully`
- `Image size: X bytes (base64)`
- `SCREENSHOT_RESULT SENT TO SERVER` (in SendScreenshotResultAsync)

**How to verify:**
1. Rebuild Desktop: `dotnet build` in OrionGuard folder
2. Run Desktop app (from Visual Studio: Debug → Start Debugging)
3. Click "التقاط لقطة شاشة" on dashboard devices page
4. Check **Visual Studio Output** window (View → Output) — `Console.WriteLine` and `Debug.WriteLine` both appear there when debugging

**Note:** WPF apps don't show a console by default. Use Visual Studio Output window, or run from cmd: `OrionGuard\bin\Debug\net8.0-windows\OrionGuard.exe` to see Console output.

**If logs missing →** WebSocket issue (command not reaching Desktop)

---

## STEP 2 — Server Receiving SCREENSHOT_RESULT

**Web project:** `lib/ws-server.ts`

**Logs added:**
- `SCREENSHOT_RESULT RECEIVED FROM DEVICE`
- `Device: {deviceId}`
- `FileName: {fileName}` (after save)
- `Screenshot saved to DB successfully`

**How to verify:**
1. Restart Next.js dev server
2. Click capture again
3. Check terminal where `npm run dev` is running

**If logs missing →** Desktop not sending correctly, or WebSocket not forwarding

---

## STEP 3 — File Written to Disk

**Check folder:** `public/live-screenshots/`

After clicking capture, does a NEW PNG file appear?

**If no new file →** Server file write logic issue (see ws-server.ts `handleScreenshotResult`)

---

## STEP 4 — Database Insert

Run in your DB client:

```sql
SELECT * FROM screenshots
ORDER BY "capturedAt" DESC
LIMIT 5;
```

Does a new row appear after capture?

**If no →** DB insert broken (check prisma.screenshot.create in ws-server.ts)

---

## STEP 5 — API /latest Returns New Record

**API:** `app/api/device/screenshot/latest/route.ts`

**Logs added:**
- `[API] /latest GET called`
- `[API] /latest deviceId: X`
- `[API] /latest returning fileName: X capturedAt: Y`

**How to verify:**
1. Open: `http://localhost:3000/api/device/screenshot/latest?deviceId=YOUR_DEVICE_ID`
2. Refresh multiple times after capture
3. Does `fileName` / `capturedAt` in JSON change?

**If not →** API query incorrect (must sort by capturedAt DESC — already implemented)

---

## STEP 6 — Frontend Requesting New Image

**Frontend:** `app/dashboard/devices/[deviceId]/screenshots/page.tsx`

**Logs added (browser DevTools Console):**
- `[Screenshots] fetchLatestPreview: requesting /api/device/screenshot/latest`
- `[Screenshots] fetchLatestPreview: got url= X capturedAt= Y`

**How to verify:**
1. Open DevTools → Network tab
2. Click capture (from devices page)
3. Does `GET /api/device/screenshot/latest` fire again? (polls every 5s)
4. Check Console for the logs above
5. Is `imageUrl` in the response updated?

**If request not firing →** Frontend not re-fetching (polling runs every 5s)
**If API correct but UI same →** Cache issue (cache-bust with `?t=timestamp` is already used)

---

## Additional Logs

| Location | Log |
|----------|-----|
| `app/api/device/command/route.ts` | `[API] CAPTURE_SCREEN command requested for deviceId:` |
| `app/api/device/command/route.ts` | `[API] CAPTURE_SCREEN sent to device:` |
| `lib/device-commands.ts` | `[device-commands] sendScreenshotCommand: sending CAPTURE_SCREEN to deviceIdentifier:` |
| `app/dashboard/devices/page.tsx` | `[Devices] User clicked التقاط لقطة شاشة, sending CAPTURE_SCREEN to deviceId:` |

---

## Diagnosis Logic

| Missing log | Diagnosis |
|-------------|-----------|
| Desktop: CAPTURE_SCREEN | WebSocket: command not reaching device |
| Desktop: Screenshot captured | Desktop capture logic failing |
| Desktop: SCREENSHOT_RESULT SENT | Desktop not sending to server |
| Server: SCREENSHOT_RESULT RECEIVED | Desktop/WebSocket issue |
| Server: Screenshot saved to DB | File write or DB insert failing |
| API: /latest returning new fileName | DB query or fallback logic |
| Frontend: fetchLatestPreview got new url | Polling/cache issue |
