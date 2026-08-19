import { z } from "zod";

export const assetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  symbol: z.string().optional().nullable(),
  type: z.enum(["PROPERTY", "VEHICLE", "INVESTMENT", "OTHER"]),
  quantity: z.number().optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  currentValue: z.number().nonnegative("Current market value must be >= 0"),
  currency: z.string().default("GHS"),
  notes: z.string().optional().nullable(),
});

export const liabilitySchema = z.object({
  name: z.string().min(1, "Liability name is required"),
  type: z.enum(["LOAN", "CREDIT_CARD", "MORTGAGE", "OTHER"]),
  principal: z.number().nonnegative("Principal must be >= 0"),
  currentBalance: z.number().nonnegative("Current balance must be >= 0"),
  interestRate: z.number().optional().nullable(),
  minimumPayment: z.number().optional().nullable(),
  dueDate: z.number().min(1).max(31).optional().nullable(),
  currency: z.string().default("GHS"),
});

export type AssetInput = z.infer<typeof assetSchema>;
export type LiabilityInput = z.infer<typeof liabilitySchema>;
