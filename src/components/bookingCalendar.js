import React, { useState, useEffect } from 'react';

const BookingCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);

    // Debug log current state
    useEffect(() => {
        console.log('Current bookings:', bookings);
    }, [bookings]);

    const courts = [
        { id: 1, name: 'Court 1' },
        { id: 2, name: 'Court 2' },
        { id: 3, name: 'Court 3' },
        { id: 4, name: 'Court 4' },
    ];

    const timeSlots = Array.from({ length: 13 }, (_, index) => {
        const hour = index + 9;
        return `${hour.toString().padStart(2, '0')}:00`;
    });

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
    };

    const formatDateForAPI = (date) => {
        return date.toISOString().split('T')[0];
    };

    const previousMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
        setSelectedDate(null);
    };

    const nextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
        setSelectedDate(null);
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        
        const days = [];
        
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }
        
        return days;
    };

    const handleDayClick = (date) => {
        if (!date) return;
        setSelectedDate(date);
        fetchBookings(date);
    };

    const fetchBookings = async (date) => {
        setLoading(true);
        try {
            console.log('Fetching bookings for date:', formatDateForAPI(date));
            const response = await fetch(`/wp-json/booking-calendar/v1/bookings?date=${formatDateForAPI(date)}`, {
                headers: {
                    'X-WP-Nonce': bookingCalendarData.nonce
                }
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log('Fetched bookings data:', data);
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            alert('Failed to load bookings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleTimeSlotClick = async (courtId, timeSlot) => {
        if (!selectedDate) return;
        setLoading(true);

        const bookingData = {
            date: formatDateForAPI(selectedDate),
            startTime: timeSlot,
            endTime: `${(parseInt(timeSlot) + 1).toString().padStart(2, '0')}:00`,
            courtId: courtId
        };

        console.log('Attempting to book:', bookingData);

        try {
            const response = await fetch('/wp-json/booking-calendar/v1/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': bookingCalendarData.nonce
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();
            console.log('Booking response:', result);

            if (response.ok) {
                setBookings(prevBookings => {
                    // Ensure we have the user_name from the response
                    const newBooking = {
                        ...result,
                        court_id: parseInt(courtId),
                        start_time: timeSlot,
                        booking_date: formatDateForAPI(selectedDate),
                        user_name: result.user_name // Make sure this is included
                    };
                    console.log('Adding new booking with user:', newBooking);
                    return [...prevBookings, newBooking];
                });
            } else {
                throw new Error(result.message || 'Booking failed');
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert('Failed to create booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getBookingForSlot = (courtId, timeSlot) => {
        const booking = bookings.find(b => 
            parseInt(b.court_id) === parseInt(courtId) &&
            b.start_time === timeSlot &&
            b.booking_date === formatDateForAPI(selectedDate)
        );
        console.log(`Checking booking for court ${courtId}, time ${timeSlot}:`, booking);
        return booking;
    };

    const formatDayDate = (date) => {
        if (!date) return '';
        return date.getDate();
    };

    const isToday = (date) => {
        if (!date) return false;
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const renderTimeSlot = (courtId, timeSlot) => {
        const booking = getBookingForSlot(courtId, timeSlot);
        console.log(`Rendering slot for court ${courtId}, time ${timeSlot}:`, booking);

        if (booking) {
            return (
                <div className="booked-slot">
                    {booking.user_name || 'Booked'}
                </div>
            );
        }

        return (
            <button
                className="booking-slot available"
                onClick={() => handleTimeSlotClick(courtId, timeSlot)}
                disabled={loading}
            >
                Book
            </button>
        );
    };

    // In the JSX where we render the time slots:
    {timeSlots.map(timeSlot => (
        <div key={timeSlot} className="time-row">
            <div className="time-cell">{timeSlot}</div>
            {courts.map(court => {
                const booking = getBookingForSlot(court.id, timeSlot);
                return (
                    <div key={`${court.id}-${timeSlot}`} className="booking-cell">
                        {booking ? (
                            <div className="booked-slot">
                                {booking.user_name || 'Booked'}
                            </div>
                        ) : (
                            <button
                                className="booking-slot available"
                                onClick={() => handleTimeSlotClick(court.id, timeSlot)}
                                disabled={loading}
                            >
                                Book
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    ))}

    // Refresh bookings when date is selected
    useEffect(() => {
        if (selectedDate) {
            fetchBookings(selectedDate);
        }
    }, [selectedDate]);

    const days = getDaysInMonth(currentDate);

    return (
        <div className="booking-calendar">
            <div className="calendar-header">
                <button onClick={previousMonth}>&lt; Previous</button>
                <h2>{formatDate(currentDate)}</h2>
                <button onClick={nextMonth}>Next &gt;</button>
            </div>

            <div className="calendar-grid">
                <div className="weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="weekday">{day}</div>
                    ))}
                </div>
                <div className="days">
                    {days.map((date, index) => (
                        <div 
                            key={date ? date.toISOString() : `empty-${index}`}
                            className={`day ${!date ? 'empty' : ''} 
                                      ${isToday(date) ? 'today' : ''} 
                                      ${selectedDate && date && selectedDate.toDateString() === date.toDateString() ? 'selected' : ''}`}
                            onClick={() => date && handleDayClick(date)}
                        >
                            {formatDayDate(date)}
                        </div>
                    ))}
                </div>
            </div>

            {selectedDate && (
                <div className="courts-container">
                    <h3>Bookings for {selectedDate.toLocaleDateString()}</h3>
                    <div className="courts-grid">
                        <div className="time-header">
                            <div className="corner-cell">Time</div>
                            {courts.map(court => (
                                <div key={court.id} className="court-header">{court.name}</div>
                            ))}
                        </div>
                        {timeSlots.map(timeSlot => (
                            <div key={timeSlot} className="time-row">
                                <div className="time-cell">{timeSlot}</div>
                                {courts.map(court => {
                                    const booking = getBookingForSlot(court.id, timeSlot);
                                    return (
                                        <div key={`${court.id}-${timeSlot}`} className="booking-cell">
                                            {booking ? (
                                                <div className="booked-slot">
                                                    {booking.user_name}
                                                </div>
                                            ) : (
                                                <button
                                                    className="booking-slot available"
                                                    onClick={() => handleTimeSlotClick(court.id, timeSlot)}
                                                    disabled={loading}
                                                >
                                                    Book
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading && (
                <div className="loading-overlay">
                    Loading...
                </div>
            )}
        </div>
    );
};

export default BookingCalendar;