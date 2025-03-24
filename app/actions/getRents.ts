import prisma from "@/app/libs/prismadb";

interface IParams {
  listingId?: string;
  userId?: string;
  authorId?: string;
}

interface Query {
  listingId?: string;
  userId?: string;
  listing?: { userId?: string };
}

export default async function getRents(params: IParams) {
  try {
    const { listingId, userId, authorId } = params;  // Directly destructured for simplicity

    const query: Query = {}; // Use the newly defined Query interface

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
  } catch (error: unknown) {  // Changed from 'any' to 'unknown'
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('An unexpected error occurred');
    }
  }
}
