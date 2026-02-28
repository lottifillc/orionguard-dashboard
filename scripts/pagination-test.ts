/**
 * Auto-verify Screenshot List Endpoint and Pagination
 * Run: npx tsx scripts/pagination-test.ts
 */

import { prisma } from '../lib/prisma'
import { GET } from '../app/api/device/screenshot/list/route'

async function main() {
  // STEP 1: AUTO-DETECT DEVICE
  const device = await prisma.device.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true, deviceIdentifier: true },
  })

  if (!device) {
    console.log('NO DEVICE FOUND IN DB')
    process.exit(1)
  }

  console.log('TESTING DEVICE:', device.deviceIdentifier)

  // STEP 2: CALL LIST ENDPOINT INTERNALLY
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '') + '/api/device/screenshot/list'
  const deviceId = device.deviceIdentifier

  const req1 = new Request(`${baseUrl}?deviceId=${encodeURIComponent(deviceId)}&page=1&limit=5`)
  const req2 = new Request(`${baseUrl}?deviceId=${encodeURIComponent(deviceId)}&page=2&limit=5`)

  const res1 = await GET(req1)
  const res2 = await GET(req2)

  const json1 = await res1.json()
  const json2 = await res2.json()

  if (!res1.ok || !res2.ok) {
    console.error('API error:', json1.error ?? json2.error ?? 'Unknown')
    process.exit(1)
  }

  // STEP 3: VALIDATE RESULTS
  const data1 = json1.data ?? []
  const data2 = json2.data ?? []
  const pagination1 = json1.pagination ?? {}
  const pagination2 = json2.pagination ?? {}

  const totalCount = pagination1.totalCount ?? pagination2.totalCount ?? 0
  const totalPages = pagination1.totalPages ?? pagination2.totalPages ?? 0

  const firstTs1 = data1[0]?.createdAt ?? null
  const firstTs2 = data2[0]?.createdAt ?? null

  console.log('\n--- Validation ---')
  console.log('Total count:', totalCount)
  console.log('Page count (totalPages):', totalPages)
  console.log('Items page 1:', data1.length)
  console.log('Items page 2:', data2.length)
  console.log('First item timestamp page 1:', firstTs1)
  console.log('First item timestamp page 2:', firstTs2)

  const itemsWithinLimit = data1.length <= 5 && data2.length <= 5
  const page1DifferentFromPage2 =
    totalCount <= 5 || (data1.length > 0 && data2.length > 0 && firstTs1 !== firstTs2)
  const sortedDesc =
    data1.length <= 1 ||
    new Date(data1[0].createdAt).getTime() >= new Date(data1[data1.length - 1].createdAt).getTime()
  const totalPagesCorrect =
    totalCount === 0
      ? totalPages === 0 || totalPages === 1
      : totalPages === Math.ceil(totalCount / 5)

  const paginationOk =
    itemsWithinLimit && sortedDesc && totalPagesCorrect && page1DifferentFromPage2

  // STEP 4: OUTPUT REPORT
  console.log('\n=== PAGINATION TEST RESULT ===')
  console.log('Device:', device.deviceIdentifier)
  console.log('Total Screenshots:', totalCount)
  console.log('Page 1 Count:', data1.length)
  console.log('Page 2 Count:', data2.length)
  console.log('Pagination OK:', paginationOk ? 'TRUE' : 'FALSE')
  console.log('==============================\n')

  await prisma.$disconnect()
  process.exit(paginationOk ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
