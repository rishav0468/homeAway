import getCurrentUser from "./actions/getCurrentUser";
import getListings, { IListingsParams } from "./actions/getListings";
import ClientOnly from "./components/ClientOnly";
import Container from "./components/container";
import EmptyState from "./components/EmptyState";
import ListingCard from "./components/listings/ListingCard";

interface HomeProps{
  searchParams: IListingsParams
}
const Home = async({searchParams}:  HomeProps) => { 
  //const listings=await getListings(searchParams); //
  const resolvedParams = await searchParams;
  const listingParams: IListingsParams = {
    userId: typeof resolvedParams.userId === "string" ? resolvedParams.userId : undefined,
    guestCount: resolvedParams.guestCount ? Number(resolvedParams.guestCount) : undefined,
    roomCount: resolvedParams.roomCount ? Number(resolvedParams.roomCount) : undefined,
    bathroomCount: resolvedParams.bathroomCount ? Number(resolvedParams.bathroomCount) : undefined,
    startDate: typeof resolvedParams.startDate === "string" ? resolvedParams.startDate : undefined,
    endDate: typeof resolvedParams.endDate === "string" ? resolvedParams.endDate : undefined,
    locationValue: typeof resolvedParams.locationValue === "string" ? resolvedParams.locationValue : undefined,
    category: typeof resolvedParams.category === "string" ? resolvedParams.category : undefined,
  };
  
  // const currentUser=await getCurrentUser();
  const listings = await getListings(listingParams);
  const currentUser = await getCurrentUser();

    if (listings.length===0)
    {
      return(
        <ClientOnly>
          <EmptyState showReset />
        </ClientOnly>
      )
    }

    // throw new Error('Something went wrong');

  return (
    <ClientOnly>
      <Container>
      <div className="
        pt-28 /* Increased padding-top */
        grid
        grid-cols-1
        sm:grid-cols-2
        md:grid-cols-3
        lg:grid-cols-4
        xl:grid-cols-5
        2xl:grid-cols-6
        gap-8
      ">
  {listings.map((listing)=> {
    return (
      <ListingCard
        currentUser={currentUser} 
        key={listing.id} 
        data={listing}
        />

    )
  })}
</div>

      </Container>
    </ClientOnly>
  )
} 

export default Home;
