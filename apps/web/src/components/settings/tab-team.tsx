'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/lib/api-client'
import { PLAN_LIMITS } from '@invoicein/shared/constants'
import type { ApiResponse, UserData, UsersListData } from '@/lib/types'

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-gray-50'
const labelCls = 'block text-sm font-medium text-gray-700'
const errorCls = 'mt-1 text-xs text-red-600'

const ROLES = ['admin', 'staff', 'viewer'] as const

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'staff', 'viewer']),
})

type InviteForm = z.infer<typeof inviteSchema>

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-sky-100 text-sky-700',
  staff: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-600',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-100 text-yellow-700',
}

function userStatus(user: UserData): 'active' | 'inactive' | 'pending' {
  if (!user.isActive) return user.createdAt === user.createdAt ? 'inactive' : 'inactive'
  return user.isActive ? 'active' : 'inactive'
}

function getPlanKey(plan: string): keyof typeof PLAN_LIMITS {
  const lower = plan.toLowerCase()
  if (lower === 'professional') return 'professional'
  if (lower === 'business') return 'business'
  return 'free'
}

interface Props {
  plan: string
  token: string
}

export function TabTeam({ plan, token }: Props) {
  const t = useTranslations('settings')
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['team', token],
    queryFn: () =>
      apiClient
        .get<ApiResponse<UsersListData>>('/api/v1/users?limit=50', token)
        .then((r) => r.data),
    enabled: !!token,
    staleTime: 30_000,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'staff' },
  })

  const inviteMutation = useMutation({
    mutationFn: (form: InviteForm) =>
      apiClient.post('/api/v1/users/invite', { email: form.email, role: form.role }, token),
    onSuccess: () => {
      reset()
      setShowInvite(false)
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['team'] })
    },
    onError: (err: unknown) => {
      const code = (err as { code?: string })?.code
      if (code === 'PLAN_LIMIT') {
        setActionError(t('errors.planLimitReached'))
      } else {
        setActionError(t('errors.inviteFailed'))
      }
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/api/v1/users/${userId}`, token),
    onSuccess: () => {
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['team'] })
    },
    onError: () => setActionError(t('errors.deleteFailed')),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiClient.patch(`/api/v1/users/${userId}`, { role }, token),
    onSuccess: () => {
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['team'] })
    },
    onError: () => setActionError(t('errors.saveFailed')),
  })

  const planKey = getPlanKey(plan)
  const maxUsers = PLAN_LIMITS[planKey].maxUsers
  const currentCount = data?.total ?? 0
  const isUnlimited = maxUsers === Infinity

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('team.title')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('team.subtitle')}</p>
        </div>
        {!showInvite && (
          <button
            onClick={() => setShowInvite(true)}
            className="shrink-0 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700"
          >
            + {t('team.invite')}
          </button>
        )}
      </div>

      {/* Plan limit badge */}
      <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        {isUnlimited
          ? t('team.planUnlimited', { current: currentCount, plan })
          : t('team.planLimit', { current: currentCount, max: maxUsers, plan })}
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">{t('team.invite')}</h3>
          <form
            onSubmit={handleSubmit((d) => { setActionError(null); inviteMutation.mutate(d) })}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>
                  {t('team.inviteEmail')} <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className={inputCls}
                  placeholder={t('team.inviteEmailPlaceholder')}
                  disabled={inviteMutation.isPending}
                />
                {errors.email && (
                  <p className={errorCls}>
                    {errors.email.type === 'invalid_string'
                      ? t('errors.inviteEmailInvalid')
                      : t('errors.inviteEmailRequired')}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>{t('team.inviteRole')}</label>
                <select
                  {...register('role')}
                  className={inputCls}
                  disabled={inviteMutation.isPending}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t(`team.roles.${r}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:opacity-60"
              >
                {inviteMutation.isPending ? t('team.sending') : t('team.sendInvite')}
              </button>
              <button
                type="button"
                onClick={() => { reset(); setShowInvite(false) }}
                disabled={inviteMutation.isPending}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                {t('team.cancelInvite')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Member list */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
      ) : !data?.users.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">No team members yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.users.map((user) => {
            const status = user.isActive ? 'active' : 'inactive'
            const isOwner = user.role === 'owner'
            return (
              <li
                key={user.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {user.fullName ?? user.email}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {t(`team.roles.${user.role as 'owner' | 'admin' | 'staff' | 'viewer'}`)}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
                    >
                      {t(`team.${status}`)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{user.email}</p>
                </div>

                {!isOwner && user.isActive && (
                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    <select
                      defaultValue={user.role}
                      onChange={(e) =>
                        updateRoleMutation.mutate({ userId: user.id, role: e.target.value })
                      }
                      disabled={updateRoleMutation.isPending}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t(`team.roles.${r}`)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => deactivateMutation.mutate(user.id)}
                      disabled={deactivateMutation.isPending}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                    >
                      {t('team.deactivate')}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
