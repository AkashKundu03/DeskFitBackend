-- CreateTable
CREATE TABLE "FoodItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kcalPer100g" DOUBLE PRECISION NOT NULL,
    "proteinPer100g" DOUBLE PRECISION NOT NULL,
    "carbsPer100g" DOUBLE PRECISION NOT NULL,
    "fatPer100g" DOUBLE PRECISION NOT NULL,
    "fiberPer100g" DOUBLE PRECISION NOT NULL,
    "servingGrams" DOUBLE PRECISION NOT NULL,
    "servingUnit" TEXT NOT NULL,
    "diet" TEXT NOT NULL,
    "allergens" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyMealPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mealCount" INTEGER NOT NULL,
    "includeSnack" BOOLEAN NOT NULL DEFAULT false,
    "dietaryPref" TEXT NOT NULL,
    "proteinPrefs" JSONB NOT NULL,
    "carbPrefs" JSONB NOT NULL,
    "fiberPrefs" JSONB NOT NULL,
    "allergens" JSONB NOT NULL,
    "dislikes" JSONB NOT NULL,
    "dailyKcal" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "fiberG" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyMealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekday" TEXT NOT NULL,

    CONSTRAINT "MealPlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "fiberG" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealFoodPortion" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "foodSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "fiberG" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MealFoodPortion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealRegenerationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "mealId" TEXT,
    "weekKey" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealRegenerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodItem_slug_key" ON "FoodItem"("slug");

-- CreateIndex
CREATE INDEX "WeeklyMealPlan_userId_active_idx" ON "WeeklyMealPlan"("userId", "active");

-- CreateIndex
CREATE INDEX "MealPlanDay_planId_idx" ON "MealPlanDay"("planId");

-- CreateIndex
CREATE INDEX "Meal_dayId_idx" ON "Meal"("dayId");

-- CreateIndex
CREATE INDEX "MealFoodPortion_mealId_idx" ON "MealFoodPortion"("mealId");

-- CreateIndex
CREATE INDEX "MealRegenerationEvent_userId_weekKey_idx" ON "MealRegenerationEvent"("userId", "weekKey");

-- AddForeignKey
ALTER TABLE "WeeklyMealPlan" ADD CONSTRAINT "WeeklyMealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanDay" ADD CONSTRAINT "MealPlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WeeklyMealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "MealPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealFoodPortion" ADD CONSTRAINT "MealFoodPortion_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealRegenerationEvent" ADD CONSTRAINT "MealRegenerationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealRegenerationEvent" ADD CONSTRAINT "MealRegenerationEvent_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WeeklyMealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
