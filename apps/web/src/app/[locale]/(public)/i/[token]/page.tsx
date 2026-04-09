export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string; locale: string }>
}) {
  const { token } = await params
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <p className="text-sm text-gray-500">
          Public invoice view for token: <code className="font-mono text-sky-600">{token}</code>
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Full implementation in E4-008 (Public Invoice Page)
        </p>
      </div>
    </div>
  )
}
