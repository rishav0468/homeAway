import { Listing, User , Reservation  } from "@prisma/client";

export type SafeListing = Omit<Listing , "createdAt"> & {
  createdAt: string;
  
};

//export type SafeReservation = Omit<Reservation , "createdAt" | "startDate" | "endDate" | "listing" > &{
//   createdAt: string;
//   startDate: string;
//   endDate: string;
//   listing: SafeListing;
// }
// export type SafeRent = Omit<Rent, "createdAt" | "startDate" | "endDate" | "listing"> & {
//   createdAt: string;
//   startDate: string;
//   endDate: string;
//   listing: SafeListing;
//   bookingType: string;
//   startTime: string | null;
//   endTime: string | null;
// };

// Update your SafeReservation type instead:
export type SafeReservation = Omit<Reservation, "createdAt" | "startDate" | "endDate" | "listing"> & {
  createdAt: string;
  startDate: string;
  endDate: string;
  listing: SafeListing;
  bookingType: string;
  startTime: string | null;
  endTime: string | null;
};

export type SafeUser = Omit<User, "createdAt" | "updatedAt" | "emailVerified"> & {
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
};
