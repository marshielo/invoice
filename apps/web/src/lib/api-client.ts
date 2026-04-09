/**
 * Typed API client for the Hono backend.
 * All requests include the Supabase JWT in Authorization header.
 */

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787'

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string>),
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string
      code?: string
    }
    throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.error ?? res.statusText)
  }

  return res.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'GET', ...(token ? { token } : {}) }),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), ...(token ? { token } : {}) }),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...(token ? { token } : {}) }),
  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE', ...(token ? { token } : {}) }),
}

export { ApiError }
