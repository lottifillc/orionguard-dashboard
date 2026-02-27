import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Constants ─────────────────────────────────────────────────────────────
const COMPANIES = [
  "TechNova Solutions",
  "DigitalCore Agency",
  "Orion Internal Test",
];

const EMPLOYEE_NAMES: Record<string, string[]> = {
  "TechNova Solutions": [
    "أحمد محمد",
    "Sara Johnson",
    "خالد العتيبي",
    "Emily Chen",
    "عمر حسن",
    "Michael Brown",
    "فاطمة علي",
    "David Wilson",
  ],
  "DigitalCore Agency": [
    "محمد السعيد",
    "Jessica Martinez",
    "نورة القحطاني",
    "James Taylor",
    "عبدالله العمري",
    "Sarah Anderson",
    "ريم الغامدي",
  ],
  "Orion Internal Test": [
    "Test User One",
    "مستخدم تجريبي",
    "QA Tester",
    "محمد التجريبي",
    "Dev Admin",
    "أحمد النظام",
  ],
};

const DEVICE_NAMES = [
  "DESKTOP-01",
  "DESKTOP-02",
  "HR-LAPTOP-3",
  "DEV-MAC-01",
  "DESKTOP-MAIN",
  "LAPTOP-SALES",
];

const PRODUCTIVE_APPS = [
  { name: "VS Code", title: "VS Code", window: "*.ts - OrionGuard" },
  { name: "Figma", title: "Figma", window: "Design - OrionGuard" },
  { name: "Chrome", title: "Chrome", window: "docs.google.com" },
  { name: "Excel", title: "Microsoft Excel", window: "Report.xlsx" },
  { name: "Notion", title: "Notion", window: "Project Docs" },
];

const NON_PRODUCTIVE_APPS = [
  { name: "YouTube", title: "YouTube", window: "YouTube" },
  { name: "Facebook", title: "Facebook", window: "Facebook" },
  { name: "Instagram", title: "Instagram", window: "Instagram" },
  { name: "TikTok", title: "TikTok", window: "TikTok" },
];

