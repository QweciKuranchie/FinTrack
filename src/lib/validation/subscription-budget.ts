import { z } from "zod";

export const subscriptionSchema = z.object({
  name: z.string().min(1, "Subscription name is required"),
  amount: z.number().positive("Amount must be > 0"),
  currency: z.string().default("GHS"),
  billingCycle: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  nextRenewalDate: z.string().or(z.date()),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  reminderDaysBefore: z.number().int().min(1).max(30).default(3),
});

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.number().positive("Budget amount must be > 0"),
  currency: z.string().default("GHS"),
  periodStart: z.string().or(z.date()).optional(),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
