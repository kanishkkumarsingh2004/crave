import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getInitialSeedData } from "./initial-data";

// Re-export all domain enums and types
export * from "@/types";

export type DataStore = ReturnType<typeof getInitialSeedData>;

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

class InMemoryDatabase {
  private data: DataStore;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadData();
  }

  private formatVendor(v: any) {
    if (!v) return null;
    return {
      ...v,
      storeName: v.storeName || v.name || "Vendor Store",
      name: v.name || v.storeName || "Vendor Store",
    };
  }

  private loadData(): DataStore {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object" && parsed.users && parsed.vendors) {
          const store = parsed as DataStore;
          if (store.vendors) {
            store.vendors = store.vendors.map((v: any) => this.formatVendor(v));
          }
          return store;
        }
      }
    } catch (e) {
      console.warn("Failed to load existing db.json, generating fresh seed data", e);
    }
    const initial = getInitialSeedData();
    if (initial.vendors) {
      initial.vendors = initial.vendors.map((v: any) => this.formatVendor(v));
    }
    this.saveDataDirect(initial);
    return initial;
  }

  private saveDataDirect(data: DataStore) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write db.json", e);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveDataDirect(this.data);
    }, 150);
  }

  private matchWhere(item: any, where?: Record<string, any>): boolean {
    if (!where) return true;
    for (const [key, val] of Object.entries(where)) {
      if (key === "OR" && Array.isArray(val)) {
        const matchesAny = val.some((subWhere) => this.matchWhere(item, subWhere));
        if (!matchesAny) return false;
        continue;
      }
      if (key === "AND" && Array.isArray(val)) {
        const matchesAll = val.every((subWhere) => this.matchWhere(item, subWhere));
        if (!matchesAll) return false;
        continue;
      }
      if (key === "NOT") {
        if (this.matchWhere(item, val)) return false;
        continue;
      }

      const itemVal = item[key];
      if (val === undefined) continue;

      if (val === null) {
        if (itemVal !== null) return false;
        continue;
      }

      if (typeof val === "object" && !(val instanceof Date)) {
        if ("equals" in val && itemVal !== val.equals) return false;
        if ("not" in val && itemVal === val.not) return false;
        if ("in" in val && Array.isArray(val.in) && !val.in.includes(itemVal)) return false;
        if ("notIn" in val && Array.isArray(val.notIn) && val.notIn.includes(itemVal)) return false;
        if ("contains" in val && typeof itemVal === "string") {
          const ignoreCase = val.mode === "insensitive";
          const hay = ignoreCase ? itemVal.toLowerCase() : itemVal;
          const needle = ignoreCase ? String(val.contains).toLowerCase() : String(val.contains);
          if (!hay.includes(needle)) return false;
        }
        if ("startsWith" in val && typeof itemVal === "string") {
          if (!itemVal.startsWith(val.startsWith)) return false;
        }
        if ("endsWith" in val && typeof itemVal === "string") {
          if (!itemVal.endsWith(val.endsWith)) return false;
        }
        if ("gte" in val) {
          const target = new Date(val.gte).getTime();
          const cur = new Date(itemVal).getTime();
          if (isNaN(cur) || isNaN(target) ? itemVal < val.gte : cur < target) return false;
        }
        if ("lte" in val) {
          const target = new Date(val.lte).getTime();
          const cur = new Date(itemVal).getTime();
          if (isNaN(cur) || isNaN(target) ? itemVal > val.lte : cur > target) return false;
        }
        if ("gt" in val) {
          const target = new Date(val.gt).getTime();
          const cur = new Date(itemVal).getTime();
          if (isNaN(cur) || isNaN(target) ? itemVal <= val.gt : cur <= target) return false;
        }
        if ("lt" in val) {
          const target = new Date(val.lt).getTime();
          const cur = new Date(itemVal).getTime();
          if (isNaN(cur) || isNaN(target) ? itemVal >= val.lt : cur >= target) return false;
        }
      } else {
        if (itemVal instanceof Date || val instanceof Date) {
          if (new Date(itemVal).getTime() !== new Date(val).getTime()) return false;
        } else if (itemVal !== val) {
          return false;
        }
      }
    }
    return true;
  }

  private sortItems(items: any[], orderBy?: Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">>) {
    if (!orderBy) return items;
    const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...items].sort((a, b) => {
      for (const ord of orders) {
        const [field, direction] = Object.entries(ord)[0] || [];
        if (!field) continue;
        const valA = a[field];
        const valB = b[field];
        if (valA === valB) continue;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        const cmp = valA > valB ? 1 : -1;
        return direction === "desc" ? -cmp : cmp;
      }
      return 0;
    });
  }

  private attachRelations(entityName: string, item: any, include?: Record<string, any>): any {
    if (!item || !include) return item;
    const clone = { ...item };

    if (entityName === "user") {
      if (include.accounts) {
        clone.accounts = this.data.accounts.filter((a) => a.userId === item.id);
      }
      if (include.vendor) {
        clone.vendor = this.formatVendor(this.data.vendors.find((v) => v.userId === item.id));
      }
      if (include.driver) {
        clone.driver = this.data.drivers.find((d) => d.userId === item.id) || null;
      }
    }

    if (entityName === "vendor") {
      if (include.products) {
        clone.products = this.data.products.filter((p) => p.vendorId === item.id);
      }
      if (include.user) {
        clone.user = this.data.users.find((u) => u.id === item.userId) || null;
      }
    }

    if (entityName === "product") {
      if (include.vendor) {
        clone.vendor = this.formatVendor(this.data.vendors.find((v) => v.id === item.vendorId));
      }
      if (include.category) {
        clone.category = this.data.categories.find((c) => c.id === item.categoryId) || null;
      }
    }

    if (entityName === "category") {
      if (include.products) {
        clone.products = this.data.products.filter((p) => p.categoryId === item.id);
      }
      if (include._count) {
        clone._count = {
          products: this.data.products.filter((p) => p.categoryId === item.id).length,
        };
      }
    }

    if (entityName === "order") {
      if (include.customer || include.user) {
        clone.customer = this.data.users.find((u) => u.id === item.customerId) || null;
      }
      if (include.vendor) {
        clone.vendor = this.formatVendor(this.data.vendors.find((v) => v.id === item.vendorId));
      }
      if (include.driver) {
        const drv = this.data.drivers.find((d) => d.id === item.driverId);
        clone.driver = drv
          ? {
              ...drv,
              user: this.data.users.find((u) => u.id === drv.userId) || null,
            }
          : null;
      }
      if (include.items || include.orderItems) {
        clone.items = this.data.orderItems.filter((i) => i.orderId === item.id);
      }
      if (include.payment) {
        clone.payment = this.data.payments.find((p) => p.orderId === item.id) || null;
      }
      if (include.delivery) {
        clone.delivery = this.data.deliveries.find((d) => d.orderId === item.id) || null;
      }
      if (include._count) {
        clone._count = {
          items: this.data.orderItems.filter((i) => i.orderId === item.id).length,
        };
      }
    }

    if (entityName === "driver") {
      if (include.user) {
        clone.user = this.data.users.find((u) => u.id === item.userId) || null;
      }
    }

    if (entityName === "session") {
      if (include.user) {
        clone.user = this.data.users.find((u) => u.id === item.userId) || null;
      }
    }

    if (entityName === "review") {
      if (include.customer || include.user) {
        clone.customer = this.data.users.find((u) => u.id === item.customerId) || null;
      }
      if (include.vendor) {
        clone.vendor = this.formatVendor(this.data.vendors.find((v) => v.id === item.vendorId));
      }
    }

    return clone;
  }

  private createCollection<T extends { id: string }>(
    entityName: string,
    getArray: () => T[],
    setArray: (arr: T[]) => void,
  ) {
    return {
      findMany: async (args?: {
        where?: Record<string, any>;
        orderBy?: any;
        skip?: number;
        take?: number;
        include?: Record<string, any>;
        select?: Record<string, any>;
      }) => {
        let items = getArray().filter((i) => this.matchWhere(i, args?.where));
        if (args?.orderBy) items = this.sortItems(items, args.orderBy);
        if (args?.skip) items = items.slice(args.skip);
        if (args?.take) items = items.slice(0, args.take);
        const relationSpec = { ...args?.include, ...args?.select };
        return items.map((i) => this.attachRelations(entityName, i, relationSpec));
      },

      findUnique: async (args: {
        where: Record<string, any>;
        include?: Record<string, any>;
        select?: Record<string, any>;
      }) => {
        const item = getArray().find((i) => this.matchWhere(i, args.where));
        if (!item) return null;
        const relationSpec = { ...args?.include, ...args?.select };
        return this.attachRelations(entityName, item, relationSpec);
      },

      findFirst: async (args?: {
        where?: Record<string, any>;
        orderBy?: any;
        include?: Record<string, any>;
        select?: Record<string, any>;
      }) => {
        let items = getArray().filter((i) => this.matchWhere(i, args?.where));
        if (args?.orderBy) items = this.sortItems(items, args.orderBy);
        const item = items[0];
        if (!item) return null;
        const relationSpec = { ...args?.include, ...args?.select };
        return this.attachRelations(entityName, item, relationSpec);
      },

      count: async (args?: { where?: Record<string, any> }) => {
        return getArray().filter((i) => this.matchWhere(i, args?.where)).length;
      },

      groupBy: async (args: {
        by: string[];
        where?: Record<string, any>;
        _count?: { _all?: boolean; [key: string]: any };
        _sum?: Record<string, boolean>;
      }) => {
        const field = args.by[0];
        let items = getArray();
        if (args?.where) items = items.filter((i) => this.matchWhere(i, args.where));
        const groups = new Map<any, { count: number; sum: Record<string, number> }>();
        for (const item of items) {
          const val = (item as any)[field];
          if (!groups.has(val)) {
            groups.set(val, { count: 0, sum: {} });
          }
          const g = groups.get(val)!;
          g.count += 1;
          if (args?._sum) {
            for (const sumKey of Object.keys(args._sum)) {
              g.sum[sumKey] = (g.sum[sumKey] || 0) + (Number((item as any)[sumKey]) || 0);
            }
          }
        }
        return Array.from(groups.entries()).map(([key, data]) => ({
          [field]: key,
          _count: { _all: data.count },
          _sum: data.sum,
        }));
      },

      aggregate: async (args?: { where?: Record<string, any>; _sum?: Record<string, boolean> }) => {
        const filtered = getArray().filter((i) => this.matchWhere(i, args?.where));
        const sumResult: Record<string, number> = {};
        if (args?._sum) {
          for (const key of Object.keys(args._sum)) {
            sumResult[key] = filtered.reduce((acc, item) => acc + (Number((item as any)[key]) || 0), 0);
          }
        }
        return {
          _sum: sumResult,
          _count: { _all: filtered.length },
        };
      },

      create: async (args: { data: any; include?: Record<string, any>; select?: Record<string, any> }) => {
        const newItem = {
          id: args.data.id || `${entityName}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...args.data,
        };
        const current = getArray();
        setArray([...current, newItem]);
        this.scheduleSave();
        return this.attachRelations(entityName, newItem, args.include);
      },

      update: async (args: {
        where: Record<string, any>;
        data: any;
        include?: Record<string, any>;
        select?: Record<string, any>;
      }) => {
        const current = getArray();
        const index = current.findIndex((i) => this.matchWhere(i, args.where));
        if (index === -1) {
          throw new Error(`Record to update not found in ${entityName}`);
        }
        const updated = {
          ...current[index],
          ...args.data,
          updatedAt: new Date().toISOString(),
        };
        const next = [...current];
        next[index] = updated;
        setArray(next);
        this.scheduleSave();
        return this.attachRelations(entityName, updated, args.include);
      },

      upsert: async (args: {
        where: Record<string, any>;
        update: any;
        create: any;
        include?: Record<string, any>;
      }) => {
        const current = getArray();
        const existing = current.find((i) => this.matchWhere(i, args.where));
        if (existing) {
          return this.createCollection(entityName, getArray, setArray).update({
            where: args.where,
            data: args.update,
            include: args.include,
          });
        }
        return this.createCollection(entityName, getArray, setArray).create({
          data: args.create,
          include: args.include,
        });
      },

      delete: async (args: { where: Record<string, any> }) => {
        const current = getArray();
        const target = current.find((i) => this.matchWhere(i, args.where));
        if (!target) throw new Error(`Record to delete not found in ${entityName}`);
        setArray(current.filter((i) => !this.matchWhere(i, args.where)));
        this.scheduleSave();
        return target;
      },

      deleteMany: async (args?: { where?: Record<string, any> }) => {
        const current = getArray();
        if (!args?.where || Object.keys(args.where).length === 0) {
          const count = current.length;
          setArray([]);
          this.scheduleSave();
          return { count };
        }
        const remaining = current.filter((i) => !this.matchWhere(i, args.where));
        const deletedCount = current.length - remaining.length;
        setArray(remaining);
        this.scheduleSave();
        return { count: deletedCount };
      },
    };
  }

  public get user() {
    return this.createCollection("user", () => this.data.users, (a) => (this.data.users = a as any));
  }
  public get account() {
    return this.createCollection("account", () => this.data.accounts, (a) => (this.data.accounts = a as any));
  }
  public get session() {
    return this.createCollection("session", () => this.data.sessions, (a) => (this.data.sessions = a as any));
  }
  public get category() {
    return this.createCollection("category", () => this.data.categories, (a) => (this.data.categories = a as any));
  }
  public get vendor() {
    return this.createCollection("vendor", () => this.data.vendors, (a) => (this.data.vendors = a as any));
  }
  public get product() {
    return this.createCollection("product", () => this.data.products, (a) => (this.data.products = a as any));
  }
  public get driver() {
    return this.createCollection("driver", () => this.data.drivers, (a) => (this.data.drivers = a as any));
  }
  public get order() {
    return this.createCollection("order", () => this.data.orders, (a) => (this.data.orders = a as any));
  }
  public get orderItem() {
    return this.createCollection("orderItem", () => this.data.orderItems, (a) => (this.data.orderItems = a as any));
  }
  public get payment() {
    return this.createCollection("payment", () => this.data.payments, (a) => (this.data.payments = a as any));
  }
  public get delivery() {
    return this.createCollection("delivery", () => this.data.deliveries, (a) => (this.data.deliveries = a as any));
  }
  public get review() {
    return this.createCollection("review", () => this.data.reviews, (a) => (this.data.reviews = a as any));
  }
  public get auditLog() {
    return this.createCollection("auditLog", () => this.data.auditLogs, (a) => (this.data.auditLogs = a as any));
  }
  public get platformSetting() {
    return this.createCollection("platformSetting", () => this.data.platformSettings, (a) => (this.data.platformSettings = a as any));
  }
  public get inventory() {
    return this.createCollection("inventory", () => (this.data as any).inventory || [], (a) => ((this.data as any).inventory = a as any));
  }

  public async $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return fn(this);
  }

  public async $queryRaw(..._args: any[]): Promise<any[]> {
    return [{ 1: 1 }];
  }
}

// Global singleton instance
const globalForDb = globalThis as unknown as { prisma?: InMemoryDatabase };
export const prisma = globalForDb.prisma || new InMemoryDatabase();
if (process.env.NODE_ENV !== "production") globalForDb.prisma = prisma;

export const db = prisma;

// Prisma namespace compatibility for types
export namespace Prisma {
  export type VendorWhereInput = Record<string, any>;
  export type ProductWhereInput = Record<string, any>;
  export type CategoryWhereInput = Record<string, any>;
  export type OrderWhereInput = Record<string, any>;
  export type DriverWhereInput = Record<string, any>;
  export type DeliveryWhereInput = Record<string, any>;
  export type UserWhereInput = Record<string, any>;
  export type PaymentWhereInput = Record<string, any>;
  export type AuditLogWhereInput = Record<string, any>;
  export type ReviewWhereInput = Record<string, any>;
  export type EnumAuditActionFilter = Record<string, any> | string;
}
