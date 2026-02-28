import { prisma } from './prisma';

export async function bootstrapIfEmpty(): Promise<void> {
  try {
    const companyCount = await prisma.company.count();

    if (companyCount > 0) {
      console.log('Bootstrap skipped - data exists');
      await ensureTestDeviceExists();
      await reportDeviceStatus();
      return;
    }

    const company = await prisma.company.create({
      data: {
        name: 'مطاعم ومطابخ القصرين',
      },
    });

    const branch = await prisma.branch.create({
      data: {
        companyId: company.id,
        name: 'الفرع الرئيسي',
        location: 'السعودية',
      },
    });

    await prisma.device.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        deviceIdentifier: 'ORION-DEVICE-001',
        deviceName: 'Main Office PC',
      },
    });

    await prisma.employee.createMany({
      data: [
        {
          companyId: company.id,
          branchId: branch.id,
          employeeCode: '1001',
          fullName: 'أحمد السيد',
          password: 'CHANGE_ME',
          role: 'EMPLOYEE',
        },
        {
          companyId: company.id,
          branchId: branch.id,
          employeeCode: '2001',
          fullName: 'فوزي السويحان',
          password: 'CHANGE_ME',
          role: 'SUPERVISOR',
        },
      ],
    });

    console.log('Bootstrap completed - Company, Branch, Device (ORION-DEVICE-001), Employees created');
  } catch (error) {
    console.error('Bootstrap error:', error);
    throw error;
  }
}

async function ensureTestDeviceExists(): Promise<void> {
  const existing = await prisma.device.findUnique({
    where: { deviceIdentifier: 'ORION-DEVICE-001' },
  });
  if (existing) return;

  const company = await prisma.company.findFirst({ select: { id: true } });
  if (!company) return;

  let branch = await prisma.branch.findFirst({
    where: { companyId: company.id },
    select: { id: true },
  });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        companyId: company.id,
        name: 'الفرع الرئيسي',
        location: 'السعودية',
      },
      select: { id: true },
    });
  }

  await prisma.device.create({
    data: {
      companyId: company.id,
      branchId: branch.id,
      deviceIdentifier: 'ORION-DEVICE-001',
      deviceName: 'Main Office PC',
    },
  });
  console.log('Test device ORION-DEVICE-001 created for sync testing');
}

async function reportDeviceStatus(): Promise<void> {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
  });

  for (const company of companies) {
    const devices = await prisma.device.findMany({
      where: { companyId: company.id },
      select: { id: true, deviceIdentifier: true, deviceName: true },
    });

    if (devices.length === 0) {
      console.log(`[تقرير] الشركة "${company.name}" مسجلة - لا يوجد أجهزة مسجلة`);
    } else {
      const list = devices
        .map((d) => `${d.deviceIdentifier} (id: ${d.id})`)
        .join(', ');
      console.log(`[تقرير] الشركة "${company.name}" - الأجهزة: ${list}`);
    }
  }
}
