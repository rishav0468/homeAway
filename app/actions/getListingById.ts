import prisma from "@/app/libs/prismadb"

interface IParams{
    listingId: string;
}

export default async function getListingById(
    params: IParams
  ){
    try{
      // Await params before accessing properties
      const paramsObj = await Promise.resolve(params);
      const listingId = paramsObj.listingId;
      
      console.log("listing", listingId);
      const listing = await prisma.listing.findUnique({
        where: {
          id: listingId
        },
        include: {
          user: true
        }
      });
      
      if(!listing){
        return null;
      }
      
      return{
        ...listing,
        createdAt: listing.createdAt.toISOString(),
        user: {
          ...listing.user,
          createdAt: listing.user.createdAt.toISOString(),
          updatedAt: listing.user.updatedAt.toISOString(),
          emailVerified: 
            listing.user.emailVerified?.toISOString() || null,
        }
      };
    }catch(error: unknown){
      if (error instanceof Error) {
        throw error; // Throw the existing error object if it is an Error
    } else {
        throw new Error('An unknown error occurred'); // Throw a generic error if the caught error is not an Error object
    }
    }
  }