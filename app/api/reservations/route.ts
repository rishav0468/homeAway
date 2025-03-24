import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const body = await request.json();
  const {
    listingId,
    startDate,
    endDate,
    totalPrice,
    bookingType = 'daily', // Default to daily if not specified
    startTime, // For hourly bookings
    endTime    // For hourly bookings
  } = body;

  if (!listingId || !startDate || !totalPrice) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // For hourly bookings, we need both startTime and endTime
  if (bookingType === 'hourly' && (!startTime || !endTime)) {
    return NextResponse.json(
      { error: "Start time and end time are required for hourly bookings" },
      { status: 400 }
    );
  }

  try {
    // ======================================
    // HOURLY BOOKING VALIDATION
    // ======================================
    if (bookingType === 'hourly') {
      console.log("Processing hourly booking");
      
      // Get the date part only for checking bookings on the same day
      const selectedDate = new Date(startDate);
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      
      // Check for overlapping hourly reservations ON THE SAME DAY
      const existingHourlyReservations = await prisma.reservation.findMany({
        where: {
          listingId,
          bookingType: 'hourly', // Only check against other hourly bookings
          startDate: {
            gte: new Date(`${selectedDateStr}T00:00:00.000Z`),
            lt: new Date(`${selectedDateStr}T23:59:59.999Z`)
          }
        }
      });
      
      console.log("Existing hourly reservations on this day:", existingHourlyReservations);
      
      // Parse hours for time slot checking
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      
      // Check if there's an overlap with existing hourly reservations
      const hasOverlap = existingHourlyReservations.some(reservation => {
        if (!reservation.startTime || !reservation.endTime) return false;
        
        const reservationStartHour = parseInt(reservation.startTime.split(':')[0]);
        const reservationEndHour = parseInt(reservation.endTime.split(':')[0]);
        
        // Check if the time ranges overlap
        // Also consider the 1-hour cleaning gap
        return (
          (startHour >= reservationStartHour && startHour < reservationEndHour + 1) || 
          (endHour > reservationStartHour - 1 && endHour <= reservationEndHour + 1) ||
          (startHour <= reservationStartHour - 1 && endHour >= reservationEndHour + 1)
        );
      });
      
      if (hasOverlap) {
        return NextResponse.json(
          { error: "Time slot not available or conflicts with cleaning time" },
          { status: 400 }
        );
      }
      
      // Check if booking duration is at least 3 hours
      if (endHour - startHour < 3) {
        return NextResponse.json(
          { error: "Minimum booking duration is 3 hours" },
          { status: 400 }
        );
      }
      
      // Check if booking end time is before 11 PM
      if (endHour > 23) {
        return NextResponse.json(
          { error: "Bookings must end by 11 PM" },
          { status: 400 }
        );
      }
    } 
    // ======================================
    // DAILY BOOKING VALIDATION
    // ======================================
   
      
    else {
      console.log("Processing daily booking");
      
      // Get exact dates for comparison (avoiding timezone issues)
      const getDateOnly = (dateString: string) => {
        const date = new Date(dateString);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      };
      
      // Start and end dates as Date objects
      const bookingStartDate = getDateOnly(startDate);
      const bookingEndDate = endDate ? getDateOnly(endDate) : bookingStartDate;
      
      console.log("Booking request:", {
        startDate: bookingStartDate.toISOString().split('T')[0],
        endDate: bookingEndDate.toISOString().split('T')[0]
      });
      
      // Get existing reservations
      const existingReservations = await prisma.reservation.findMany({
        where: { 
          listingId,
          bookingType: 'daily'
        }
      });
      
      // Check for booking conflicts - PER NIGHT LOGIC
      let hasConflict = false;
      
      // For per-night bookings:
      // - A person can check in on the same day another checks out
      // - We only need to check if any night overlaps with existing bookings
      
      for (const reservation of existingReservations) {
        const existingStartDate = getDateOnly(reservation.startDate.toISOString());
        const existingEndDate = getDateOnly(reservation.endDate.toISOString());
        
        console.log("Checking against reservation:", {
          id: reservation.id,
          startDate: existingStartDate.toISOString().split('T')[0],
          endDate: existingEndDate.toISOString().split('T')[0]
        });
        
        // For per-night bookings, we need to check if any night of the new booking
        // overlaps with any night of the existing booking.
        // The checkout date is NOT considered a booked night.
        
        // Calculate one day before end date (actual last night)
        const existingLastNight = new Date(existingEndDate);
        existingLastNight.setDate(existingLastNight.getDate() - 1);
        
        const bookingLastNight = new Date(bookingEndDate);
        bookingLastNight.setDate(bookingLastNight.getDate() - 1);
        
        console.log("Last nights:", {
          existingLastNight: existingLastNight.toISOString().split('T')[0],
          bookingLastNight: bookingLastNight.toISOString().split('T')[0]
        });
        
        // No conflict only if:
        // - The booking's last night is before the existing start date, OR
        // - The booking's start date is after the existing last night
        const noConflict = 
          bookingLastNight < existingStartDate || 
          bookingStartDate > existingLastNight;
        
        if (!noConflict) {
          console.log("CONFLICT DETECTED with reservation:", reservation.id);
          hasConflict = true;
          break;
        }
      }
      
      if (hasConflict) {
        return NextResponse.json(
          { error: "These dates are already booked" },
          { status: 400 }
        );
      }
    }
    // ======================================
    // CREATE RESERVATION
    // ======================================
    const listingAndReservation = await prisma.listing.update({
      where: {
        id: listingId
      },
      data: {
        reservations: {
          create: {
            userId: currentUser.id,
            startDate: new Date(startDate),
            endDate: new Date(endDate || startDate), // Use startDate if endDate not provided
            totalPrice,
            bookingType,
            startTime: bookingType === 'hourly' ? startTime : null,
            endTime: bookingType === 'hourly' ? endTime : null
          }
        }
      }
    });

    return NextResponse.json(listingAndReservation);
  } catch (error) {
    console.error("Reservation error:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}