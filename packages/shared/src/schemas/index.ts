import { z } from 'zod'

// -------------------------------------------------------
// Common primitives
// -------------------------------------------------------
export const IdSchema = z.string().uuid('ID harus berupa UUID yang valid')

export const SlugSchema = z
  .string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung')

export const PhoneSchema = z
  .string()
  .min(9)
  .max(15)
  .regex(/^(\+62|62|0)[0-9]{8,12}$/, 'Nomor telepon tidak valid')

export const NPWPSchema = z
  .string()
  .regex(/^\d{15,16}$/, 'NPWP harus terdiri dari 15-16 digit angka')
  .optional()
  .or(z.literal(''))

export const CurrencyAmountSchema = z.number().min(0, 'Jumlah tidak boleh negatif')

// -------------------------------------------------------
// Pagination
// -------------------------------------------------------
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
  cursor: z.string().optional(),
})
export type PaginationInput = z.infer<typeof PaginationSchema>

// -------------------------------------------------------
// Date range
// -------------------------------------------------------
export const DateRangeSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})
export type DateRangeInput = z.infer<typeof DateRangeSchema>

// -------------------------------------------------------
// Common query filters
// -------------------------------------------------------
export const SearchSchema = z.object({
  q: z.string().max(200).optional(),
})

// -------------------------------------------------------
// API response wrappers
// -------------------------------------------------------
export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  })

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
})

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    hasNextPage: z.boolean(),
    nextCursor: z.string().optional(),
  })

// -------------------------------------------------------
// Address (reusable sub-schema)
// -------------------------------------------------------
export const AddressSchema = z.object({
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
})
export type AddressInput = z.infer<typeof AddressSchema>

// -------------------------------------------------------
// Bank account sub-schema
// -------------------------------------------------------
export const BankAccountSchema = z.object({
  bankName: z.string().min(1, 'Pilih bank'),
  accountNumber: z.string().min(5).max(30, 'Nomor rekening tidak valid'),
  accountHolderName: z.string().min(1).max(100),
  bankCode: z.string().max(20).optional(),
  isPrimary: z.boolean().default(false),
})
export type BankAccountInput = z.infer<typeof BankAccountSchema>
