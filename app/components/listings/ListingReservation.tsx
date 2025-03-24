'use client';

import React, { useMemo } from 'react';
import { Range } from 'react-date-range';
import Button from '../Button';
import Calendar from '../inputs/Calendar';
import TimeRangePicker from '../inputs/TimeRangePicker';

interface ListingReservationProps {
  price: number;
  dateRange: Range;
  totalPrice: number;
  onChangeDate: (value: Range) => void;
  onSubmit: () => void;
  disabled?: boolean;
  disabledDates: Date[];
  // Booking type props
  bookingType: string;
  onChangeBookingType: (value: string) => void;
  hourlyPrice?: number;
  timeRange: { startTime: string; endTime: string };
  onChangeTimeRange: (value: { startTime: string; endTime: string }) => void;
  disabledTimeSlots: { startTime: string; endTime: string }[];
  // Pricing rules props
  bookingError?: string | null;
  minBookingHours?: number;
  maxHourlyBookingHours?: number;
  lateCutoffHour?: number;
  // Date availability status
  dateAvailability?: {
    hasFullDayBooking: boolean;
    hasHourlyBookings: boolean;
  };
  // Late checkout props
  hasLateCheckout?: boolean;
  onChangeLateCheckout?: (value: boolean) => void;
  lateCheckoutFee?: number;
}

const ListingReservation: React.FC<ListingReservationProps> = ({
  price,
  dateRange,
  totalPrice,
  onChangeDate,
  onSubmit,
  disabled,
  disabledDates,
  // Hourly booking props
  bookingType = 'daily',
  onChangeBookingType,
  hourlyPrice,
  timeRange,
  onChangeTimeRange,
  disabledTimeSlots = [],
  // Pricing rule props
  bookingError,
  minBookingHours = 3,
  maxHourlyBookingHours = 8,
  lateCutoffHour = 22,
  // Date availability status
  dateAvailability = { hasFullDayBooking: false, hasHourlyBookings: false },
  // Late checkout props
  hasLateCheckout = false,
  onChangeLateCheckout = () => {},
  lateCheckoutFee = 0
}) => {
  // Calculate price display for headline
  const displayPrice = bookingType === 'hourly' ? hourlyPrice : price;
  const displayUnit = bookingType === 'hourly' ? 'hour' : 'night';
  
  // Prepare pricing rules info for display
  const pricingRules = useMemo(() => {
    if (bookingType === 'hourly') {
      return [
        `Minimum booking: ${minBookingHours} hours`,
        `For Bookings over ${maxHourlyBookingHours} hours you have to convert it into daily rate`,
        `No bookings available past ${lateCutoffHour}:00`,
        
      ];
    }
    return [
      `Standard checkout time is 8:00 AM`,
      `Late checkout available until 8:30 AM . After that (20% premium) will charge`,
    ];
  }, [bookingType, minBookingHours, maxHourlyBookingHours, lateCutoffHour]);

  // Determine if booking type should be disabled based on date availability
  const isHourlyDisabled = dateAvailability.hasFullDayBooking;
  const isDailyDisabled = dateAvailability.hasHourlyBookings;

  // Handle late checkout toggle
  const handleLateCheckoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeLateCheckout(e.target.checked);
  };

  return (
    <div className="bg-white rounded-xl border-[1px] border-neutral-200 overflow-hidden">
      <div className='flex flex-row items-center gap-1 p-4'>
        <div className='text-2xl font-semibold'>
          ${displayPrice}
        </div>
        <div className="font-light text-neutral-600">
          /{displayUnit}
        </div>
      </div>
      <hr />
      
      {/* Booking Type Selector */}
      <div className="p-4">
        <div className="flex rounded-md overflow-hidden mb-4">
          <button
            onClick={() => onChangeBookingType('daily')}
            disabled={isDailyDisabled}
            className={`
              flex-1 py-2 text-center 
              ${bookingType === 'daily' ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-700'}
              ${isDailyDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            Daily Booking
          </button>
          <button
            onClick={() => onChangeBookingType('hourly')}
            disabled={isHourlyDisabled}
            className={`
              flex-1 py-2 text-center 
              ${bookingType === 'hourly' ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-700'}
              ${isHourlyDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            Hourly Booking
          </button>
        </div>
        
        {/* Date Availability Status */}
        {dateRange.startDate && (
          <div className="mb-3">
            {dateAvailability.hasFullDayBooking && (
              <p className="text-sm text-rose-500 bg-rose-50 p-2 rounded">
                This date is fully booked for the entire day
              </p>
            )}
            {dateAvailability.hasHourlyBookings && (
              <p className="text-sm text-amber-500 bg-amber-50 p-2 rounded">
                This date has existing hourly bookings
              </p>
            )}
          </div>
        )}
        
        {/* Pricing Rules Info */}
        <div className="text-sm text-neutral-600 mb-3 bg-gray-50 p-3 rounded-md">
          <p className="font-medium mb-1">Booking Rules:</p>
          <ul className="list-disc pl-5 space-y-1">
            {pricingRules.map((rule, index) => (
              <li key={index}>{rule}</li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Date Selection (for both daily and hourly) */}
      <div className="p-4">
        <Calendar
          value={dateRange}
          disabledDates={disabledDates}
          onChange={(value) => onChangeDate(value.selection)}
        />
      </div>
      
      {/* Time Selection (only for hourly bookings) */}
      {bookingType === 'hourly' && !dateAvailability.hasFullDayBooking && (
        <div className="p-4">
          <TimeRangePicker
            value={timeRange}
            onChange={onChangeTimeRange}
            disabledTimeSlots={disabledTimeSlots}
            minDuration={minBookingHours}
            maxTime={`${lateCutoffHour}:00`}
          />
          
          {/* Error Message */}
          {bookingError && (
            <div className="text-rose-500 text-sm mt-2 p-2 bg-rose-50 rounded">
              {bookingError}
            </div>
          )}
        </div>
      )}
      
      {/* Late Checkout Option (only for daily bookings) */}
      {bookingType === 'daily' && dateRange.startDate && (
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              {/* <div className="font-medium">Late Checkout</div>
              <div className="text-sm text-gray-500">Extend until 8:30 AM (20% premium)</div> */}
            </div>
            
          </div>
          
          {hasLateCheckout && lateCheckoutFee > 0 && (
            <div className="mt-2 text-sm bg-rose-50 text-rose-700 p-2 rounded flex justify-between">
              <span>Late checkout fee</span>
              <span>${lateCheckoutFee.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
      
      <hr />
      <div className='p-4'>
        <Button
          disabled={
            disabled || 
            (bookingType === 'hourly' && (!timeRange.startTime || !timeRange.endTime)) ||
            !!bookingError ||
            (bookingType === 'daily' && dateAvailability.hasHourlyBookings) ||
            (bookingType === 'hourly' && dateAvailability.hasFullDayBooking)
          }
          label="Reserve"
          onClick={onSubmit}
        />
      </div>
      
      <div className='p-4 flex flex-row items-center justify-between font-semibold text-lg'>
        <div>
          Total
        </div>
        <div>
          ${totalPrice}
        </div>
      </div>
    </div>
  );
};

export default ListingReservation;