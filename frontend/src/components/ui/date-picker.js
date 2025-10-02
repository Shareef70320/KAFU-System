import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

const DatePicker = ({ 
  value, 
  onChange, 
  placeholder = "Select date", 
  className = "",
  disabled = false,
  minDate = null,
  maxDate = null,
  initialMonth = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(initialMonth || new Date());
  const inputRef = useRef(null);
  const calendarRef = useRef(null);

  // Parse the current value
  const selectedDate = value ? new Date(value) : null;

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target) && 
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set current month to selected date when value changes, but only if calendar is closed
  useEffect(() => {
    if (selectedDate && !isOpen) {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth()));
    }
  }, [selectedDate, isOpen]);

  const formatDate = (date) => {
    if (!date) return '';
    // Use local timezone to avoid date shifting issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isDateDisabled = (date) => {
    if (!date) return false;
    
    // Normalize dates to midnight for proper comparison
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (minDate) {
      const normalizedMinDate = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      if (normalizedDate < normalizedMinDate) return true;
    }
    
    if (maxDate) {
      const normalizedMaxDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
      if (normalizedDate > normalizedMaxDate) return true;
    }
    
    return false;
  };

  const isDateSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDateSelect = (date) => {
    if (isDateDisabled(date)) return;
    
    onChange(formatDate(date));
    setIsOpen(false);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth()));
    if (!isDateDisabled(today)) {
      handleDateSelect(today);
    }
  };

  const clearDate = () => {
    onChange('');
    setIsOpen(false);
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="relative">
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={selectedDate ? formatDisplayDate(selectedDate) : ''}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'} ${className}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          readOnly
          disabled={disabled}
        />
        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div 
          ref={calendarRef}
          className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-[280px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth(-1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-sm font-medium text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth(1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-xs text-gray-500 text-center py-2 font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => (
              <button
                key={index}
                onClick={() => handleDateSelect(date)}
                disabled={!date || isDateDisabled(date)}
                className={`
                  h-8 w-8 text-xs rounded-md transition-colors
                  ${!date ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100'}
                  ${isDateSelected(date) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                  ${isToday(date) && !isDateSelected(date) ? 'bg-blue-50 text-blue-600 font-medium' : ''}
                  ${isDateDisabled(date) ? 'text-gray-300 cursor-not-allowed hover:bg-transparent' : 'text-gray-700'}
                  ${!isDateSelected(date) && !isToday(date) && !isDateDisabled(date) ? 'hover:bg-gray-100' : ''}
                `}
              >
                {date ? date.getDate() : ''}
              </button>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Today
            </Button>
            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDate}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
