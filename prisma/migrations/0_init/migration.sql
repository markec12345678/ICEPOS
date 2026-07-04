-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subdomain" TEXT,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "taxNumber" TEXT NOT NULL DEFAULT 'SI12345678',
    "businessUnit" TEXT NOT NULL DEFAULT 'PREVOZ11',
    "cashRegister" TEXT NOT NULL DEFAULT 'BLAG01',
    "fursEnv" TEXT NOT NULL DEFAULT 'test',
    "fursCertPath" TEXT,
    "fursCertPassword" TEXT,
    "woltVenueId" TEXT,
    "deliverectLocationId" TEXT,
    "opentableRestaurantId" TEXT,
    "resyVenueId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Ljubljana',
    "language" TEXT NOT NULL DEFAULT 'sl',
    "loyaltyRate" REAL NOT NULL DEFAULT 0.1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "category" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "vatRate" REAL NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "desc" TEXT,
    "descEn" TEXT,
    "allergens" TEXT,
    "calories" INTEGER,
    "protein" REAL,
    "carbs" REAL,
    "fat" REAL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isDailySpecial" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Modifier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceDelta" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Modifier_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 4,
    "section" TEXT NOT NULL DEFAULT 'Dvorana',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Table_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "total" REAL NOT NULL DEFAULT 0,
    "vatTotal" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "paymentMethod" TEXT,
    "receiptNo" TEXT,
    "zoi" TEXT,
    "eor" TEXT,
    "fursXml" TEXT,
    "businessUnit" TEXT NOT NULL DEFAULT 'PREVOZ11',
    "cashRegister" TEXT NOT NULL DEFAULT 'BLAG01',
    "invoiceNumber" TEXT,
    "operator" TEXT NOT NULL DEFAULT 'Blagajnik',
    "operatorTaxNo" TEXT NOT NULL DEFAULT 'SI12345678',
    "shiftId" TEXT,
    "tip" REAL NOT NULL DEFAULT 0,
    "stripePaymentIntentId" TEXT,
    "fursSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "flags" TEXT,
    "stornoOf" TEXT,
    "stornoReason" TEXT,
    "stornoAt" DATETIME,
    "stornoZoi" TEXT,
    "stornoEor" TEXT,
    "customerId" TEXT,
    CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "vatRate" REAL NOT NULL,
    "note" TEXT,
    "modifiers" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "partySize" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 120,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "operatorTaxNo" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "startCash" REAL NOT NULL DEFAULT 0,
    "endCash" REAL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shift_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "taxNumber" TEXT NOT NULL DEFAULT 'SI12345678',
    "role" TEXT NOT NULL DEFAULT 'cashier',
    "hourlyRate" REAL NOT NULL DEFAULT 12,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Operator_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kos',
    "quantity" REAL NOT NULL DEFAULT 0,
    "minQuantity" REAL NOT NULL DEFAULT 0,
    "costPerUnit" REAL NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "category" TEXT NOT NULL DEFAULT 'splosno',
    "expiryDate" DATETIME,
    "batchNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recipe_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recipe_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" REAL NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisitAt" DATETIME,
    "allergens" TEXT,
    "note" TEXT,
    "birthday" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "initialAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "customerName" TEXT,
    "note" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GiftCard_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operatorId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'waiter',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Schedule_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Timesheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operatorId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "clockIn" DATETIME NOT NULL,
    "clockOut" DATETIME,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Timesheet_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WasteLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "menuItemId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "operator" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WasteLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WasteLog_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HappyHour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL,
    "categories" TEXT NOT NULL DEFAULT 'all',
    "menuItemIds" TEXT NOT NULL DEFAULT 'all',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HappyHour_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComboMeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ComboMeal_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComboSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comboMealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "minSelect" INTEGER NOT NULL DEFAULT 1,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "itemIds" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComboSlot_comboMealId_fkey" FOREIGN KEY ("comboMealId") REFERENCES "ComboMeal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "orderId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "foodRating" INTEGER NOT NULL,
    "serviceRating" INTEGER NOT NULL,
    "ambienceRating" INTEGER,
    "overallRating" INTEGER NOT NULL,
    "comment" TEXT,
    "tags" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "response" TEXT,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Feedback_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT,
    "partySize" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "estimatedWait" INTEGER,
    "note" TEXT,
    "tableId" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" DATETIME,
    "seatedAt" DATETIME,
    "leftAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WaitlistEntry_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_subdomain_key" ON "Restaurant"("subdomain");

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_idx" ON "MenuItem"("restaurantId");

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_category_idx" ON "MenuItem"("restaurantId", "category");

-- CreateIndex
CREATE INDEX "Table_restaurantId_idx" ON "Table"("restaurantId");

-- CreateIndex
CREATE INDEX "Table_restaurantId_section_idx" ON "Table"("restaurantId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "Table_restaurantId_number_key" ON "Table"("restaurantId", "number");

-- CreateIndex
CREATE INDEX "Order_restaurantId_idx" ON "Order"("restaurantId");

-- CreateIndex
CREATE INDEX "Order_restaurantId_status_idx" ON "Order"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "Order_restaurantId_paidAt_idx" ON "Order"("restaurantId", "paidAt");

-- CreateIndex
CREATE INDEX "Order_tableId_idx" ON "Order"("tableId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_menuItemId_idx" ON "OrderItem"("menuItemId");

-- CreateIndex
CREATE INDEX "Reservation_restaurantId_idx" ON "Reservation"("restaurantId");

-- CreateIndex
CREATE INDEX "Reservation_restaurantId_date_idx" ON "Reservation"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "Shift_restaurantId_idx" ON "Shift"("restaurantId");

-- CreateIndex
CREATE INDEX "Shift_restaurantId_status_idx" ON "Shift"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "Operator_restaurantId_idx" ON "Operator"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_restaurantId_pin_key" ON "Operator"("restaurantId", "pin");

-- CreateIndex
CREATE INDEX "InventoryItem_restaurantId_idx" ON "InventoryItem"("restaurantId");

-- CreateIndex
CREATE INDEX "Customer_restaurantId_idx" ON "Customer"("restaurantId");

-- CreateIndex
CREATE INDEX "Customer_restaurantId_phone_idx" ON "Customer"("restaurantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_restaurantId_phone_key" ON "Customer"("restaurantId", "phone");

-- CreateIndex
CREATE INDEX "GiftCard_restaurantId_idx" ON "GiftCard"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_restaurantId_code_key" ON "GiftCard"("restaurantId", "code");

-- CreateIndex
CREATE INDEX "Schedule_operatorId_idx" ON "Schedule"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_operatorId_date_key" ON "Schedule"("operatorId", "date");

-- CreateIndex
CREATE INDEX "Timesheet_operatorId_idx" ON "Timesheet"("operatorId");

-- CreateIndex
CREATE INDEX "WasteLog_restaurantId_idx" ON "WasteLog"("restaurantId");

-- CreateIndex
CREATE INDEX "HappyHour_restaurantId_idx" ON "HappyHour"("restaurantId");

-- CreateIndex
CREATE INDEX "ComboMeal_restaurantId_idx" ON "ComboMeal"("restaurantId");

-- CreateIndex
CREATE INDEX "Feedback_restaurantId_idx" ON "Feedback"("restaurantId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_restaurantId_idx" ON "WaitlistEntry"("restaurantId");

