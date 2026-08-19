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
  // 1. Check if user has an activeHouseholdId set in UserProfile
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });

  if (profile?.activeHouseholdId) {
    const activeMember = await prisma.householdMember.findFirst({
      where: { userId, householdId: profile.activeHouseholdId },
      include: { household: true },
    });
    if (activeMember) {
      return activeMember.household;
    }
  }

  // 2. Otherwise find first membership
  const member = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: true },
  });

  if (member) {
    await prisma.userProfile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: email || "",
        activeHouseholdId: member.householdId,
      },
      update: {
        activeHouseholdId: member.householdId,
      },
    });
    return member.household;
  }

  // 3. Create initial workspace if user has no households
  const householdName = email ? `${email.split("@")[0]}'s Workspace` : "Personal Workspace";
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

  await seedDefaultCategories(household.id);

  await prisma.userProfile.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: email || "",
      activeHouseholdId: household.id,
    },
    update: {
      activeHouseholdId: household.id,
    },
  });

  return household;
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
