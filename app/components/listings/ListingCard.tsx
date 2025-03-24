// 'use client';

// import { SafeListing, SafeReservation, SafeUser } from "@/app/types";
// import { useRouter } from "next/navigation";
// import useCountries from "@/app/hooks/useCountries";
// import { useCallback, useMemo } from "react";
// import { format } from "date-fns";
// import Image from "next/image";
// import HeartButton from "../HeartButton";
// import Button from "../Button";
// import { Reservation } from "@prisma/client";

// interface ListingCardProps {
//   data: SafeListing;
//   reservation?: SafeReservation;
//   onAction?: (id: string) => void;
//   disabled?: boolean;
//   actionLabel?: string;
//   actionId?: string;
//   currentUser: SafeUser | null;
// }

// const ListingCard: React.FC<ListingCardProps> = ({
//   data,
//   reservation,
//   onAction,
//   disabled = false,
//   actionLabel,
//   actionId = "",
//   currentUser
// }) => {  
//   const router = useRouter();
//   const { getByValue } = useCountries();
//   const location = getByValue(data.locationValue);

//   const handleCancel = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
//     e.stopPropagation();
//     if (disabled) return;
//     onAction?.(actionId);
//   }, [onAction, actionId, disabled]);

//   const price = useMemo(() => {
//       if(reservation){
//         return reservation.totalPrice;
//       }
//       return data.price;
//   },[reservation, data.price]);

//   // const reservationDate = useMemo(() => {
//   //   if (!reservation) return null;
//   //   const start = new Date(reservation.startDate);
//   //   const end = new Date(reservation.endDate);
//   //   return `${format(start, 'PP')} - ${format(end, 'PP')}`
//   // }, [reservation]);

//   const reservationDate = useMemo(() => {
//     if (!reservation) return null;
    
//     const start = new Date(reservation.startDate);
//     const end = new Date(reservation.endDate);
    
//     // Check if it's an hourly booking
//     if (reservation.bookingType === 'hourly' && reservation.startTime && reservation.endTime) {
//       return `${format(start, 'PP')} (${reservation.startTime} - ${reservation.endTime})`;
//     }
    
//     // Default date range display for daily bookings
//     return `${format(start, 'PP')} - ${format(end, 'PP')}`;
//   }, [reservation]);

//   return (
//     <div onClick={() => router.push(`/listings/${data.id}`)} className="col-span-1 cursor-pointer group">
//       <div className="flex flex-col gap-2 w-full">
//         <div className="aspect-square w-full relative overflow-hidden rounded-xl">
//         <Image
//              fill
//              src={data.imageSrc || "/placeholder.jpg"} 
//              alt="Listing"
//              className="object-cover h-full w-full group-hover:scale-110 transition"
//             />
//         <div className="absolute top-3 right-3">
//         <HeartButton 
//             listingId={data.id} 
//             currentUser={currentUser} 
//          />
//             </div>
//         </div>
//         <div className="font-semibold text-lg">
//             {location?.region}, {location?.label}
//         </div>
//         <div className="font-light text-neutral-500">
//             {reservationDate || data.category}
//         </div>
//         <div className="flex flex-row items-center gap-1">
//             <div className="font-semibold">
//                 ${price}
//              </div>
//              {!reservation && (
//     <div className="font-light">night</div>
//   )}
//   {reservation && reservation.bookingType === 'hourly' && (
//     <div className="font-light">total</div>
//   )}
//         </div>
//         {onAction && actionLabel &&(
//             <Button
            
//             disabled={disabled}
//             small
//             label={actionLabel}
//             onClick={handleCancel}
//             />
//         )}
//      </div>
//     </div>
//   );
// };

// export default ListingCard;
'use client';

import { SafeListing, SafeReservation, SafeUser } from "@/app/types";
import { useRouter } from "next/navigation";
import useCountries from "@/app/hooks/useCountries";
import { useCallback, useMemo } from "react";
import { format } from "date-fns";
import Image from "next/image";
import HeartButton from "../HeartButton";
import Button from "../Button";

