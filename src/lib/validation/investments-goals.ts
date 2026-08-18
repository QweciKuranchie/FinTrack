import { z } from "zod";

export const investmentSchema = z.object({
  symbol: z.string().min(1, "Symbol/Ticker is required"),
  name: z.string().min(1, "Investment name is required"),
  quantity: z.number().positive("Quantity must be > 0"),
  avgCost: z.number().nonnegative("Average cost must be >= 0"),
  currentPrice: z.number().nonnegative("Current price must be >= 0"),
  currency: z.string().default("GHS"),
  assetClass: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
});

export const goalSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  targetAmount: z.number().positive("Target amount must be > 0"),
  currentAmount: z.number().nonnegative("Current amount must be >= 0").default(0),
  deadline: z.string().or(z.date()).optional().nullable(),
  currency: z.string().default("GHS"),
  accountId: z.string().optional().nullable(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["OWNER", "MEMBER"]).default("MEMBER"),
});

export type InvestmentInput = z.infer<typeof investmentSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
