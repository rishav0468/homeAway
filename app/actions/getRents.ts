

import prisma from "@/app/libs/prismadb";

interface IParams {
  listingId?: string;
  userId?: string;
  authorId?: string;
}

export default async function getRents(params: IParams) {
  try {
    const resolvedParams = await params;
    
    const listingId = resolvedParams.listingId;
    const userId = resolvedParams.userId;
    const authorId = resolvedParams.authorId;

    const query: any = {};

    if (listingId) {
      query.listingId = listingId;
    }

    if (userId) {
      query.userId = userId;
    }

    if (authorId) {
      query.listing = { userId: authorId };
    }

    const rents = await prisma.reservation.findMany({
      where: query,
      include: {
        listing: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const safeRents = rents.map((rent) => ({
      ...rent,
      createdAt: rent.createdAt.toISOString(),
      startDate: rent.startDate.toISOString(),
      endDate: rent.endDate.toISOString(),
      listing: {
        ...rent.listing,
        createdAt: rent.listing.createdAt.toISOString(),
      },
    }));

    return safeRents;
  } catch (error: any) {
    throw new Error(error.message);
  }
}