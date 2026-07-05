import { z } from "zod";

// ============================================================
// Zod validacijske sheme za API route input
// ============================================================
// Uporaba v route handler-jih:
//   const parsed = CreateOrderSchema.safeParse(body);
//   if (!parsed.success) {
//     return NextResponse.json({ error: "Neveljaven vhod", details: parsed.error.flatten() }, { status: 400 });
//   }
//   const data = parsed.data;

// === Order ===
export const CreateOrderSchema = z.object({
  tableId: z.string().cuid().optional(),
  tableNumber: z.number().int().positive().optional(),
  items: z.array(z.object({
    menuItemId: z.string().cuid(),
    quantity: z.number().int().positive().max(999),
    modifiers: z.array(z.object({
      id: z.string().cuid().optional(),
      name: z.string().min(1).max(100),
      priceDelta: z.number().optional(),
    })).optional(),
    note: z.string().max(200).optional(),
  })).min(1).max(100),
  note: z.string().max(500).optional(),
  customerId: z.string().cuid().optional(),
  flags: z.array(z.string().max(50)).optional(),
});

// === Customer ===
export const CreateCustomerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(3).max(30),
  email: z.string().email().optional(),
  allergens: z.array(z.string().max(50)).optional(),
  birthday: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

// === Menu Item ===
export const CreateMenuItemSchema = z.object({
  name: z.string().min(1).max(100),
  nameEn: z.string().max(100).optional(),
  category: z.string().min(1).max(50),
  price: z.number().nonnegative().max(10000),
  vatRate: z.number().refine(v => [0, 0.095, 0.22].includes(v), "DDV mora biti 0%, 9.5% ali 22%"),
  desc: z.string().max(500).optional(),
  descEn: z.string().max(500).optional(),
  allergens: z.array(z.string().max(50)).optional(),
  calories: z.number().int().nonnegative().optional(),
  available: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
});

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial();

// === Inventory Item ===
export const CreateInventoryItemSchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.string().min(1).max(20),
  quantity: z.number().nonnegative().max(1000000),
  minQuantity: z.number().nonnegative().max(1000000).optional(),
  costPerUnit: z.number().nonnegative().max(10000),
  category: z.string().max(50).optional(),
  supplier: z.string().max(100).optional(),
  expiryDate: z.string().datetime().optional(),
  batchNumber: z.string().max(50).optional(),
});

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();

// === Reservation ===
export const CreateReservationSchema = z.object({
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(3).max(30),
  partySize: z.number().int().positive().max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Čas mora biti HH:MM"),
  tableId: z.string().cuid().optional(),
  note: z.string().max(500).optional(),
});

// === Gift Card ===
export const CreateGiftCardSchema = z.object({
  initialAmount: z.number().positive().max(1000),
  note: z.string().max(200).optional(),
});

export const RedeemGiftCardSchema = z.object({
  code: z.string().regex(/^GC-[A-Z0-9]{8}$/, "Koda mora biti format GC-XXXXXXXX"),
  amount: z.number().positive().max(1000),
});

// === Feedback ===
export const CreateFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).optional(),
  orderId: z.string().cuid().optional(),
});

// === Waste ===
export const CreateWasteSchema = z.object({
  inventoryItemId: z.string().cuid().optional(),
  menuItemId: z.string().cuid().optional(),
  quantity: z.number().positive().max(10000),
  reason: z.string().min(1).max(100),
  cost: z.number().nonnegative().max(10000).optional(),
  note: z.string().max(500).optional(),
});

// === Happy Hour ===
export const CreateHappyHourSchema = z.object({
  name: z.string().min(1).max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive().max(100),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  categories: z.array(z.string().max(50)).optional(),
  menuItemIds: z.array(z.string().cuid()).optional(),
});

// === Pay ===
export const PaySchema = z.object({
  paymentMethod: z.enum(["cash", "card", "giftcard", "sumup", "stripe", "wallet"]),
  amount: z.number().positive().optional(),
  tip: z.number().nonnegative().max(10000).optional(),
  giftCardCode: z.string().regex(/^GC-[A-Z0-9]{8}$/).optional(),
  customerId: z.string().cuid().optional(),
});

// === Storno ===
export const StornoSchema = z.object({
  reason: z.string().min(1).max(200),
});

// === Table ===
export const CreateTableSchema = z.object({
  number: z.number().int().positive().max(999),
  name: z.string().min(1).max(50),
  seats: z.number().int().positive().max(100),
  section: z.string().min(1).max(50),
});

// === Operator ===
export const CreateOperatorSchema = z.object({
  name: z.string().min(1).max(100),
  pin: z.string().regex(/^\d{4,8}$/, "PIN mora biti 4-8 mesten"),
  taxNumber: z.string().max(20).optional(),
  role: z.enum(["cashier", "admin"]).optional(),
  hourlyRate: z.number().nonnegative().max(1000).optional(),
});

// === Transfer Table ===
export const TransferTableSchema = z.object({
  targetTableId: z.string().cuid(),
});

// === Helper: validate and return parsed data or error response ===
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: Record<string, unknown> } {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() as Record<string, unknown> };
  }
  return { success: true, data: parsed.data };
}
