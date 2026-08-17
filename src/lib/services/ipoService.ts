import { ipoRepository } from "@/src/lib/db/repositories/ipoRepository";
import { applicationRepository } from "@/src/lib/db/repositories/applicationRepository";
import { logActivity } from "@/src/features/activity/activityService";
import { IPODocument } from "@/src/models/IPO";
import { AuthContext } from "@/src/lib/auth/authorization";

export const ipoService = {
  async getIpos(params: { category?: string; status?: string; search?: string } = {}) {
    const filter: any = { isArchived: { $ne: true } };
    if (params.category && params.category !== "ALL") {
      filter.category = params.category;
    }
    if (params.status && params.status !== "ALL") {
      filter.status = params.status;
    }

    const ipos = await ipoRepository.find(filter, { sort: { createdAt: -1 } });

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      return ipos.filter(
        (ipo) =>
          ipo.name.toLowerCase().includes(q) ||
          ipo.company?.toLowerCase().includes(q)
      );
    }

    return ipos;
  },

  async getIpoById(id: string) {
    return ipoRepository.findById(id);
  },

  async createIpo(data: any, auth: AuthContext) {
    if (!data.name) {
      throw new Error("Validation Error: IPO name is required.");
    }

    const ipoId = `ipo_${Date.now()}`;
    const ipoDoc: IPODocument = {
      id: ipoId,
      name: data.name,
      company: data.company || data.name,
      category: data.category === "SME" ? "SME" : "Mainboard",
      status: data.status || "APPLICATION_OPEN",
      recommendation: data.recommendation || data.decision || "APPLY",
      thesis: data.thesis || "",
      metrics: {
        issueSize: typeof data.issueSize === "string" ? data.issueSize : `₹${data.issueSize || 1000} Cr`,
        priceBand: {
          min: Number(data.priceMin) || 100,
          max: Number(data.priceMax) || 100,
        },
        lotSize: Number(data.lotSize) || 1,
        minInvestment: Number(data.minimumInvestment) || 15000,
        openDate: data.openDate || new Date().toISOString().split("T")[0],
        closeDate: data.closeDate || new Date().toISOString().split("T")[0],
        allotmentDate: data.allotmentDate || new Date().toISOString().split("T")[0],
        listingDate: data.listingDate || new Date().toISOString().split("T")[0],
        gmpPercent: Number(data.gmpPercent) || 0,
      },
      participantsCount: 0,
      combinedCapital: 0,
      isFeatured: Boolean(data.isFeatured),
      isHidden: false,
      createdBy: auth.username || "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ipoRepository.insertOne(ipoDoc);

    await logActivity({
      eventType: "IPO_CREATED",
      category: "PRODUCT",
      severity: "INFO",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "IPO",
      targetId: ipoId,
      targetName: data.name,
    });

    return ipoDoc;
  },

  async updateIpo(id: string, updates: Partial<IPODocument>, auth: AuthContext) {
    const existing = await ipoRepository.findById(id);
    if (!existing) throw new Error("IPO opportunity not found.");

    await ipoRepository.updateOne(id, {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    await logActivity({
      eventType: "IPO_UPDATED",
      category: "PRODUCT",
      severity: "INFO",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "IPO",
      targetId: id,
      targetName: existing.name,
    });

    return ipoRepository.findById(id);
  },

  async completeIpo(id: string, auth: AuthContext) {
    const existing = await ipoRepository.findById(id);
    if (!existing) throw new Error("IPO opportunity not found.");

    await ipoRepository.updateOne(id, {
      $set: {
        status: "COMPLETED" as any,
        stage: "LISTING" as any,
        updatedAt: new Date(),
      },
    });

    await logActivity({
      eventType: "IPO_UPDATED",
      category: "PRODUCT",
      severity: "SUCCESS",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "IPO",
      targetId: id,
      targetName: existing.name,
    });
  },

  async deleteIpo(id: string, auth: AuthContext) {
    const existing = await ipoRepository.findById(id);
    if (!existing) throw new Error("IPO opportunity not found.");

    await ipoRepository.deleteOne(id);

    await logActivity({
      eventType: "IPO_DELETED",
      category: "PRODUCT",
      severity: "WARNING",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "IPO",
      targetId: id,
      targetName: existing.name,
    });
  },
};
