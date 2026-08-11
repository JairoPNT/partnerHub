<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once RNTA_RESERVATIONS_PATH . 'includes/class-installer.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-admin-menu.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-reservation-repository.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-block-repository.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-conflict-engine.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-woocommerce-sync.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-availability-calendar.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-reservation-portal.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-email-log-repository.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-email-notifications.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-waiver-repository.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-guest-repository.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-waiver-pdf.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-waiver-pdf-download.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-waiver-portal.php';
require_once RNTA_RESERVATIONS_PATH . 'includes/class-contact-settings.php';

final class RNTA_Reservations_Plugin {
	const OPTION_DB_VERSION = 'rnta_reservations_db_version';
	const DB_VERSION        = '0.4.1';

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public static function activate() {
		RNTA_Reservations_Installer::install();
	}

	public static function deactivate() {
		// Reserved for future cleanup hooks if needed.
	}

	private function __construct() {
		add_action( 'plugins_loaded', array( $this, 'bootstrap' ) );
	}

	public function bootstrap() {
		if ( get_option( self::OPTION_DB_VERSION ) !== self::DB_VERSION ) {
			RNTA_Reservations_Installer::install();
		}

		RNTA_Reservations_Repository::instance();
		RNTA_Reservations_Block_Repository::instance();
		RNTA_Reservations_Conflict_Engine::instance();
		RNTA_Reservations_WooCommerce_Sync::instance();
		RNTA_Reservations_Availability_Calendar::instance();
		RNTA_Reservations_Portal::instance();
		RNTA_Reservations_Email_Log_Repository::instance();
		RNTA_Reservations_Email_Notifications::instance();
		RNTA_Reservations_Waiver_Repository::instance();
		RNTA_Reservations_Guest_Repository::instance();
		RNTA_Reservations_Waiver_PDF_Download::instance();
		RNTA_Reservations_Waiver_Portal::instance();
		RNTA_Reservations_Contact_Settings::instance();

		if ( is_admin() ) {
			RNTA_Reservations_Admin_Menu::instance();
		}
	}
}
