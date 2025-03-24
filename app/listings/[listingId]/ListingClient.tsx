'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { categories } from '@/app/components/navbar/Categories';
import { SafeListing, SafeReservation, SafeUser } from '@/app/types';
import React from 'react';
import ListingHead from '@/app/api/listings/ListingHead';
import ListingInfo from '@/app/components/listings/ListingInfo';
import useLoginModal from '@/app/hooks/useLoginModal';
import { useRouter } from 'next/navigation';
import { differenceInCalendarDays, eachDayOfInterval, format, addDays } from 'date-fns';
import ListingReservation from '@/app/components/listings/ListingReservation';
import { Range } from 'react-date-range';
import axios from 'axios';
import toast from 'react-hot-toast';

const initialDateRange = {
  startDate: new Date(),
  endDate: addDays(new Date(), 1), // Setting initial end date to one day after start date
  key: 'selection',
};

const initialTimeRange = {
  startTime: '',
  endTime: '',
};

interface ListingClientProps {
  reservations?: SafeReservation[];
  listing: SafeListing & {
    user: SafeUser;
  };
  currentUser?: SafeUser | null;
}

const ListingClient: React.FC<ListingClientProps> = ({
  listing,
  reservations = [],
  currentUser,
}) => {
  const loginModal = useLoginModal();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(listing.price);
  const [dateRange, setDateRange] = useState<Range>(initialDateRange);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [bookingType, setBookingType] = useState<string>('daily');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [dateAvailability, setDateAvailability] = useState<{
    hasFullDayBooking: boolean;
    hasHourlyBookings: boolean;
  }>({ hasFullDayBooking: false, hasHourlyBookings: false });
  const [hasLateCheckout, setHasLateCheckout] = useState(false);
  const [lateCheckoutFee, setLateCheckoutFee] = useState(0);
  
  // Calculate hourly price: (daily price / 24) * 1.5
  const hourlyPrice = useMemo(() => {
    const calculatedPrice = Math.round((listing.price / 24) * 1.5);
    // Ensure it's at least 1
    return Math.max(1, calculatedPrice);
  }, [listing.price]);

  // Calculate minimum booking hours (3 hours)
  const minBookingHours = 3;
  
  // Calculate the cut-off time for hourly bookings (10 PM)
  const lateCutoffHour = 22; // 10 PM
  
  // Calculate disabled dates from existing reservations
  const disabledDates = useMemo(() => {
    let dates: Date[] = [];
  
    reservations.forEach((reservation: any) => {
      // Only fully block days with daily bookings
      if (reservation.bookingType === 'daily') {
        // Create range from start date to the day before end date
        const range = eachDayOfInterval({
          start: new Date(reservation.startDate),
          end: addDays(new Date(reservation.endDate), -1), // Excludes checkout day
        });
        
        // Use Set to avoid duplicate dates
        dates = [...new Set([...dates, ...range])];
      }
    });
    
    return dates;
  }, [reservations]);
  

  // Function to check date availability status
  
// Fix 2: Update how date availability is checked to properly handle checkout days

// Fix 2: Corrected date availability checking to properly handle checkout days
const checkDateAvailability = useCallback((date: Date | undefined) => {
  if (!date) return { hasFullDayBooking: false, hasHourlyBookings: false };
  
  const dateStr = format(date, 'yyyy-MM-dd');
  console.log('Checking availability for date:', dateStr);
  
  // Check if the date has a full-day booking
  const hasFullDayBooking = reservations.some(reservation => {
    if (reservation.bookingType !== 'daily') return false;
    
    const reservationStart = format(new Date(reservation.startDate), 'yyyy-MM-dd');
    const reservationEnd = format(new Date(reservation.endDate), 'yyyy-MM-dd');
    
    // IMPORTANT FIX: Exclude the end date (checkout day) from being considered as fully booked
    // A date is considered fully booked only if it's between start date and the day BEFORE end date
    return (reservationStart <= dateStr && dateStr < reservationEnd);
  });
  
  // Check if the date has any hourly bookings
  const hasHourlyBookings = reservations.some(reservation => {
    if (reservation.bookingType !== 'hourly') return false;
    
    const reservationDate = format(new Date(reservation.startDate), 'yyyy-MM-dd');
    return reservationDate === dateStr;
  });
  
  return {
    hasFullDayBooking,
    hasHourlyBookings
  };
}, [reservations]);

  
  // Validate that start and end dates are not the same
  const validateDateRange = useCallback((range: Range) => {
    if (!range.startDate || !range.endDate) return null;
    
    // Check if start and end dates are the same day
    if (format(range.startDate, 'yyyy-MM-dd') === format(range.endDate, 'yyyy-MM-dd')) {
      return 'Minimum booking is 2 days. Start and end dates cannot be the same.';
    }
    
    // Check for minimum stay requirement
    const dayCount = differenceInCalendarDays(range.endDate, range.startDate);
    if (dayCount < 1) {
      return 'Minimum booking is 2 days.';
    }
    
    // Check for conflicts with existing reservations
    const selectedStartDateStr = format(range.startDate, 'yyyy-MM-dd');
    const selectedEndDateStr = format(range.endDate, 'yyyy-MM-dd');
    
    // Debugging
    console.log(`Validating booking from ${selectedStartDateStr} to ${selectedEndDateStr}`);
    
    // Check each day in the selected range for conflicts
    const daysToCheck = eachDayOfInterval({
      start: range.startDate,
      end: addDays(range.endDate, -1) // Don't check the checkout day
    });
    
    for (const day of daysToCheck) {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      // Check if this day conflicts with any reservation
      for (const reservation of reservations) {
        if (reservation.bookingType !== 'daily') continue;
        
        const reservationStartStr = format(new Date(reservation.startDate), 'yyyy-MM-dd');
        const reservationEndStr = format(new Date(reservation.endDate), 'yyyy-MM-dd');
        
        // IMPORTANT FIX: A day is only conflicting if it's between start date and the day before end date
        // Checkout days can be new check-in days
        if (reservationStartStr <= dayStr && dayStr < reservationEndStr) {
          console.log(`Conflict found: ${dayStr} is within reservation ${reservationStartStr} to ${reservationEndStr}`);
          return `Selected dates conflict with an existing reservation (${reservationStartStr} to ${reservationEndStr}).`;
        }
      }
      
      // For the start date, check if it has hourly bookings
      if (dayStr === selectedStartDateStr) {
        const hasHourlyBookings = reservations.some(reservation => 
          reservation.bookingType === 'hourly' && 
          format(new Date(reservation.startDate), 'yyyy-MM-dd') === dayStr
        );
        
        if (hasHourlyBookings) {
          console.log(`Conflict found: ${dayStr} has hourly bookings`);
          return 'Start date already has hourly bookings. Please choose another date.';
        }
      }
    }
    
    return null;
  }, [reservations]);
  
  
  // Custom date range change handler to enforce minimum 2-day booking
  // In your handleDateRangeChange function
const handleDateRangeChange = useCallback((range: Range) => {
  if (bookingType === 'hourly') {
    // For hourly bookings, always set end date equal to start date
    setDateRange({
      ...range,
      endDate: range.startDate
    });
  } else {
    // For daily bookings, enforce minimum 2-day booking
    if (range.startDate && range.endDate && 
        (format(range.startDate, 'yyyy-MM-dd') === format(range.endDate, 'yyyy-MM-dd'))) {
      // Automatically set end date to the day after start date
      const newEndDate = addDays(range.startDate, 1);
      setDateRange({
        ...range,
        endDate: newEndDate
      });
    } else {
      setDateRange(range);
    }
  }
}, [bookingType]);

  // Update date availability when date changes
  useEffect(() => {
    if (dateRange.startDate) {
      const availability = checkDateAvailability(dateRange.startDate);
      setDateAvailability(availability);
      
      // Validate date range for daily bookings
      if (bookingType === 'daily') {
        const dateError = validateDateRange(dateRange);
        if (dateError) {
          setBookingError(dateError);
        } else if (availability.hasHourlyBookings) {
          setBookingError('This date already has hourly bookings. Please choose another date.');
        } else {
          setBookingError(null);
        }
      } else if (bookingType === 'hourly' && availability.hasFullDayBooking) {
        setBookingError('This date is already fully booked. Please choose another date.');
      } else {
        setBookingError(null);
      }
    }
  }, [dateRange, bookingType, checkDateAvailability, validateDateRange]);
  
  // Calculate disabled time slots for the selected date
  const disabledTimeSlots = useMemo(() => {
    if (!dateRange.startDate) return [];
    
    const selectedDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
    const slotsForSelectedDate: { startTime: string; endTime: string }[] = [];
    
    // Filter reservations for the selected date
    reservations
      .filter(reservation => {
        const reservationDate = format(new Date(reservation.startDate), 'yyyy-MM-dd');
        return reservationDate === selectedDateStr && reservation.bookingType === 'hourly';
      })
      .forEach(reservation => {
        // Add the reservation time slot
        if (reservation.startTime && reservation.endTime) {
          slotsForSelectedDate.push({
            startTime: reservation.startTime,
            endTime: reservation.endTime
          });
          
          // Add the 1-hour cleaning slot after the reservation
          const endHour = parseInt(reservation.endTime.split(':')[0]);
          const cleaningEndHour = endHour + 1;
          const cleaningEndTime = `${String(cleaningEndHour).padStart(2, '0')}:00`;
          
          slotsForSelectedDate.push({
            startTime: reservation.endTime,
            endTime: cleaningEndTime
          });
        }
      });
    
    return slotsForSelectedDate;
  }, [reservations, dateRange.startDate]);

  // Handle late checkout change
  const handleLateCheckoutChange = useCallback((value: boolean) => {
    setHasLateCheckout(value);
  }, []);

  // Calculate late checkout fee when price or late checkout status changes
  useEffect(() => {
    if (hasLateCheckout && bookingType === 'daily') {
      // Calculate 20% of the base daily price
      const fee = Math.round(listing.price * 0.2);
      setLateCheckoutFee(fee);
    } else {
      setLateCheckoutFee(0);
    }
  }, [hasLateCheckout, listing.price, bookingType]);

  // Validate time selection based on rules
  const validateTimeSelection = useCallback(() => {
    if (!timeRange.startTime || !timeRange.endTime) return null;
    
    if (dateAvailability.hasFullDayBooking) {
      return 'This date is already fully booked';
    }
    
    const startHour = parseInt(timeRange.startTime.split(':')[0]);
    const endHour = parseInt(timeRange.endTime.split(':')[0]);
    const hourCount = endHour - startHour;
    
    // Rule 2: Minimum 3 hours booking
    if (hourCount < minBookingHours) {
      return `Minimum booking time is ${minBookingHours} hours`;
    }
    
    // Rule 3: If booking is more than 8 hours, suggest daily booking
    if (hourCount > 8) {
      return 'For bookings longer than 8 hours, please consider a daily booking';
    }
    
    // Rule 4: No bookings past 10 PM
    if (endHour > lateCutoffHour) {
      return 'Hourly bookings cannot extend past 10 PM';
    }
    
    return null;
  }, [timeRange, minBookingHours, dateAvailability.hasFullDayBooking]);

  // Handle booking type change
  const handleBookingTypeChange = useCallback((type: string) => {
    setBookingType(type);
    setBookingError(null);
    
    // Reset late checkout when switching booking types
    if (type === 'hourly') {
      setHasLateCheckout(false);
    }
    
    // Check if the selected date is compatible with the booking type
    if (dateRange.startDate) {
      const { hasFullDayBooking, hasHourlyBookings } = dateAvailability;
      
      if (type === 'daily') {
        // Validate date range for daily bookings
        const dateError = validateDateRange(dateRange);
        if (dateError) {
          setBookingError(dateError);
        } else if (hasHourlyBookings) {
          setBookingError('This date already has hourly bookings. Please choose another date.');
        }
      } else if (type === 'hourly' && hasFullDayBooking) {
        setBookingError('This date is already fully booked. Please choose another date.');
      }
    }
  }, [dateRange, dateAvailability, validateDateRange]);

  // Update error message when time range changes
  useEffect(() => {
    if (bookingType === 'hourly') {
      const error = validateTimeSelection();
      setBookingError(error);
    }
  }, [timeRange, bookingType, validateTimeSelection]);

  const onCreateReservation = useCallback(() => {
    if (!currentUser) {
      return loginModal.onOpen();
    }
  
    if (!listing || !listing.id) {
      toast.error('Listing information is missing');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
  
    // Clear debug info
    console.log("Creating reservation with dates:", {
      startDate: dateRange.startDate ? format(dateRange.startDate, 'yyyy-MM-dd') : 'none',
      endDate: dateRange.endDate ? format(dateRange.endDate, 'yyyy-MM-dd') : 'none',
      bookingType,
      hasLateCheckout: hasLateCheckout
    });

    if (totalPrice <= 0) {
      toast.error('Invalid price calculation');
      setIsLoading(false);
      return;
    }
    
    if (!dateRange.startDate) {
      toast.error('Start date is missing');
      setIsLoading(false);
      return;
    }

    const startDateAvailability = checkDateAvailability(dateRange.startDate);
    
    // Check booking compatibility with date
    const { hasFullDayBooking, hasHourlyBookings } = dateAvailability;
    
    if (bookingType === 'daily') {
      // Critical fix here: Use the validateDateRange function to check dates
      const dateError = validateDateRange(dateRange);
      if (dateError) {
        toast.error(dateError);
        setIsLoading(false);
        return;
      }

      if (startDateAvailability.hasHourlyBookings) {
        toast.error('This date already has hourly bookings. Please choose another date.');
        setIsLoading(false);
        return;
      }
      
      if (hasHourlyBookings) {
        toast.error('This date already has hourly bookings. Please choose another date.');
        setIsLoading(false);
        return;
      }
    } 
    if (bookingType === 'hourly' && startDateAvailability.hasFullDayBooking) {
      toast.error('This date is already fully booked. Please choose another date.');
      setIsLoading(false);
      return;
    }
    
    if (bookingType === 'hourly' && hasFullDayBooking) {
      toast.error('This date is already fully booked. Please choose another date.');
      setIsLoading(false);
      return;
    }
       
    
    // Validate hourly bookings
    if (bookingType === 'hourly') {
      if (!timeRange.startTime || !timeRange.endTime) {
        toast.error('Please select both start and end times');
        setIsLoading(false);
        return;
      }
      
      // Check if the booking meets our criteria
      const error = validateTimeSelection();
      if (error) {
        toast.error(error);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    
    // Make sure we have valid date objects
    if (!dateRange.startDate || !(dateRange.startDate instanceof Date) || 
        !dateRange.endDate || !(dateRange.endDate instanceof Date)) {
      console.error("Invalid date range");
      toast.error('Please select valid dates');
      setIsLoading(false);
      return;
    }
    
    // Ensure start date and end date are not the same for daily bookings
    if (bookingType === 'daily') {
      const sameDay = format(dateRange.startDate, 'yyyy-MM-dd') === format(dateRange.endDate, 'yyyy-MM-dd');
      if (sameDay) {
        toast.error('Minimum booking is 2 days. Start and end dates cannot be the same.');
        setIsLoading(false);
        return;
      }
    }
    
    // Calculate final price based on all rules
    let finalPrice = totalPrice;
    const days = differenceInCalendarDays(dateRange.endDate, dateRange.startDate);
    
    // Rule 3: Multi-day booking with 10% premium
    if (days > 1) {
      finalPrice = listing.price * days * 1.1; // Add 10% premium for multi-day bookings
    }

    // Add late checkout fee if applicable
    if (bookingType === 'daily' && hasLateCheckout) {
      finalPrice += lateCheckoutFee;
    }

    const checkForConflicts = () => {
      if (!dateRange.startDate || !dateRange.endDate) return "Missing dates";
      
      // For debug purposes
      const startStr = format(dateRange.startDate, 'yyyy-MM-dd');
      const endStr = format(dateRange.endDate, 'yyyy-MM-dd');
      
      console.log(`Checking if can book from ${startStr} to ${endStr}...`);
      
      // For daily bookings, use the validateDateRange function
      if (bookingType === 'daily') {
        return validateDateRange(dateRange);
      }
      
      // For hourly bookings, check if the date is fully booked
      if (bookingType === 'hourly' && dateAvailability.hasFullDayBooking) {
        return 'This date is already fully booked. Please choose another date.';
      }
      return null;
    };

    const conflicts = checkForConflicts();
    if (conflicts) {
      console.log("Booking conflicts found:", conflicts);
      toast.error(conflicts);
      setIsLoading(false);
      return;
    }
    
    // Prepare the reservation data
    const reservationData = {
      totalPrice,
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      listingId: listing.id,
      bookingType,
      hasLateCheckout: bookingType === 'daily' ? hasLateCheckout : false,
      ...(bookingType === 'hourly' ? {
        startTime: timeRange.startTime,
        endTime: timeRange.endTime
      } : {})
    };
  
    // Add debug data
    console.log("Sending reservation data:", JSON.stringify(reservationData));
  
    axios
    .post('/api/reservations', reservationData)
    .then(() => {
      toast.success('Listing reserved!');
      setDateRange(initialDateRange);
      if (bookingType === 'hourly') {
        setTimeRange(initialTimeRange);
      }
      setHasLateCheckout(false);
      router.push('/trips');
    })
    .catch((error) => {
      console.error("Reservation error:", error);
      console.error("Server response:", error.response?.data);
      const errorMessage = error.response?.data?.error || 'Something went wrong';
      toast.error(`Reservation failed: ${errorMessage}`);
    })
    .finally(() => {
      setIsLoading(false);
    });
}, [
  totalPrice, 
  dateRange, 
  listing?.id, 
  router, 
  currentUser, 
  loginModal, 
  bookingType, 
  timeRange,
  dateAvailability,
  hasLateCheckout,
  lateCheckoutFee,
  validateDateRange,
  validateTimeSelection,
  checkDateAvailability
]);

  // Update total price when date range, time range, or late checkout changes
  useEffect(() => {
    if (bookingType === 'daily') {
      // Daily booking price calculation
      if (dateRange.startDate && dateRange.endDate) {
        const dayCount = differenceInCalendarDays(
          dateRange.endDate,
          dateRange.startDate
        );

        if (dayCount && listing.price) {
          // Rule 3: Add 10% premium for multi-day bookings
          const premium = dayCount > 1 ? 1.1 : 1;
          let calculatedPrice = Math.round(dayCount * listing.price * premium);
          
          // Add late checkout fee if applicable
          if (hasLateCheckout) {
            calculatedPrice += lateCheckoutFee;
          }
          
          setTotalPrice(calculatedPrice);
        } else {
          // Single day booking (should not happen with our validation)
          let basePrice = listing.price;
          
          // Add late checkout fee if applicable
          if (hasLateCheckout) {
            basePrice += lateCheckoutFee;
          }
          
          setTotalPrice(basePrice);
        }
      }
    } else {
      // Hourly booking price calculation
      if (timeRange.startTime && timeRange.endTime) {
        const startHour = parseInt(timeRange.startTime.split(':')[0]);
        const endHour = parseInt(timeRange.endTime.split(':')[0]);
        const hourCount = endHour - startHour;
        
        // Rule 3: If booking exceeds 8 hours, use daily rate
        if (hourCount > 8) {
          setTotalPrice(listing.price);
        } else if (hourCount && hourlyPrice) {
          // Regular hourly rate
          setTotalPrice(hourCount * hourlyPrice);
        } else {
          setTotalPrice(0);
        }
        
        // Rule 4: If booking extends past 10 PM, use full day rate
        if (endHour > lateCutoffHour) {
          setTotalPrice(listing.price);
        }
      } else {
        setTotalPrice(0);
      }
    }
  }, [dateRange, listing.price, bookingType, timeRange, hourlyPrice, lateCutoffHour, hasLateCheckout, lateCheckoutFee]);

  // Get category
  const category = useMemo(() => {
    return categories.find((item) => item.label === listing.category);
  }, [listing.category]);

  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="flex flex-col gap-6">
        <ListingHead
          title={listing.title}
          imageSrc={listing.imageSrc}
          locationValue={listing.locationValue}
          id={listing.id}
          currentUser={currentUser}
        />
        <div className="grid grid-col-1 md:grid-cols-7 md:gap-10 mt-6">
          <ListingInfo
            user={listing.user}
            category={category}
            description={listing.description}
            roomCount={listing.roomCount}
            guestCount={listing.guestCount}
            bathroomCount={listing.bathroomCount}
            locationValue={listing.locationValue}
          />
          <div className="order-first mb-10 md:order-last md:col-span-3">
            <ListingReservation
              price={listing.price}
              totalPrice={totalPrice}
              onChangeDate={(value) => handleDateRangeChange(value)}
              dateRange={dateRange}
              onSubmit={onCreateReservation}
              disabled={isLoading || !!bookingError}
              disabledDates={disabledDates}
              // Hourly booking props
              bookingType={bookingType}
              onChangeBookingType={handleBookingTypeChange}
              hourlyPrice={hourlyPrice}
              timeRange={timeRange}
              onChangeTimeRange={setTimeRange}
              disabledTimeSlots={disabledTimeSlots}
              bookingError={bookingError}
              minBookingHours={minBookingHours}
              maxHourlyBookingHours={8}
              lateCutoffHour={lateCutoffHour}
              dateAvailability={dateAvailability}
              // Late checkout props
              hasLateCheckout={hasLateCheckout}
              onChangeLateCheckout={handleLateCheckoutChange}
              lateCheckoutFee={lateCheckoutFee}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingClient;


// 'use client';

// import { useCallback, useEffect, useMemo, useState } from 'react';
// import { categories } from '@/app/components/navbar/Categories';
// import { SafeListing, SafeReservation, SafeUser } from '@/app/types';
// import React from 'react';
// import ListingHead from '@/app/api/listings/ListingHead';
// import ListingInfo from '@/app/components/listings/ListingInfo';
// import useLoginModal from '@/app/hooks/useLoginModal';
// import { useRouter } from 'next/navigation';
// import { differenceInCalendarDays, eachDayOfInterval, format } from 'date-fns';
// import ListingReservation from '@/app/components/listings/ListingReservation';
// import { Range } from 'react-date-range';
// import axios from 'axios';
// import toast from 'react-hot-toast';

// const initialDateRange = {
//   startDate: new Date(),
//   endDate: new Date(),
//   key: 'selection',
// };

// const initialTimeRange = {
//   startTime: '',
//   endTime: '',
// };

// interface ListingClientProps {
//   reservations?: SafeReservation[];
//   listing: SafeListing & {
//     user: SafeUser;
//   };
//   currentUser?: SafeUser | null;
// }

// const ListingClient: React.FC<ListingClientProps> = ({
//   listing,
//   reservations = [],
//   currentUser,
// }) => {
//   const loginModal = useLoginModal();
//   const router = useRouter();
//   const [isLoading, setIsLoading] = useState(false);
//   const [totalPrice, setTotalPrice] = useState(listing.price);
//   const [dateRange, setDateRange] = useState<Range>(initialDateRange);
//   const [timeRange, setTimeRange] = useState(initialTimeRange);
//   const [bookingType, setBookingType] = useState<string>('daily');
//   const [bookingError, setBookingError] = useState<string | null>(null);
//   const [dateAvailability, setDateAvailability] = useState<{
//     hasFullDayBooking: boolean;
//     hasHourlyBookings: boolean;
//   }>({ hasFullDayBooking: false, hasHourlyBookings: false });
//   const [hasLateCheckout, setHasLateCheckout] = useState(false);
//   const [lateCheckoutFee, setLateCheckoutFee] = useState(0);
  
//   // Calculate hourly price: (daily price / 24) * 1.5
//   const hourlyPrice = useMemo(() => {
//     const calculatedPrice = Math.round((listing.price / 24) * 1.5);
//     // Ensure it's at least 1
//     return Math.max(1, calculatedPrice);
//   }, [listing.price]);

//   // Calculate minimum booking hours (3 hours)
//   const minBookingHours = 3;
  
//   // Calculate the cut-off time for hourly bookings (10 PM)
//   const lateCutoffHour = 22; // 10 PM
  
//   // Calculate disabled dates from existing reservations
//   const disabledDates = useMemo(() => {
//     let dates: Date[] = [];

//     reservations.forEach((reservation: any) => {
//       // Only fully block days with daily bookings
//       if (reservation.bookingType === 'daily') {
//         const range = eachDayOfInterval({
//           start: new Date(reservation.startDate),
//           end: new Date(reservation.endDate),
//         });
//         dates = [...dates, ...range];
//       }
//     });
//     return dates;
//   }, [reservations]);
  
//   // Function to check date availability status
//   const checkDateAvailability = useCallback((date: Date | undefined) => {
//     if (!date) return { hasFullDayBooking: false, hasHourlyBookings: false };
    
//     const dateStr = format(date, 'yyyy-MM-dd');
    
//     // Check if the date has a full-day booking
//     const hasFullDayBooking = reservations.some(reservation => {
//       const reservationStart = format(new Date(reservation.startDate), 'yyyy-MM-dd');
//       const reservationEnd = format(new Date(reservation.endDate), 'yyyy-MM-dd');
      
//       return (
//         reservation.bookingType === 'daily' &&
//         dateStr >= reservationStart && 
//         dateStr <= reservationEnd
//       );
//     });
    
//     // Check if the date has any hourly bookings
//     const hasHourlyBookings = reservations.some(reservation => {
//       const reservationDate = format(new Date(reservation.startDate), 'yyyy-MM-dd');
//       return reservationDate === dateStr && reservation.bookingType === 'hourly';
//     });
    
//     return {
//       hasFullDayBooking,
//       hasHourlyBookings
//     };
//   }, [reservations]);

//   // Update date availability when date changes
//   useEffect(() => {
//     if (dateRange.startDate) {
//       const availability = checkDateAvailability(dateRange.startDate);
//       setDateAvailability(availability);
      
//       // Automatically set error if trying to book incompatible type
//       if (bookingType === 'daily' && availability.hasHourlyBookings) {
//         setBookingError('This date already has hourly bookings. Please choose another date.');
//       } else if (bookingType === 'hourly' && availability.hasFullDayBooking) {
//         setBookingError('This date is already fully booked. Please choose another date.');
//       }
//     }
//   }, [dateRange.startDate, bookingType, checkDateAvailability]);
  
//   // Calculate disabled time slots for the selected date
//   const disabledTimeSlots = useMemo(() => {
//     if (!dateRange.startDate) return [];
    
//     const selectedDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
//     const slotsForSelectedDate: { startTime: string; endTime: string }[] = [];
    
//     // Filter reservations for the selected date
//     reservations
//       .filter(reservation => {
//         const reservationDate = format(new Date(reservation.startDate), 'yyyy-MM-dd');
//         return reservationDate === selectedDateStr && reservation.bookingType === 'hourly';
//       })
//       .forEach(reservation => {
//         // Add the reservation time slot
//         if (reservation.startTime && reservation.endTime) {
//           slotsForSelectedDate.push({
//             startTime: reservation.startTime,
//             endTime: reservation.endTime
//           });
          
//           // Add the 1-hour cleaning slot after the reservation
//           const endHour = parseInt(reservation.endTime.split(':')[0]);
//           const cleaningEndHour = endHour + 1;
//           const cleaningEndTime = `${String(cleaningEndHour).padStart(2, '0')}:00`;
          
//           slotsForSelectedDate.push({
//             startTime: reservation.endTime,
//             endTime: cleaningEndTime
//           });
//         }
//       });
    
//     return slotsForSelectedDate;
//   }, [reservations, dateRange.startDate]);

//   // Handle late checkout change
//   const handleLateCheckoutChange = useCallback((value: boolean) => {
//     setHasLateCheckout(value);
//   }, []);

//   // Calculate late checkout fee when price or late checkout status changes
//   useEffect(() => {
//     if (hasLateCheckout && bookingType === 'daily') {
//       // Calculate 20% of the base daily price
//       const fee = Math.round(listing.price * 0.2);
//       setLateCheckoutFee(fee);
//     } else {
//       setLateCheckoutFee(0);
//     }
//   }, [hasLateCheckout, listing.price, bookingType]);

//   // Validate time selection based on rules
//   const validateTimeSelection = useCallback(() => {
//     if (!timeRange.startTime || !timeRange.endTime) return null;
    
//     if (dateAvailability.hasFullDayBooking) {
//       return 'This date is already fully booked';
//     }
    
//     const startHour = parseInt(timeRange.startTime.split(':')[0]);
//     const endHour = parseInt(timeRange.endTime.split(':')[0]);
//     const hourCount = endHour - startHour;
    
//     // Rule 2: Minimum 3 hours booking
//     if (hourCount < minBookingHours) {
//       return `Minimum booking time is ${minBookingHours} hours`;
//     }
    
//     // Rule 3: If booking is more than 8 hours, suggest daily booking
//     if (hourCount > 8) {
//       return 'For bookings longer than 8 hours, please consider a daily booking';
//     }
    
//     // Rule 4: No bookings past 10 PM
//     if (endHour > lateCutoffHour) {
//       return 'Hourly bookings cannot extend past 10 PM';
//     }
    
//     return null;
//   }, [timeRange, minBookingHours, dateAvailability.hasFullDayBooking]);

//   // Handle booking type change
//   const handleBookingTypeChange = useCallback((type: string) => {
//     setBookingType(type);
//     setBookingError(null);
    
//     // Reset late checkout when switching booking types
//     if (type === 'hourly') {
//       setHasLateCheckout(false);
//     }
    
//     // Check if the selected date is compatible with the booking type
//     if (dateRange.startDate) {
//       const { hasFullDayBooking, hasHourlyBookings } = dateAvailability;
      
//       if (type === 'daily' && hasHourlyBookings) {
//         setBookingError('This date already has hourly bookings. Please choose another date.');
//       } else if (type === 'hourly' && hasFullDayBooking) {
//         setBookingError('This date is already fully booked. Please choose another date.');
//       }
//     }
//   }, [dateRange.startDate, dateAvailability]);

//   // Update error message when time range changes
//   useEffect(() => {
//     if (bookingType === 'hourly') {
//       const error = validateTimeSelection();
//       setBookingError(error);
//     }
//   }, [timeRange, bookingType, validateTimeSelection]);

//   const onCreateReservation = useCallback(() => {
//     if (!currentUser) {
//       return loginModal.onOpen();
//     }

//     if (!listing || !listing.id) {
//       toast.error('Listing information is missing');
//       setIsLoading(false);
//       return;
//     }
    
//     if (totalPrice <= 0) {
//       toast.error('Invalid price calculation');
//       setIsLoading(false);
//       return;
//     }
    
//     if (!dateRange.startDate) {
//       toast.error('Start date is missing');
//       setIsLoading(false);
//       return;
//     }
    
//     // Check booking compatibility with date
//     const { hasFullDayBooking, hasHourlyBookings } = dateAvailability;
    
//     if (bookingType === 'daily' && hasHourlyBookings) {
//       toast.error('This date already has hourly bookings. Please choose another date.');
//       setIsLoading(false);
//       return;
//     } 
    
//     if (bookingType === 'hourly' && hasFullDayBooking) {
//       toast.error('This date is already fully booked. Please choose another date.');
//       setIsLoading(false);
//       return;
//     }
    
//     // Validate hourly bookings
//     if (bookingType === 'hourly') {
//       if (!timeRange.startTime || !timeRange.endTime) {
//         toast.error('Please select both start and end times');
//         setIsLoading(false);
//         return;
//       }
      
//       // Check if the booking meets our criteria
//       const error = validateTimeSelection();
//       if (error) {
//         toast.error(error);
//         setIsLoading(false);
//         return;
//       }
//     }

//     setIsLoading(true);
    
//     // Make sure we have valid date objects
//     if (!dateRange.startDate || !(dateRange.startDate instanceof Date)) {
//       console.error("Invalid start date");
//       toast.error('Please select a valid date');
//       setIsLoading(false);
//       return;
//     }
    
//     // Calculate final price based on all rules
//     let finalPrice = totalPrice;
//     const days = dateRange.endDate && differenceInCalendarDays(dateRange.endDate, dateRange.startDate);
    
//     // Rule 3: Multi-day booking with 10% premium
//     if (days && days > 1) {
//       finalPrice = listing.price * days * 1.1; // Add 10% premium for multi-day bookings
//     }

//     // Add late checkout fee if applicable
//     if (bookingType === 'daily' && hasLateCheckout) {
//       finalPrice += lateCheckoutFee;
//     }
    
//     // Prepare the reservation data
//     const reservationData = {
//       totalPrice: finalPrice,
//       startDate: dateRange.startDate.toISOString(),
//       endDate: dateRange.endDate ? dateRange.endDate.toISOString() : dateRange.startDate.toISOString(),
//       listingId: listing.id,
//       bookingType,
//       hasLateCheckout: bookingType === 'daily' ? hasLateCheckout : false,
//       ...(bookingType === 'hourly' ? {
//         startTime: timeRange.startTime,
//         endTime: timeRange.endTime
//       } : {})
//     };

//     console.log("Reservation data being sent:", JSON.stringify(reservationData));

//     // Check all required fields are present
//     if (!reservationData.listingId || !reservationData.startDate || !reservationData.totalPrice) {
//       toast.error('Missing required reservation data');
//       console.error("Missing fields:", {
//         listingId: !reservationData.listingId,
//         startDate: !reservationData.startDate,
//         totalPrice: !reservationData.totalPrice
//       });
//       setIsLoading(false);
//       return;
//     }

//     axios
//       .post('/api/reservations', reservationData)
//       .then(() => {
//         toast.success('Listing reserved!');
//         setDateRange(initialDateRange);
//         if (bookingType === 'hourly') {
//           setTimeRange(initialTimeRange);
//         }
//         setHasLateCheckout(false);
//         router.push('/trips');
//       })
//       .catch((error) => {
//         console.error("Reservation error:", error);
//         console.error("Response data:", error.response?.data);
//         const errorMessage = error.response?.data?.error || 'Something went wrong';
//         toast.error(errorMessage);
//       })
//       .finally(() => {
//         setIsLoading(false);
//       });
//   }, [
//     totalPrice, 
//     dateRange, 
//     listing?.id, 
//     listing.price,
//     router, 
//     currentUser, 
//     loginModal, 
//     bookingType, 
//     timeRange,
//     validateTimeSelection,
//     dateAvailability,
//     hasLateCheckout,
//     lateCheckoutFee
//   ]);

//   // Update total price when date range, time range, or late checkout changes
//   useEffect(() => {
//     if (bookingType === 'daily') {
//       // Daily booking price calculation
//       if (dateRange.startDate && dateRange.endDate) {
//         const dayCount = differenceInCalendarDays(
//           dateRange.endDate,
//           dateRange.startDate
//         );

//         if (dayCount && listing.price) {
//           // Rule 3: Add 10% premium for multi-day bookings
//           const premium = dayCount > 1 ? 1.1 : 1;
//           let calculatedPrice = Math.round(dayCount * listing.price * premium);
          
//           // Add late checkout fee if applicable
//           if (hasLateCheckout) {
//             calculatedPrice += lateCheckoutFee;
//           }
          
//           setTotalPrice(calculatedPrice);
//         } else {
//           // Single day booking
//           let basePrice = listing.price;
          
//           // Add late checkout fee if applicable
//           if (hasLateCheckout) {
//             basePrice += lateCheckoutFee;
//           }
          
//           setTotalPrice(basePrice);
//         }
//       }
//     } else {
//       // Hourly booking price calculation
//       if (timeRange.startTime && timeRange.endTime) {
//         const startHour = parseInt(timeRange.startTime.split(':')[0]);
//         const endHour = parseInt(timeRange.endTime.split(':')[0]);
//         const hourCount = endHour - startHour;
        
//         // Rule 3: If booking exceeds 8 hours, use daily rate
//         if (hourCount > 8) {
//           setTotalPrice(listing.price);
//         } else if (hourCount && hourlyPrice) {
//           // Regular hourly rate
//           setTotalPrice(hourCount * hourlyPrice);
//         } else {
//           setTotalPrice(0);
//         }
        
//         // Rule 4: If booking extends past 10 PM, use full day rate
//         if (endHour > lateCutoffHour) {
//           setTotalPrice(listing.price);
//         }
//       } else {
//         setTotalPrice(0);
//       }
//     }
//   }, [dateRange, listing.price, bookingType, timeRange, hourlyPrice, lateCutoffHour, hasLateCheckout, lateCheckoutFee]);

//   // Get category
//   const category = useMemo(() => {
//     return categories.find((item) => item.label === listing.category);
//   }, [listing.category]);

//   return (
//     <div className="max-w-screen-lg mx-auto">
//       <div className="flex flex-col gap-6">
//         <ListingHead
//           title={listing.title}
//           imageSrc={listing.imageSrc}
//           locationValue={listing.locationValue}
//           id={listing.id}
//           currentUser={currentUser}
//         />
//         <div className="grid grid-col-1 md:grid-cols-7 md:gap-10 mt-6">
//           <ListingInfo
//             user={listing.user}
//             category={category}
//             description={listing.description}
//             roomCount={listing.roomCount}
//             guestCount={listing.guestCount}
//             bathroomCount={listing.bathroomCount}
//             locationValue={listing.locationValue}
//           />
//           <div className="order-first mb-10 md:order-last md:col-span-3">
//             <ListingReservation
//               price={listing.price}
//               totalPrice={totalPrice}
//               onChangeDate={(value) => setDateRange(value)}
//               dateRange={dateRange}
//               onSubmit={onCreateReservation}
//               disabled={isLoading || !!bookingError}
//               disabledDates={disabledDates}
//               // Hourly booking props
//               bookingType={bookingType}
//               onChangeBookingType={handleBookingTypeChange}
//               hourlyPrice={hourlyPrice}
//               timeRange={timeRange}
//               onChangeTimeRange={setTimeRange}
//               disabledTimeSlots={disabledTimeSlots}
//               bookingError={bookingError}
//               minBookingHours={minBookingHours}
//               maxHourlyBookingHours={8}
//               lateCutoffHour={lateCutoffHour}
//               dateAvailability={dateAvailability}
//               // Late checkout props
//               hasLateCheckout={hasLateCheckout}
//               onChangeLateCheckout={handleLateCheckoutChange}
//               lateCheckoutFee={lateCheckoutFee}
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ListingClient;