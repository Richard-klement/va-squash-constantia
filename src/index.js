import React from 'react';
const { render } = wp.element;
import BookingCalendar from './components/bookingCalendar';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('booking-calendar-root');
    console.log('Booking Calendar: Container found:', !!container);
    
    if (container) {
        render(<BookingCalendar />, container);
        console.log('Booking Calendar: Rendered successfully');
    }
});

console.log('Booking Calendar: Script initializing');

// Check for WordPress environment
if (typeof wp === 'undefined' || typeof wp.element === 'undefined') {
    console.error('WordPress element not found. Waiting...');
    
    // Wait for WordPress to be ready
    const checkWordPress = setInterval(() => {
        if (typeof wp !== 'undefined' && typeof wp.element !== 'undefined') {
            clearInterval(checkWordPress);
            initializeCalendar();
        }
    }, 100);
} else {
    initializeCalendar();
}

function initializeCalendar() {
    const { render } = wp.element;
    
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('booking-calendar-root');
        console.log('test');
       
        if (container) {
            import('./components/bookingCalendar')
                .then(({ default: BookingCalendar }) => {
                    render(<BookingCalendar />, container);
                    console.log('Booking Calendar: Rendered successfully');
                })
                .catch(error => {
                    console.error('Failed to load BookingCalendar component:', error);
                });
        } else {
            console.error('Booking Calendar: Container not found');
        }
    });
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Booking Calendar Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});