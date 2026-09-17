import type { Drop } from "../generated/prisma/client";
import { DropStatus } from "../generated/prisma/client";

import { prisma } from "./prisma";

export type DropWithCounts = Drop & {
  _count: { products: number };
};

export async function getActiveDrop(): Promise<Drop | null> {
  const now = new Date();
  return prisma.drop.findFirst({
    where: {
      status: DropStatus.LIVE,
      AND: [
        { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
        { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function listDropsWithCounts(): Promise<DropWithCounts[]> {
  return prisma.drop.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { products: true } } },
  });
}

export async function listDropsForSelect(): Promise<{ id: string; name: string }[]> {
  return prisma.drop.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true },
  });
}

export async function getDrop(id: string): Promise<Drop | null> {
  return prisma.drop.findUnique({ where: { id } });
}

export const DROP_STATUS_LABEL: Record<DropStatus, string> = {
  DRAFT: "Draft",
  LIVE: "Live",
  CLOSED: "Closed",
};

export const DROP_STATUS_COLOR: Record<DropStatus, string> = {
  DRAFT: "bg-lilac-400 text-ink-950",
  LIVE: "bg-teal-500 text-ink-950",
  CLOSED: "bg-coral-500 text-ink-950",
};
