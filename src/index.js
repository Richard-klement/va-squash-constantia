// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import BookingCalendar from './BookingCalendar';
import './index.css';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('booking-calendar-root');
    if (container) {
        const root = createRoot(container);
        root.render(<BookingCalendar />);
    }
});

// Modified BookingCalendar component to work with WordPress
const BookingCalendar = () => {
    // ... Previous BookingCalendar code ...

    // Modify handleBooking to work with WordPress REST API
    const handleBooking = async () => {
        if (selectedDate && selectedTimeSlots.length > 0) {
            try {
                const response = await fetch('/wp-json/booking-calendar/v1/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': bookingCalendarData.nonce
                    },
                    body: JSON.stringify({
                        date: selectedDate.toISOString().split('T')[0],
                        startTime: selectedTimeSlots[0],
                        endTime: selectedTimeSlots[selectedTimeSlots.length - 1]
                    })
                });

                if (!response.ok) {
                    throw new Error('Booking failed');
                }

                setShowBookingConfirmation(true);
            } catch (error) {
                console.error('Booking error:', error);
                // Handle error (show error message to user)
            }
        }
    };

    // ... Rest of BookingCalendar code ...
};