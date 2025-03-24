'use client';

import React, { useState, useEffect } from 'react';

interface TimeRangePickerProps {
  value: { startTime: string; endTime: string };
  onChange: (value: { startTime: string; endTime: string }) => void;
  disabledTimeSlots: { startTime: string; endTime: string }[];
  minDuration?: number;
  maxDuration?: number;
  businessHourStart?: string;
  businessHourEnd?: string;
}

const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  value,
  onChange,
  disabledTimeSlots = [],
  minDuration = 3,
  maxDuration = 8,
  businessHourStart = '09:00',
  businessHourEnd = '22:00'
}) => {
  const [availableStartTimes, setAvailableStartTimes] = useState<string[]>([]);
  const [availableEndTimes, setAvailableEndTimes] = useState<string[]>([]);
  const [timeSlotStatus, setTimeSlotStatus] = useState<{ time: string; available: boolean; withinBusinessHours: boolean }[]>([]);

  // Generate time slots for business hours only (hourly)
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = parseInt(businessHourStart.split(':')[0]);
    const endHour = parseInt(businessHourEnd.split(':')[0]);
    
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      slots.push(`${hour}:00`);
    }
    
    return slots;
  };

  // Generate only business hour slots
  const generateBusinessHourSlots = () => {
    const slots = [];
    const startHour = parseInt(businessHourStart.split(':')[0]);
    const endHour = parseInt(businessHourEnd.split(':')[0]);
    
    for (let i = startHour; i <= endHour; i++) {
      const hour = i.toString().padStart(2, '0');
      slots.push(`${hour}:00`);
    }
    
    return slots;
  };

  // Check if a time slot is disabled or outside business hours
  const isTimeSlotDisabled = (time: string) => {
    const timeHour = parseInt(time.split(':')[0]);
    const startHour = parseInt(businessHourStart.split(':')[0]);
    const endHour = parseInt(businessHourEnd.split(':')[0]);
    
    // Time is outside business hours
    if (timeHour < startHour || timeHour > endHour) return true;
    
    // Check if time falls within any disabled slot
    return disabledTimeSlots.some(slot => {
      const slotStartHour = parseInt(slot.startTime.split(':')[0]);
      const slotEndHour = parseInt(slot.endTime.split(':')[0]);
      const currentHour = parseInt(time.split(':')[0]);
      
      return currentHour >= slotStartHour && currentHour < slotEndHour;
    });
  };

  // Check if time is within business hours
  const isWithinBusinessHours = (time: string) => {
    const timeHour = parseInt(time.split(':')[0]);
    const startHour = parseInt(businessHourStart.split(':')[0]);
    const endHour = parseInt(businessHourEnd.split(':')[0]);
    
    return timeHour >= startHour && timeHour <= endHour;
  };

  // Get available start times (not disabled, within business hours)
  useEffect(() => {
    const allTimeSlots = generateTimeSlots();
    const businessHourSlots = generateBusinessHourSlots();
    
    const availableSlots = businessHourSlots.filter(time => {
      // Don't allow booking starts too late in the day
      const hour = parseInt(time.split(':')[0]);
      const maxBookingStartHour = parseInt(businessHourEnd.split(':')[0]) - minDuration;
      
      if (hour > maxBookingStartHour) return false;
      
      return !isTimeSlotDisabled(time);
    });
    
    setAvailableStartTimes(availableSlots);
    
    // Generate time slot status for the availability display
    const statusArray = allTimeSlots.map(time => {
      const withinHours = isWithinBusinessHours(time);
      return {
        time,
        available: !isTimeSlotDisabled(time) && withinHours,
        withinBusinessHours: withinHours
      };
    });
    
    setTimeSlotStatus(statusArray);
  }, [disabledTimeSlots, businessHourStart, businessHourEnd, minDuration]);

  // Generate available end times based on selected start time
  useEffect(() => {
    if (!value.startTime) {
      setAvailableEndTimes([]);
      return;
    }
    
    const startHour = parseInt(value.startTime.split(':')[0]);
    const allTimeSlots = generateTimeSlots();
    const endHour = parseInt(businessHourEnd.split(':')[0]);
    
    // Filter for valid end times:
    // 1. After start time + min duration
    // 2. Not after start time + max duration
    // 3. Within business hours
    // 4. Not disabled
    const validEndTimes = allTimeSlots.filter(time => {
      const hour = parseInt(time.split(':')[0]);
      
      // Must be at least minDuration hours after start
      if (hour < startHour + minDuration) return false;
      
      // Must not exceed maxDuration hours after start
      if (hour > startHour + maxDuration) return false;
      
      // Cannot be after business hours end
      if (hour > endHour) return false;
      
      // Check if any time slot between start and end is disabled
      for (let i = startHour + 1; i < hour; i++) {
        const intermediateTime = `${i.toString().padStart(2, '0')}:00`;
        if (isTimeSlotDisabled(intermediateTime)) return false;
      }
      
      return true;
    });
    
    setAvailableEndTimes(validEndTimes);
    
    // If current end time is invalid, reset it
    if (value.endTime) {
      const endHour = parseInt(value.endTime.split(':')[0]);
      if (!validEndTimes.includes(value.endTime) || endHour <= startHour) {
        onChange({ ...value, endTime: '' });
      }
    }
  }, [value.startTime, disabledTimeSlots, businessHourEnd, minDuration, maxDuration, value, onChange]);

  // Handle start time change
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStartTime = e.target.value;
    onChange({ startTime: newStartTime, endTime: '' });
  };

  // Handle end time change
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEndTime = e.target.value;
    onChange({ ...value, endTime: newEndTime });
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Time slots availability visualization */}
      <div className="mb-4">
        <h3 className="text-neutral-700 font-medium mb-2">Availability</h3>
        <div className="flex flex-wrap gap-1 mb-2">
          {timeSlotStatus
            .filter(slot => slot.withinBusinessHours)
            .map((slot) => (
              <div 
                key={slot.time} 
                className={`text-xs px-2 py-1 rounded ${
                  slot.available 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}
                title={`${slot.time} - ${slot.available ? 'Available' : 'Booked'}`}
              >
                {slot.time}
              </div>
            ))}
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded mr-1"></div>
            <span>Free</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-100 border border-red-200 rounded mr-1"></div>
            <span>Booked</span>
          </div>
        </div>
      </div>

      {/* Booking constraints info */}
      <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm">
        <h4 className="font-medium text-yellow-800 mb-1">Booking Constraints</h4>
        <ul className="list-disc pl-5 text-yellow-700">
          <li>Business hours: {businessHourStart} - {businessHourEnd}</li>
          <li>Minimum booking duration: {minDuration} hours</li>
          <li>Maximum booking duration: {maxDuration} hours</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-neutral-600 font-medium">Start Time</label>
        <select
          value={value.startTime}
          onChange={handleStartTimeChange}
          className="border border-neutral-300 rounded-md p-2"
        >
          <option value="">Select start time</option>
          {availableStartTimes.map((time) => (
            <option key={`start-${time}`} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex flex-col gap-2">
        <label className="text-neutral-600 font-medium">End Time</label>
        <select
          value={value.endTime}
          onChange={handleEndTimeChange}
          className="border border-neutral-300 rounded-md p-2"
          disabled={!value.startTime}
        >
          <option value="">Select end time</option>
          {availableEndTimes.map((time) => (
            <option key={`end-${time}`} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>
      
      {value.startTime && value.endTime && (
        <div className="mt-2 text-sm text-neutral-600">
          Duration: {parseInt(value.endTime) - parseInt(value.startTime)} hours
        </div>
      )}

      {/* Selected time range visualization */}
      {value.startTime && value.endTime && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-blue-800 font-medium mb-1">Your Selected Time Slot</h4>
          <div className="flex items-center gap-2">
            <span className="font-medium">{value.startTime}</span>
            <span>to</span>
            <span className="font-medium">{value.endTime}</span>
            <span className="text-sm text-blue-600 ml-2">
              ({parseInt(value.endTime) - parseInt(value.startTime)} hours)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeRangePicker;