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

    useEffect(() => {
        console.log('Selected date changed:', selectedDate);
    }, [selectedDate]);
    
    useEffect(() => {
        console.log('Bookings updated:', bookings);
    }, [bookings]);

    useEffect(() => {
        if (selectedDate) {
            fetchBookings(selectedDate);
        }
    }, [selectedDate]);

    const courts = [
        { id: 1, name: 'Court 1' },
        { id: 2, name: 'Court 2' },
        { id: 3, name: 'Court 3' },
        { id: 4, name: 'Court 4' },
    ];

     // Add event listener on component mount
     useEffect(() => {
        const handleCalendarClick = (e) => {
            // Check if clicked element is a day cell
            if (e.target.classList.contains('day')) {
                const dateAttr = e.target.getAttribute('data-date');
                if (dateAttr) {
                    const clickedDate = new Date(dateAttr);
                    handleDayClick(clickedDate);
                }
            }
        };

        document.addEventListener('click', handleCalendarClick);

        // Cleanup
        // return () => {
        //     document.removeEventListener('click', handleCalendarClick);
        // };
    }, []); // Empty dependency array since we want this to run once on mount

    const timeSlots = [];
let hour = 5; // Start at 5am
let minutes = 0;

while (hour < 20 || (hour === 20 && minutes === 0)) { // Continue until we reach 20:00
    timeSlots.push(`${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    
    minutes += 45;
    if (minutes >= 60) {
        hour += 1;
        minutes -= 60;
    }
}
    
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
    };

    const formatDateForAPI = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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
        console.log('Day clicked:', date); // Debug log
        setSelectedDate(date);
        console.log( 'fetched bookings', fetchBookings(date) );
    };

    const fetchBookings = async (date) => {
        setLoading(true);
        try {
            const formattedDate = formatDateForAPI(date);
            console.log('Fetching bookings for date:', {
                originalDate: date,
                formattedDate: formattedDate,
                dateString: date.toISOString(),
                dateObject: {
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                    day: date.getDate()
                }
            });
    
            const response = await fetch(`/wp-json/booking-calendar/v1/bookings?date=${formattedDate}`, {
                headers: {
                    'X-WP-Nonce': bookingCalendarData.nonce
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const text = await response.text();
           
    
            const data = JSON.parse(text);
           
            
            setBookings(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };
    
    // Add this effect to monitor the bookings state
    useEffect(() => {
        
    }, [bookings]);

    const handleTimeSlotClick = async (courtId, timeSlot) => {
        if (!selectedDate) return;
        setLoading(true);

         // Parse the time slot
    const [hours, minutes] = timeSlot.split(':').map(num => parseInt(num));
    
    // Calculate end time (45 minutes later)
    let endHours = hours;
    let endMinutes = minutes + 45;
    
    if (endMinutes >= 60) {
        endHours += 1;
        endMinutes -= 60;
    }

    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;


        const bookingData = {
            date: formatDateForAPI(selectedDate),
            startTime: timeSlot,
            endTime: `${(parseInt(timeSlot) + 1).toString().padStart(2, '0')}:00`,
            courtId: courtId
        };



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

            if (response.ok) {
                setBookings(prevBookings => {
                    // Ensure we have the user_name from the response
                    const newBooking = {
                        ...result,
                        court_id: parseInt(courtId),
                        start_time: timeSlot,
                        booking_date: formatDateForAPI(selectedDate),
                        user_name: result.user_name, // Make sure this is included
                        current_user_id: result.user_id
                    };
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

    const handleDeleteBooking = async (bookingId) => {
        if (!window.confirm('Are you sure you want to delete this booking?')) {
            return;
        }
    
        setLoading(true);
        try {
            const response = await fetch(`/wp-json/booking-calendar/v1/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': bookingCalendarData.nonce
                }
            });
    
            if (response.ok) {
                // Remove the deleted booking from state
                setBookings(prevBookings => prevBookings.filter(b => b.id !== bookingId));
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete booking');
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
            alert(error.message || 'Failed to delete booking');
        } finally {
            setLoading(false);
        }
    };

    const getBookingForSlot = (courtId, timeSlot) => {
        console.log(bookings);
        const booking = bookings.find(b => {
            const matchCourt = parseInt(b.court_id) === parseInt(courtId);
            const matchTime = b.start_time === timeSlot;
            const matchDate = b.booking_date === formatDateForAPI(selectedDate);
            console.log('comparing time: ', 'database time', b.start_time, 'app time:', timeSlot);
            console.log('Comparing booking:', {
                booking: b,
                courtMatch: matchCourt,
                timeMatch: matchTime,
                dateMatch: matchDate
            });
            
            return matchCourt && matchTime && matchDate;
        });
        
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

        if (booking) {
            const isUsersBooking = parseInt(booking.user_id) === parseInt(bookingCalendarData.user.id);
            return (
                <div className="booked-slot" title={`Booked by ${booking.user_name}`}>
                    <span>{booking.user_name}</span>
                    {isUsersBooking && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBooking(booking.id);
                            }}
                            className="delete-booking"
                            title="Delete booking"
                        >
                            ×
                        </button>
                    )}
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
                <button onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}>
                    &lt; Previous
                </button>
                <h2>{currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</h2>
                <button onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}>
                    Next &gt;
                </button>
            </div>

            <div className="calendar-grid">
                <div className="weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="weekday">{day}</div>
                    ))}
                </div>
                <div className="days">
                    {days.map((date, index) => {
                        const dayClasses = ['day'];
                        if (!date) dayClasses.push('empty');
                        if (isToday(date)) dayClasses.push('today');
                        if (selectedDate && date && selectedDate.toDateString() === date.toDateString()) {
                            dayClasses.push('selected');
                        }

                        return (
                            <div 
                                key={date ? date.toISOString() : `empty-${index}`}
                                className={dayClasses.join(' ')}
                                data-date={date ? date.toISOString() : ''}
                            >
                                {formatDayDate(date)}
                            </div>
                        );
                    })}
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
                                    const isUsersBooking = booking ? booking.user_id === booking.current_user_id : false;
                                    return (
                                        <div key={`${court.id}-${timeSlot}`} className="booking-cell" >
                                            {booking ? (
                                                <div className="booked-slot" title={`Booked by ${booking.user_name}`} >
                                                    {booking.user_name || 'Booked'}
                                                    {isUsersBooking && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBooking(booking.id);
                        }}
                        className="delete-booking"
                        title="Delete booking"
                    >
                        ×
                    </button>
                )}
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
