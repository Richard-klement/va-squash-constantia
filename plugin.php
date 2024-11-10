<?php
/*
Plugin Name: Squashpress
Description: React-based booking calendar system
Version: 1.0
Author: Richard Klement
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Create database table on plugin activation
function booking_calendar_activate() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'bookings';
    
    $charset_collate = $wpdb->get_charset_collate();
    
    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        court_id int(11) NOT NULL,
        booking_date date NOT NULL,
        start_time time NOT NULL,
        end_time time NOT NULL,
        created_at datetime NOT NULL,
        status varchar(20) DEFAULT 'confirmed',
        notes text,
        PRIMARY KEY  (id),
        KEY booking_date (booking_date),
        KEY user_id (user_id),
        KEY court_id (court_id),
        KEY start_time (start_time),
        CONSTRAINT unique_court_booking UNIQUE (court_id, booking_date, start_time)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    
    // Suppress errors during activation
    $suppress = $wpdb->suppress_errors();
    
    // Run the query
    $result = dbDelta($sql);
    
    // Restore error suppression setting
    $wpdb->suppress_errors($suppress);
    
    // Check for errors
    if (!empty($wpdb->last_error)) {
        error_log('Booking Calendar Plugin Activation Error: ' . $wpdb->last_error);
        update_option('booking_calendar_activation_error', $wpdb->last_error);
    }

    // Set default options
    $default_options = array(
        'courts' => array(
            array('id' => 1, 'name' => 'Court 1'),
            array('id' => 2, 'name' => 'Court 2'),
            array('id' => 3, 'name' => 'Court 3'),
            array('id' => 4, 'name' => 'Court 4')
        ),
        'operating_hours' => array(
            'start' => '09:00',
            'end' => '21:00'
        ),
        'booking_duration' => 60, // minutes
        'max_advance_booking' => 14 // days
    );

    // Only set options if they don't already exist
    if (!get_option('booking_calendar_settings')) {
        add_option('booking_calendar_settings', $default_options);
    }

    // Version tracking for future updates
    add_option('booking_calendar_db_version', '1.0');
}
register_activation_hook(__FILE__, 'booking_calendar_activate');

// Add upgrade function for existing installations
function booking_calendar_upgrade_check() {
    $current_version = get_option('booking_calendar_db_version', '0');
    
    if (version_compare($current_version, '1.0', '<')) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'bookings';
        
        // Check if court_id column exists
        $column_exists = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = %s 
            AND COLUMN_NAME = 'court_id'",
            DB_NAME,
            $table_name
        ));

        if (empty($column_exists)) {
            // Add court_id column if it doesn't exist
            $wpdb->query("ALTER TABLE $table_name 
                         ADD COLUMN court_id int(11) NOT NULL AFTER user_id,
                         ADD KEY court_id (court_id)");
        }

        // Check if status column exists
        $status_exists = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = %s 
            AND COLUMN_NAME = 'status'",
            DB_NAME,
            $table_name
        ));

        if (empty($status_exists)) {
            // Add status column if it doesn't exist
            $wpdb->query("ALTER TABLE $table_name 
                         ADD COLUMN status varchar(20) DEFAULT 'confirmed',
                         ADD COLUMN notes text");
        }

        // Add unique constraint if it doesn't exist
        $wpdb->query("ALTER TABLE $table_name 
                     ADD CONSTRAINT unique_court_booking 
                     UNIQUE (court_id, booking_date, start_time)");

        update_option('booking_calendar_db_version', '1.0');
    }
}
add_action('plugins_loaded', 'booking_calendar_upgrade_check');

// Optional: Add admin notice for activation errors
function booking_calendar_admin_notices() {
    $error = get_option('booking_calendar_activation_error');
    if ($error) {
        echo '<div class="error"><p>Booking Calendar Plugin Error: ' . esc_html($error) . '</p></div>';
        delete_option('booking_calendar_activation_error');
    }
}
add_action('admin_notices', 'booking_calendar_admin_notices');
register_activation_hook(__FILE__, 'booking_calendar_activate');

// Enqueue scripts and styles
function booking_calendar_enqueue_scripts() {


    global $wp_scripts;

    // Register core WordPress dependencies
    if (!wp_script_is('react', 'registered')) {
        wp_register_script('react', includes_url('js/dist/vendor/react.min.js'), array(), '17.0.1', true);
    }
    
    if (!wp_script_is('react-dom', 'registered')) {
        wp_register_script('react-dom', includes_url('js/dist/vendor/react-dom.min.js'), array('react'), '17.0.1', true);
    }

    if (!wp_script_is('wp-polyfill', 'registered')) {
        wp_register_script('wp-polyfill', includes_url('js/dist/wp-polyfill.min.js'), array(), null, true);
    }

    if (!wp_script_is('wp-element', 'registered')) {
        wp_register_script(
            'wp-element',
            includes_url('js/dist/element.min.js'),
            array('react', 'react-dom', 'wp-polyfill'),
            null,
            true
        );
    }

    // Enqueue dependencies
    wp_enqueue_script('react');
    wp_enqueue_script('react-dom');
    wp_enqueue_script('wp-polyfill');
    wp_enqueue_script('wp-element');

    // Get build file paths with new directory structure
    $js_path = plugin_dir_path(__FILE__) . 'build/js/index.js';
    $css_path = plugin_dir_path(__FILE__) . 'build/styles/index.css';

    // Enqueue our calendar script
    wp_enqueue_script(
        'booking-calendar-script',
        plugins_url('build/js/index.js', __FILE__),
        array('wp-element', 'react', 'react-dom'),
        filemtime($js_path),
        true
    );

    // Enqueue calendar styles
    if (file_exists($css_path)) {
        wp_enqueue_style(
            'booking-calendar-style',
            plugins_url('build/styles/index.css', __FILE__),
            array(),
            filemtime($css_path)
        );
    }

    // Localize script
    wp_localize_script(
        'booking-calendar-script',
        'bookingCalendarData',
        array(
            'root' => esc_url_raw(rest_url()),
            'nonce' => wp_create_nonce('wp_rest'),
            'ajaxurl' => admin_url('admin-ajax.php'),
            'user' => array(
            'ID' => get_current_user_id(),
            'display_name' => wp_get_current_user()->display_name
        )
        )
    );
}

// Add to both admin and frontend
add_action('wp_enqueue_scripts', 'booking_calendar_enqueue_scripts');
add_action('admin_enqueue_scripts', 'booking_calendar_enqueue_scripts');

// Modified shortcode function
function booking_calendar_shortcode() {
    // Force enqueue scripts when shortcode is used
    wp_enqueue_script('react');
    wp_enqueue_script('react-dom');
    wp_enqueue_script('wp-element');
    wp_enqueue_script('booking-calendar-script');
    wp_enqueue_style('booking-calendar-style');

    return '<div class="booking-calendar-wrapper">
        <div id="booking-calendar-root"></div>
        <script>
            console.log("Shortcode rendered", {
                container: document.getElementById("booking-calendar-root"),
                react: typeof React,
                reactDOM: typeof ReactDOM,
                wpElement: typeof wp?.element
            });
        </script>
    </div>';
}
add_shortcode('booking_calendar', 'booking_calendar_shortcode');


// Add REST API endpoint for bookings
// Register REST API endpoints
function register_booking_routes() {
    // Route for getting bookings (GET)
    register_rest_route('booking-calendar/v1', '/bookings', array(
        array(
            'methods'  => 'GET',
            'callback' => 'get_bookings',
            'permission_callback' => '__return_true', // Allow public access for viewing
            'args' => array(
                'date' => array(
                    'required' => true,
                    'validate_callback' => function($param) {
                        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $param);
                    }
                )
            )
        ),
        // Route for creating bookings (POST)
        array(
            'methods'  => 'POST',
            'callback' => 'handle_booking',
            'permission_callback' => function() {
                return is_user_logged_in(); // Require login for booking
            }
        )
    ));

    // Add DELETE endpoint
    register_rest_route('booking-calendar/v1', '/bookings/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'delete_booking',
        'permission_callback' => function() {
            return is_user_logged_in();
        },
        'args' => array(
            'id' => array(
                'validate_callback' => function($param) {
                    return is_numeric($param);
                }
            )
        )
    ));
}
add_action('rest_api_init', 'register_booking_routes');

// Get bookings
function get_bookings($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'bookings';
    
    $date = $request->get_param('date');
    error_log('GET /bookings request received for date: ' . $date);

    $current_user_id = get_current_user_id();

    // Simple direct comparison since formats match
    $query = $wpdb->prepare("
        SELECT 
            b.id,
            b.user_id,
            b.court_id,
            b.booking_date,
            b.start_time,
            b.end_time,
            b.status,
            u.display_name as user_name
        FROM {$table_name} b
        LEFT JOIN {$wpdb->users} u ON b.user_id = u.ID
        WHERE b.booking_date = %s
        ORDER BY b.start_time, b.court_id
    ", $date);

    error_log('Executing query: ' . $query);
    
    // Get direct results
    $bookings = $wpdb->get_results($query);
    error_log('Found bookings: ' . print_r($bookings, true));
    
    if ($wpdb->last_error) {
        error_log('Database error: ' . $wpdb->last_error);
        return new WP_Error('db_error', 'Database error occurred');
    }

    // Format results for response
    $formatted_bookings = array_map(function($booking)  use ($current_user_id) {
        return array(
            'id' => (int)$booking->id,
            'user_id' => (int)$booking->user_id,
            'current_user_id' => (int)$current_user_id,
            'court_id' => (int)$booking->court_id,
            'booking_date' => $booking->booking_date,
            'start_time' => substr($booking->start_time, 0, -3), // Remove seconds if present
            'end_time' => rtrim($booking->end_time, ':00'),     // Remove seconds if present
            'user_name' => $booking->user_name ?: 'Unknown User',
            'status' => $booking->status
        );
    }, $bookings ?: array());

    error_log('Returning formatted bookings: ' . print_r($formatted_bookings, true));
    
    return new WP_REST_Response($formatted_bookings, 200);
}

// Handle booking submission
function handle_booking($request) {
    global $wpdb;
    $params = $request->get_params();
    $user_id = get_current_user_id();
    $user = wp_get_current_user();
    
    if (!$user_id) {
        return new WP_Error('not_logged_in', 'You must be logged in to book', array('status' => 401));
    }
    
    $table_name = $wpdb->prefix . 'bookings';
    
    // Validation
    if (empty($params['date']) || empty($params['startTime']) || empty($params['courtId'])) {
        return new WP_Error('missing_fields', 'Required fields are missing', array('status' => 400));
    }
    
    // Check for existing booking
    $existing = $wpdb->get_var($wpdb->prepare("
        SELECT COUNT(*) 
        FROM $table_name 
        WHERE booking_date = %s 
        AND start_time = %s 
        AND court_id = %d",
        $params['date'],
        $params['startTime'],
        $params['courtId']
    ));
    
    if ($existing > 0) {
        return new WP_Error('time_conflict', 'This time slot is already booked', array('status' => 409));
    }
    
    // Insert booking
    $result = $wpdb->insert(
        $table_name,
        array(
            'user_id' => $user_id,
            'court_id' => $params['courtId'],
            'booking_date' => $params['date'],
            'start_time' => $params['startTime'],
            'end_time' => $params['endTime'],
            'created_at' => current_time('mysql'),
            'status' => 'confirmed'
        ),
        array('%d', '%d', '%s', '%s', '%s', '%s', '%s')
    );
    
    if ($result === false) {
        return new WP_Error('booking_error', 'Failed to save booking', array('status' => 500));
    }
    
    // Return the complete booking data including user name
    $booking_data = array(
        'id' => $wpdb->insert_id,
        'user_id' => $user_id,
        'user_name' => $user->display_name,
        'court_id' => $params['courtId'],
        'booking_date' => $params['date'],
        'start_time' => $params['startTime'],
        'end_time' => $params['endTime'],
        'status' => 'confirmed'
    );
    
    error_log('Created booking: ' . print_r($booking_data, true));
    
    return new WP_REST_Response($booking_data, 200);
}

// Add debug action to check script loading
function footer_check() {
    if (!is_admin()) {  // Only run on frontend
        ?>
        <script type="text/javascript">
            document.addEventListener('DOMContentLoaded', function() {
                console.group('Booking Calendar Debug');
                
                // Check for required dependencies
                console.log('Dependencies Check:', {
                    'wp': typeof wp !== 'undefined',
                    'wp.element': typeof wp !== 'undefined' && typeof wp.element !== 'undefined',
                    'React': typeof React !== 'undefined',
                    'ReactDOM': typeof ReactDOM !== 'undefined',
                    'bookingCalendarData': typeof bookingCalendarData !== 'undefined'
                });

                // List all loaded scripts
                const loadedScripts = Array.from(document.getElementsByTagName('script'))
                    .map(script => script.src)
                    .filter(src => src !== '');
                console.log('Loaded Script URLs:', loadedScripts);

                // Check if our container exists
                const container = document.getElementById('booking-calendar-root');
                console.log('Calendar Container Found:', !!container);

                console.groupEnd();
            });
        </script>
        <?php
    }
}
add_action('wp_footer', 'footer_check', 99);  // Higher priority to run later

// Add this new function for handling deletes
function delete_booking($request) {
    global $wpdb;
    $booking_id = $request->get_param('id');
    $current_user_id = get_current_user_id();
    
    // First check if booking exists and belongs to user
    $booking = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}bookings WHERE id = %d AND user_id = %d",
        $booking_id,
        $current_user_id
    ));

    if (!$booking) {
        return new WP_Error(
            'booking_not_found',
            'Booking not found or you do not have permission to delete it',
            array('status' => 403)
        );
    }

    // Delete the booking
    $result = $wpdb->delete(
        $wpdb->prefix . 'bookings',
        array('id' => $booking_id, 'user_id' => $current_user_id),
        array('%d', '%d')
    );

    if ($result === false) {
        return new WP_Error('delete_failed', 'Failed to delete booking', array('status' => 500));
    }

    return new WP_REST_Response(null, 204);
}
