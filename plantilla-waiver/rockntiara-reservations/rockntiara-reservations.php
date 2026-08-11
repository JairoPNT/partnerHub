<?php
/**
 * Plugin Name: RT - Reservations
 * Description: Internal reservation control layer for WooCommerce deposit requests, schedule review, conflict detection, and manual blackout windows.
 * Version: 0.12.7
 * Author: Codex for Rock N Tiara
 * License: GPL-2.0-or-later
 * Text Domain: rockntiara-reservations
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'RNTA_RESERVATIONS_VERSION', '0.12.7' );
define( 'RNTA_RESERVATIONS_FILE', __FILE__ );
define( 'RNTA_RESERVATIONS_PATH', plugin_dir_path( __FILE__ ) );
define( 'RNTA_RESERVATIONS_URL', plugin_dir_url( __FILE__ ) );
define( 'RNTA_RESERVATIONS_VENUE_NAME', 'Rock N Tiara Kids Spa' );
define( 'RNTA_RESERVATIONS_VENUE_ADDRESS', '9875 W Sample Rd, Coral Springs, FL 33065' );
define( 'RNTA_RESERVATIONS_VENUE_LABEL', RNTA_RESERVATIONS_VENUE_NAME . ' - ' . RNTA_RESERVATIONS_VENUE_ADDRESS );

require_once RNTA_RESERVATIONS_PATH . 'includes/class-plugin.php';

register_activation_hook( __FILE__, array( 'RNTA_Reservations_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'RNTA_Reservations_Plugin', 'deactivate' ) );

RNTA_Reservations_Plugin::instance();
