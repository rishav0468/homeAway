'use client';
import { Range, DateRange, RangeKeyDict } from 'react-date-range';
import 'react-date-range/dist/styles.css';  // Correct path for styles.css
import 'react-date-range/dist/theme/default.css';  // Correct path for default theme

interface CalendarProps {
  value: Range;
  onChange: (value: RangeKeyDict) => void;
  disabledDates?: Date[];
}

const Calendar: React.FC<CalendarProps> = ({ value, onChange, disabledDates }) => {
  return (
    <DateRange
      rangeColors={['#262626']}  // Fixing color array format
      ranges={[value]}
      date={new Date()}
      onChange={onChange}
      direction="vertical"
      showDateDisplay={false}
      minDate={new Date()}
      disabledDates={disabledDates}
    />
  );
};

export default Calendar;
