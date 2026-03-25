import { customType } from "drizzle-orm/pg-core";

export const cidr = customType<{ data: string }>({
  dataType() {
    return "cidr";
  },
});

export const inet = customType<{ data: string }>({
  dataType() {
    return "inet";
  },
});
