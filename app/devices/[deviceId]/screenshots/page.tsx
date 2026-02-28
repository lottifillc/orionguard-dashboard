import { redirect } from 'next/navigation'

export default async function DeviceScreenshotsRedirect({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const { deviceId } = await params
  redirect(`/dashboard/devices/${deviceId}/screenshots`)
}