const NEUTRAL_APPS = [
  { name: "Chrome", title: "Chrome", window: "Wikipedia" },
  { name: "Slack", title: "Slack", window: "OrionGuard" },
  { name: "Outlook", title: "Outlook", window: "Inbox" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function setTime(date: Date, hour: number, min: number): Date {
  const d = new Date(date);
  d.setHours(hour, min, 0, 0);
  return d;
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60 * 1000);
}

function addSeconds(date: Date, secs: number): Date {
  return new Date(date.getTime() + secs * 1000);
}

// ─── Main Seed ──────────────────────────────────────────────────────────────
async function main() {
  console.log("🗑️  Clearing existing data...");

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "Screenshot", "Activity", "IdleLog", "Session", "Employee", "Device", "Company" CASCADE
  `);

  console.log("🏢 Creating companies...");

  const companies = await Promise.all(
    COMPANIES.map((name) =>
      prisma.company.create({
        data: { name },
      })
    )
  );

  const companyMap = Object.fromEntries(
    companies.map((c) => [c.name, c])
  ) as Record<string, (typeof companies)[0]>;

  // ─── Employees & Devices per company ──────────────────────────────────────
  const allEmployees: { id: string; companyId: string; companyName: string }[] =
    [];
  const allDevices: { id: string; companyId: string }[] = [];
  let globalDeviceIndex = 0;

  for (const company of companies) {
    const names = EMPLOYEE_NAMES[company.name] ?? EMPLOYEE_NAMES["TechNova Solutions"];
    const empCount = randomInt(5, 8);
    const selectedNames = names.slice(0, empCount);

    const employees = await prisma.employee.createManyAndReturn({
      data: selectedNames.map((fullName, i) => ({
        companyId: company.id,
        employeeCode: `EMP${String(i + 1).padStart(3, "0")}`,
        fullName,
        password: "$2a$10$placeholder_hashed_password",
        createdAt: addDays(new Date(), -randomInt(30, 90)),
      })),
    });

    allEmployees.push(
      ...employees.map((e) => ({
        id: e.id,
        companyId: e.companyId,
        companyName: company.name,
      }))
    );

    const devCount = randomInt(4, 6);
    const devices = await prisma.device.createManyAndReturn({
      data: Array.from({ length: devCount }, (_, i) => {
        globalDeviceIndex++;
        const isOnline = Math.random() > 0.4;
        const lastSeen = isOnline
          ? addMinutes(new Date(), -randomInt(1, 30))
          : addDays(new Date(), -randomInt(1, 7));
        return {
          companyId: company.id,
          deviceIdentifier: `ORION-DEV-${String(globalDeviceIndex).padStart(4, "0")}`,
          deviceName: DEVICE_NAMES[i % DEVICE_NAMES.length],
          isOnline,
          lastSeenAt: lastSeen,
          createdAt: addDays(new Date(), -randomInt(60, 120)),
        };
      }),
    });

    allDevices.push(...devices.map((d) => ({ id: d.id, companyId: d.companyId })));
  }

  console.log("📅 Creating sessions (14 days + edge cases)...");

  const baseDate = addDays(new Date(), -14);
  const sessionIds: string[] = [];
  const sessionMeta: Map<
    string,
    { employeeId: string; deviceId: string; loginTime: Date; logoutTime: Date | null; status: string }
  > = new Map();

  // Edge: One employee with NO sessions
  const employeeWithNoSessions = allEmployees[allEmployees.length - 1];

  // Edge: One device with NO sessions
  const deviceWithNoSessions = allDevices[allDevices.length - 1];

  for (const emp of allEmployees) {
    if (emp.id === employeeWithNoSessions.id) continue;

    const companyDevices = allDevices.filter((d) => d.companyId === emp.companyId);
    const usableDevices = companyDevices.filter((d) => d.id !== deviceWithNoSessions.id);
    const sessionCount = randomInt(8, 20);

    const daysWithSessions = new Set<number>();
    for (let i = 0; i < sessionCount; i++) {
      daysWithSessions.add(randomInt(0, 13));
    }

    let sessionIndex = 0;
    for (const dayOffset of Array.from(daysWithSessions).sort((a, b) => a - b)) {
      const dayDate = addDays(baseDate, dayOffset);
      const sessionsThisDay = randomInt(1, 2);
      for (let s = 0; s < sessionsThisDay; s++) {
        const loginHour = randomInt(8, 11);
        const loginMin = randomInt(0, 59);
        const loginTime = setTime(dayDate, loginHour, loginMin);

        // Edge: Very short session (5 min)
        const isVeryShort = sessionIndex === 0 && dayOffset === 0 && Math.random() > 0.9;
        // Edge: Very long session (12 hours)
        const isVeryLong = sessionIndex === 1 && dayOffset === 1 && Math.random() > 0.9;
        // Edge: Active session (no logout)
        const isActive = Math.random() > 0.85;

        let durationMinutes: number;
        if (isVeryShort) durationMinutes = 5;
        else if (isVeryLong) durationMinutes = 12 * 60;
        else durationMinutes = randomInt(180, 420); // 3–7 hours

        const logoutTime = isActive
          ? null
          : addMinutes(loginTime, durationMinutes);

        const device = usableDevices[randomInt(0, usableDevices.length - 1)];
        const status = isActive ? "ACTIVE" : "CLOSED";

        const session = await prisma.session.create({
          data: {
            employeeId: emp.id,
            deviceId: device.id,
            loginTime,
            logoutTime,
            totalActiveSeconds: 0,
            totalIdleSeconds: 0,
            status,
          },
        });

        sessionIds.push(session.id);
        sessionMeta.set(session.id, {
          employeeId: emp.id,
          deviceId: device.id,
          loginTime,
          logoutTime,
          status,
        });
        sessionIndex++;
      }
    }
  }

  // Edge: Old session (30 days ago)
  const oldEmp = allEmployees[0];
  const oldDevice = allDevices.find((d) => d.companyId === oldEmp.companyId)!;
  const oldSession = await prisma.session.create({
    data: {
      employeeId: oldEmp.id,
      deviceId: oldDevice.id,
      loginTime: addDays(baseDate, -30),
      logoutTime: addDays(baseDate, -30),
      totalActiveSeconds: 3600,
      totalIdleSeconds: 600,
      status: "CLOSED",
    },
  });
  sessionIds.push(oldSession.id);
  sessionMeta.set(oldSession.id, {
    employeeId: oldEmp.id,
    deviceId: oldDevice.id,
    loginTime: addDays(baseDate, -30),
    logoutTime: addDays(baseDate, -30),
    status: "CLOSED",
  });

  // Edge: Overlapping sessions (same employee, same day)
  const overlapEmp = allEmployees[1];
  const overlapDevice = allDevices.find((d) => d.companyId === overlapEmp.companyId)!;
  const overlapDay = addDays(baseDate, 5);
  const overlap1 = await prisma.session.create({
    data: {
      employeeId: overlapEmp.id,
      deviceId: overlapDevice.id,
      loginTime: setTime(overlapDay, 8, 0),
      logoutTime: setTime(overlapDay, 12, 0),
      totalActiveSeconds: 0,
      totalIdleSeconds: 0,
      status: "CLOSED",
    },
  });
  const overlap2 = await prisma.session.create({
    data: {
      employeeId: overlapEmp.id,
      deviceId: overlapDevice.id,
      loginTime: setTime(overlapDay, 11, 30),
      logoutTime: setTime(overlapDay, 12, 30),
      totalActiveSeconds: 0,
      totalIdleSeconds: 0,
      status: "CLOSED",
    },
  });
  sessionIds.push(overlap1.id, overlap2.id);
  sessionMeta.set(overlap1.id, {
    employeeId: overlapEmp.id,
    deviceId: overlapDevice.id,
    loginTime: setTime(overlapDay, 8, 0),
    logoutTime: setTime(overlapDay, 12, 0),
    status: "CLOSED",
  });
  sessionMeta.set(overlap2.id, {
    employeeId: overlapEmp.id,
    deviceId: overlapDevice.id,
    loginTime: setTime(overlapDay, 11, 30),
    logoutTime: setTime(overlapDay, 12, 30),
    status: "CLOSED",
  });

  console.log("🖥️  Creating activities, idle logs, screenshots...");

  const sessionTypes: ("productive" | "normal" | "bad" | "danger" | "empty" | "idle100" | "active100")[] = [
    "productive",
    "productive",
    "normal",
    "normal",
    "normal",
    "bad",
    "danger",
    "empty",
    "idle100",
    "active100",
  ];

  for (let i = 0; i < sessionIds.length; i++) {
    const sessionId = sessionIds[i];
    const meta = sessionMeta.get(sessionId)!;
    const endTime = meta.logoutTime ?? addMinutes(meta.loginTime, 360);
    const totalDurationSeconds = Math.floor(
      (endTime.getTime() - meta.loginTime.getTime()) / 1000
    );

    const typeIndex = i % sessionTypes.length;
    const sessionType = sessionTypes[typeIndex];

    let totalActiveSeconds = 0;
    let totalIdleSeconds = 0;

    // Edge: Session with no activities
    if (sessionType !== "empty") {
      const activityCount = randomInt(20, 80);
      let activeRatio: number;
      switch (sessionType) {
        case "productive":
          activeRatio = randomInt(70, 85) / 100;
          break;
        case "normal":
          activeRatio = randomInt(50, 70) / 100;
          break;
        case "bad":
          activeRatio = randomInt(20, 40) / 100;
          break;
        case "danger":
          activeRatio = randomInt(5, 19) / 100;
          break;
        case "active100":
          activeRatio = 1;
          break;
        case "idle100":
          activeRatio = 0;
          break;
        default:
          activeRatio = randomInt(50, 70) / 100;
      }

      totalActiveSeconds = Math.floor(totalDurationSeconds * activeRatio);
      totalIdleSeconds = totalDurationSeconds - totalActiveSeconds;

      const activities: {
        appName: string;
        windowTitle: string;
        url: string | null;
        category: string;
        startTime: Date;
        endTime: Date;
        durationSeconds: number;
      }[] = [];
      let usedActive = 0;
      const targetActive = totalActiveSeconds;

      const allApps = [
        ...PRODUCTIVE_APPS.map((a) => ({ ...a, category: "PRODUCTIVE" })),
        ...NEUTRAL_APPS.map((a) => ({ ...a, category: "NEUTRAL" })),
        ...NON_PRODUCTIVE_APPS.map((a) => ({ ...a, category: "DISTRACTION" })),
      ];

      let currentTime = new Date(meta.loginTime);

      for (let a = 0; a < activityCount && usedActive < targetActive; a++) {
        const app = allApps[randomInt(0, allApps.length - 1)];
        const maxChunk = Math.min(
          randomInt(60, 600),
          targetActive - usedActive
        );
        const duration = maxChunk > 0 ? randomInt(30, maxChunk) : 30;
        const actualDuration = Math.min(duration, targetActive - usedActive, totalDurationSeconds - Math.floor((currentTime.getTime() - meta.loginTime.getTime()) / 1000));
        if (actualDuration <= 0) break;

        const endT = addSeconds(currentTime, actualDuration);
        if (endT > endTime) break;

        activities.push({
          appName: app.name,
          windowTitle: app.window,
          url: app.name === "Chrome" ? "https://example.com" : null,
          category: app.category,
          startTime: new Date(currentTime),
          endTime: new Date(endT),
          durationSeconds: actualDuration,
        });
        usedActive += actualDuration;
        currentTime = endT;
      }

      if (sessionType === "active100") {
        totalActiveSeconds = totalDurationSeconds;
        totalIdleSeconds = 0;
      } else if (sessionType === "idle100") {
        totalActiveSeconds = 0;
        totalIdleSeconds = totalDurationSeconds;
      } else if (activities.length > 0) {
        totalActiveSeconds = activities.reduce((s, x) => s + x.durationSeconds, 0);
        totalIdleSeconds = Math.max(0, totalDurationSeconds - totalActiveSeconds);
      }

      await prisma.activity.createMany({
        data: activities.map((a) => ({
          sessionId,
          appName: a.appName,
          windowTitle: a.windowTitle,
          url: a.url,
          category: a.category,
          startTime: a.startTime,
          endTime: a.endTime,
          durationSeconds: a.durationSeconds,
        })),
      });
    }

    // Edge: Session with no idle logs (unless idle100 or high idle)
    const idleCount = sessionType === "empty" ? 0 : randomInt(3, 15);
    if (sessionType === "idle100" && totalIdleSeconds > 0) {
      await prisma.idleLog.create({
        data: {
          sessionId,
          startTime: meta.loginTime,
          endTime: endTime,
          durationSeconds: totalIdleSeconds,
        },
      });
    } else if (idleCount > 0 && totalIdleSeconds > 0) {
      let remainingIdle = totalIdleSeconds;
      let idleStart = addSeconds(meta.loginTime, randomInt(60, 300));
      const logs: { startTime: Date; endTime: Date; durationSeconds: number }[] = [];

      for (let j = 0; j < idleCount - 1 && remainingIdle > 60; j++) {
        const duration = Math.min(
          randomInt(60, 1800),
          Math.floor(remainingIdle * 0.3)
        );
        if (duration < 60) break;
        const idleEnd = addSeconds(idleStart, duration);
        logs.push({
          startTime: new Date(idleStart),
          endTime: new Date(idleEnd),
          durationSeconds: duration,
        });
        remainingIdle -= duration;
        idleStart = addSeconds(idleEnd, randomInt(120, 600));
      }
      if (remainingIdle > 0) {
        logs.push({
          startTime: new Date(idleStart),
          endTime: endTime,
          durationSeconds: remainingIdle,
        });
      }

      const actualIdleSum = logs.reduce((s, l) => s + l.durationSeconds, 0);
      totalIdleSeconds = actualIdleSum;
      totalActiveSeconds = Math.max(0, totalDurationSeconds - actualIdleSum);

      await prisma.idleLog.createMany({
        data: logs.map((l) => ({
          sessionId,
          startTime: l.startTime,
          endTime: l.endTime,
          durationSeconds: l.durationSeconds,
        })),
      });
    }

    // Screenshots
    const screenshotCount = sessionType === "empty" ? 0 : randomInt(5, 30);
    if (screenshotCount > 0) {
      const companyId = allEmployees.find((e) => e.id === meta.employeeId)?.companyId ?? "unknown";
      const screenshots = Array.from({ length: screenshotCount }, (_, j) => {
        const span = endTime.getTime() - meta.loginTime.getTime();
        const offset = (span * (j + 1)) / (screenshotCount + 1);
        const capturedAt = new Date(meta.loginTime.getTime() + offset);
        return {
          sessionId,
          filePath: `/screenshots/${companyId}/${sessionId}/${capturedAt.getTime()}.jpg`,
          capturedAt,
        };
      });
      await prisma.screenshot.createMany({ data: screenshots });
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        totalActiveSeconds,
        totalIdleSeconds,
      },
    });
  }

  // Old session: add minimal activities
  await prisma.activity.createMany({
    data: [
      {
        sessionId: oldSession.id,
        appName: "VS Code",
        windowTitle: "VS Code",
        url: null,
        category: "PRODUCTIVE",
        startTime: addDays(baseDate, -30),
        endTime: addSeconds(addDays(baseDate, -30), 3600),
        durationSeconds: 3600,
      },
    ],
  });
  await prisma.idleLog.createMany({
    data: [
      {
        sessionId: oldSession.id,
        startTime: addSeconds(addDays(baseDate, -30), 3600),
        endTime: addSeconds(addDays(baseDate, -30), 4200),
        durationSeconds: 600,
      },
    ],
  });
  await prisma.screenshot.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      sessionId: oldSession.id,
      filePath: `/screenshots/old/${oldSession.id}/${i}.jpg`,
      capturedAt: addSeconds(addDays(baseDate, -30), i * 400),
    })),
  });

  // Overlap sessions: add activities
  for (const sid of [overlap1.id, overlap2.id]) {
    const meta = sessionMeta.get(sid)!;
    const endTime = meta.logoutTime!;
    const duration = Math.floor((endTime.getTime() - meta.loginTime.getTime()) / 1000);
    const active = Math.floor(duration * 0.7);
    const idle = duration - active;

    await prisma.activity.createMany({
      data: [
        {
          sessionId: sid,
          appName: "Chrome",
          windowTitle: "Work",
          url: "https://work.com",
          category: "PRODUCTIVE",
          startTime: meta.loginTime,
          endTime: addSeconds(meta.loginTime, active),
          durationSeconds: active,
        },
      ],
    });
    await prisma.idleLog.createMany({
      data: [
        {
          sessionId: sid,
          startTime: addSeconds(meta.loginTime, active),
          endTime: endTime,
          durationSeconds: idle,
        },
      ],
    });
    await prisma.screenshot.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({
        sessionId: sid,
        filePath: `/screenshots/overlap/${sid}/${i}.jpg`,
        capturedAt: addSeconds(meta.loginTime, (duration * (i + 1)) / 9),
      })),
    });

    await prisma.session.update({
      where: { id: sid },
      data: {
        totalActiveSeconds: active,
        totalIdleSeconds: idle,
      },
    });
  }

  // Fix deviceIdentifier uniqueness - use cuid-like suffix
  // Already using unique pattern above

  const stats = {
    companies: await prisma.company.count(),
    employees: await prisma.employee.count(),
    devices: await prisma.device.count(),
    sessions: await prisma.session.count(),
    activities: await prisma.activity.count(),
    idleLogs: await prisma.idleLog.count(),
    screenshots: await prisma.screenshot.count(),
  };

  console.log("✅ Seed completed successfully!");
  console.log("📊 Stats:", stats);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
