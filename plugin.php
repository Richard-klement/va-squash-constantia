// plugin.php
<?php
/*
Plugin Name: Booking Calendar
Description: React-based booking calendar system
Version: 1.0
Author: Your Name
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Enqueue scripts and styles
function booking_calendar_enqueue_scripts() {
    // Enqueue React and ReactDOM from WordPress
    wp_enqueue_script('wp-element');
    
    // Enqueue our compiled app
    wp_enqueue_script(
        'booking-calendar-script',
        plugins_url('build/index.js', __FILE__),
        ['wp-element'],
        '1.0.0',
        true
    );
    
    // Enqueue styles
    wp_enqueue_style(
        'booking-calendar-style',
        plugins_url('build/index.css', __FILE__),
        [],
        '1.0.0'
    );

    // Pass WordPress data to React
    wp_localize_script(
        'booking-calendar-script',
        'bookingCalendarData',
        array(
            'nonce' => wp_create_nonce('wp_rest'),
            'user' => wp_get_current_user(),
            'ajaxurl' => admin_url('admin-ajax.php')
        )
    );
}
add_action('wp_enqueue_scripts', 'booking_calendar_enqueue_scripts');

// Register shortcode
function booking_calendar_shortcode() {
    return '<div id="booking-calendar-root"></div>';
}
add_shortcode('booking_calendar', 'booking_calendar_shortcode');

// Add REST API endpoint for bookings
function register_booking_routes() {
    register_rest_route('booking-calendar/v1', '/bookings', array(
        'methods' => 'POST',
        'callback' => 'handle_booking',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));
}
add_action('rest_api_init', 'register_booking_routes');

// Handle booking submissions
function handle_booking($request) {
    $params = $request->get_params();
    $user_id = get_current_user_id();
    
    // Save booking to WordPress database
    global $wpdb;
    $table_name = $wpdb->prefix . 'bookings';
    
    $result = $wpdb->insert(
        $table_name,
        array(
            'user_id' => $user_id,
            'booking_date' => $params['date'],
            'start_time' => $params['startTime'],
            'end_time' => $params['endTime'],
            'created_at' => current_time('mysql')
        ),
        array('%d', '%s', '%s', '%s', '%s')
    );
    
    if ($result === false) {
        return new WP_Error('booking_error', 'Failed to save booking', array('status' => 500));
    }
    
    return new WP_REST_Response(['message' => 'Booking successful'], 200);
}

// Create database table on plugin activation
function booking_calendar_activate() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'bookings';
    
    $charset_collate = $wpdb->get_charset_collate();
    
    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        booking_date date NOT NULL,
        start_time time NOT NULL,
        end_time time NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}
register_activation_hook(__FILE__, 'booking_calendar_activate');