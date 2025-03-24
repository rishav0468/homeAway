import prisma from "@/app/libs/prismadb";
import { Prisma } from "@prisma/client";

export interface IListingsParams {
  userId?: string;
  guestCount?: number;
  roomCount?: number;
  bathroomCount?: number;
  startDate?: string;
  endDate?: string;
  locationValue?: string;
  category?: string;
}

type Query = Prisma.ListingWhereInput;

export default async function getListings(params: IListingsParams) {
  try {
    const {
      userId,
      roomCount,
      guestCount,
      bathroomCount,
      locationValue,
      startDate,
      endDate,
      category,
    } = params;

    const query: Query = {};
    if (userId) {
      query.userId = userId;
    }

    if (category) {
      query.category = category;
    }

    if (roomCount) {
      query.roomCount = { gte: roomCount };
    }

    if (guestCount) {
      query.guestCount = { gte: guestCount };
    }

    if (bathroomCount) {
      query.bathroomCount = { gte: bathroomCount };
    }

    if (locationValue) {
      query.locationValue = locationValue;
    }

    if (startDate && endDate) {
      query.reservations = {
        none: {
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            }
          ]
        }
      };
    }

    const listings = await prisma.listing.findMany({
      where: query,
      orderBy: {
        createdAt: "desc",
      },
    });

    const safeListings = listings.map((listing) => ({
        ...listing,
        createdAt: listing.createdAt.toString()
    }));
    return safeListings;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unknown error occurred');
    }
  }
}