interface ListingCardProps {
  data: SafeListing;
  reservation?: SafeReservation;
  onAction?: (id: string) => void;
  disabled?: boolean;
  actionLabel?: string;
  actionId?: string;
  currentUser: SafeUser | null;
}

const ListingCard: React.FC<ListingCardProps> = ({
  data,
  reservation,
  onAction,
  disabled = false,
  actionLabel,
  actionId = "",
  currentUser
}) => {  
  const router = useRouter();
  const { getByValue } = useCountries();
  const location = getByValue(data.locationValue);

  const handleCancel = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;
    onAction?.(actionId);
  }, [onAction, actionId, disabled]);

  const price = useMemo(() => {
    if(reservation){
      return reservation.totalPrice;
    }
    return data.price;
  },[reservation, data.price]);

  const reservationDate = useMemo(() => {
    if (!reservation) return null;
    
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    
    if (reservation.bookingType === 'hourly' && reservation.startTime && reservation.endTime) {
      return `${format(start, 'PP')} (${reservation.startTime} - ${reservation.endTime})`;
    }
    
    return `${format(start, 'PP')} - ${format(end, 'PP')}`;
  }, [reservation]);

  return (
    <div 
      onClick={() => router.push(`/listings/${data.id}`)} 
      className="
        col-span-1 
        cursor-pointer 
        group 
        rounded-xl 
        overflow-hidden
        shadow-md 
        hover:shadow-xl 
        transition 
        duration-300 
        bg-gradient-to-b from-blue-50 to-white
        transform
        hover:-translate-y-1
        border border-blue-100
      "
    >
      <div className="flex flex-col w-full h-full">
        <div className="aspect-square w-full relative overflow-hidden">
          <Image
            fill
            src={data.imageSrc || "/placeholder.jpg"} 
            alt="Listing"
            className="
              object-cover 
              h-full 
              w-full 
              group-hover:scale-110 
              transition 
              duration-500
            "
          />
          <div className="absolute top-3 right-3">
            <HeartButton listingId={data.id} currentUser={currentUser} />
          </div>
          {data.category && (
            <div className="
              absolute 
              bottom-3 
              left-3 
              bg-blue-500 
              px-3 
              py-1 
              rounded-full 
              text-xs 
              font-medium 
              text-white
              shadow-sm
            ">
              {data.category}
            </div>
          )}
        </div>
        
        <div className="p-4 flex flex-col gap-2 bg-gradient-to-r from-black-55 via-white to-black-50">
          <div className="flex justify-between items-start">
            <div className="font-semibold text-lg text-black-100 line-clamp-1">
              {location?.region}, {location?.label}
            </div>
          </div>
          
          <div className="font-light text-black-700 text-sm">
            {reservationDate || (data.description ? data.description.substring(0, 45) + "..." : "")}
          </div>
          
          <div className="flex flex-row items-center gap-1 mt-1 bg-indigo-100 p-2 rounded-lg inline-block w-auto">
            <div className="font-semibold text-xl text-black-800">
              ${price}
            </div>
            {!reservation && (
              <div className="font-light text-sm text-green-600">/ night</div>
            )}
            {reservation && reservation.bookingType === 'hourly' && (
              <div className="font-light text-sm text-red-600">total</div>
            )}
            {reservation && reservation.bookingType === 'daily' && (
              <div className="font-light text-sm text-red-600">total</div>
            )}
          </div>
          
          {onAction && actionLabel && (
            <Button 
              disabled={disabled}
              small
              label={actionLabel}
              onClick={handleCancel}
              className="
                mt-2 
                w-full 
                bg-red-500 
                hover:bg-red-600 
                text-white 
                font-medium 
                rounded-lg 
                transition
                duration-300
                py-2
              "
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ListingCard;