import { ApiError } from "../../shared/http/apiError.js";
import { buildExtensionFields } from "../../shared/http/extensions.js";
import { userRepository } from "../../repositories/user.repository.js";

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findProfileById(userId);
    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      kyc: user.kycProfile
        ? {
            status: user.kycProfile.status,
            submittedAt: user.kycProfile.submittedAt,
          }
        : null,
      ...buildExtensionFields({
        verificationStatus: user.verificationStatus,
        aiSummaryCache: user.aiSummaryCache,
      }),
    };
  },

  async listHoldings(userId: string, pagination: { skip: number; take: number; page: number; pageSize: number }) {
    const [total, holdings] = await Promise.all([
      userRepository.countHoldingsByUser(userId),
      userRepository.findHoldingsByUser(userId, pagination.skip, pagination.take),
    ]);

    return {
      items: holdings.map((holding) => ({
        id: holding.id,
        sharesOwned: holding.sharesOwned,
        createdAt: holding.createdAt,
        updatedAt: holding.updatedAt,
        property: {
          id: holding.shareClass.property.id,
          address1: holding.shareClass.property.address1,
          city: holding.shareClass.property.city,
          state: holding.shareClass.property.state,
          status: holding.shareClass.property.status,
          thumbnailUrl: holding.shareClass.property.images[0]?.url ?? null,
          ...buildExtensionFields({
            verificationStatus: holding.shareClass.property.verificationStatus,
            blockchainTxHash: holding.shareClass.property.blockchainTxHash,
            aiSummaryCache: holding.shareClass.property.aiSummaryCache,
          }),
        },
        shareClass: {
          id: holding.shareClass.id,
          totalShares: holding.shareClass.totalShares,
          sharesAvailable: holding.shareClass.sharesAvailable,
          referencePricePerShare: Number(holding.shareClass.referencePricePerShare),
        },
      })),
      total,
    };
  },
};
