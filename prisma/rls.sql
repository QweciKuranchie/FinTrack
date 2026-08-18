-- Enable Row Level Security (RLS) on all household-scoped tables

-- Household
ALTER TABLE "Household" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "household_members_can_access_household" ON "Household";
CREATE POLICY "household_members_can_access_household" ON "Household"
FOR ALL USING (
  id IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
) WITH CHECK (
  id IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
);

-- HouseholdMember
ALTER TABLE "HouseholdMember" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_can_access_household_members" ON "HouseholdMember";
CREATE POLICY "members_can_access_household_members" ON "HouseholdMember"
FOR ALL USING (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
) WITH CHECK (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
);

-- Account
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "household_members_can_access_accounts" ON "Account";
CREATE POLICY "household_members_can_access_accounts" ON "Account"
FOR ALL USING (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
) WITH CHECK (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
);

-- Category
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_can_read_default_or_household_categories" ON "Category";
DROP POLICY IF EXISTS "members_can_manage_household_categories" ON "Category";
CREATE POLICY "members_can_read_default_or_household_categories" ON "Category"
FOR SELECT USING (
  "householdId" IS NULL OR "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
);
CREATE POLICY "members_can_manage_household_categories" ON "Category"
FOR ALL USING (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
) WITH CHECK (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
);

-- Transaction
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "household_members_can_access_transactions" ON "Transaction";
CREATE POLICY "household_members_can_access_transactions" ON "Transaction"
FOR ALL USING (
  "accountId" IN (
    SELECT id FROM "Account" WHERE "householdId" IN (
      SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text
    )
  )
) WITH CHECK (
  "accountId" IN (
    SELECT id FROM "Account" WHERE "householdId" IN (
      SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text
    )
  )
);

-- Liability
ALTER TABLE "Liability" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "household_members_can_access_liabilities" ON "Liability";
CREATE POLICY "household_members_can_access_liabilities" ON "Liability"
FOR ALL USING (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
) WITH CHECK (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
);

-- Asset
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "household_members_can_access_assets" ON "Asset";
CREATE POLICY "household_members_can_access_assets" ON "Asset"
FOR ALL USING (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
) WITH CHECK (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
);

-- Subscription
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "household_members_can_access_subscriptions" ON "Subscription";
CREATE POLICY "household_members_can_access_subscriptions" ON "Subscription"
FOR ALL USING (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
) WITH CHECK (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
);

-- Budget
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "household_members_can_access_budgets" ON "Budget";
CREATE POLICY "household_members_can_access_budgets" ON "Budget"
FOR ALL USING (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
) WITH CHECK (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
);

-- NetWorthSnapshot
ALTER TABLE "NetWorthSnapshot" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "household_members_can_access_snapshots" ON "NetWorthSnapshot";
CREATE POLICY "household_members_can_access_snapshots" ON "NetWorthSnapshot"
FOR ALL USING (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
) WITH CHECK (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
);

-- SavingsGoal
ALTER TABLE "SavingsGoal" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "household_members_can_access_goals" ON "SavingsGoal";
CREATE POLICY "household_members_can_access_goals" ON "SavingsGoal"
FOR ALL USING (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
) WITH CHECK (
  "householdId" IN (SELECT "householdId" FROM "HouseholdMember" WHERE "userId"::text = auth.uid()::text)
);
