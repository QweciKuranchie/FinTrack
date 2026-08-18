import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getAuthUser() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (err) {
    console.warn("getAuthUser error (e.g. build time or missing credentials):", err);
    return null;
  }
}

export async function requireAuthUser() {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function getOrCreateHouseholdForUser(userId: string, email?: string) {
  // Check if member already belongs to a household
  const member = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: true },
  });

  if (!member) {
    // Create new household and add user as OWNER
    const householdName = email ? `${email.split("@")[0]}'s Household` : "My Household";
    const household = await prisma.household.create({
      data: {
        name: householdName,
        createdBy: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
      include: {
        members: true,
      },
    });

    // Seed default categories for this household
    await seedDefaultCategories(household.id);

    return household;
  }

  return member.household;
}

export async function seedDefaultCategories(householdId: string) {
  const defaultCategories = [
    { name: "Food & Dining", type: "EXPENSE" as const, icon: "Utensils", color: "#F59E0B" },
    { name: "Transport & Fuel", type: "EXPENSE" as const, icon: "Car", color: "#3B82F6" },
    { name: "Rent & Housing", type: "EXPENSE" as const, icon: "Home", color: "#8B5CF6" },
    { name: "Utilities", type: "EXPENSE" as const, icon: "Zap", color: "#EC4899" },
    { name: "Subscriptions", type: "EXPENSE" as const, icon: "CreditCard", color: "#10B981" },
    { name: "Shopping", type: "EXPENSE" as const, icon: "ShoppingBag", color: "#6366F1" },
    { name: "Health & Medical", type: "EXPENSE" as const, icon: "Heart", color: "#EF4444" },
    { name: "Salary / Income", type: "INCOME" as const, icon: "Briefcase", color: "#0F766E" },
    { name: "Investments", type: "INCOME" as const, icon: "TrendingUp", color: "#10B981" },
    { name: "Other Expenses", type: "EXPENSE" as const, icon: "MoreHorizontal", color: "#6B7280" },
    { name: "Other Income", type: "INCOME" as const, icon: "DollarSign", color: "#10B981" },
  ];

  await prisma.category.createMany({
    data: defaultCategories.map((cat) => ({
      ...cat,
      householdId,
    })),
  });
}
