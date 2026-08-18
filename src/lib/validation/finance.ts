import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum([
    "CHECKING",
    "SAVINGS",
    "MOBILE_MONEY",
    "CASH",
    "INVESTMENT",
    "OTHER",
  ]),
  currency: z.string().default("GHS"),
  openingBalance: z.number().default(0),
  institution: z.string().optional().nullable(),
});

export const transactionSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().optional().nullable(),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string().default("GHS"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  description: z.string().optional().nullable(),
  date: z.string().or(z.date()),
  transferAccountId: z.string().optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  type: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export type AccountInput = z.infer<typeof accountSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
