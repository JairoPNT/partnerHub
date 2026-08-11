<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Installer {
	public static function install() {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate    = $wpdb->get_charset_collate();
		$reservations_table = $wpdb->prefix . 'rnta_reservations';
		$blocks_table       = $wpdb->prefix . 'rnta_reservation_blocks';
		$waivers_table      = $wpdb->prefix . 'rnta_reservation_waivers';
		$guests_table       = $wpdb->prefix . 'rnta_reservation_guests';
		$email_log_table    = $wpdb->prefix . 'rnta_email_log';

		$sql_reservations = "CREATE TABLE {$reservations_table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			woo_order_id bigint(20) unsigned NOT NULL DEFAULT 0,
			order_status_snapshot varchar(40) NOT NULL DEFAULT '',
			payment_method varchar(60) NOT NULL DEFAULT '',
			payment_review_status varchar(40) NOT NULL DEFAULT '',
			payment_status varchar(40) NOT NULL DEFAULT 'pending_proof',
			payment_verified_at datetime DEFAULT NULL,
			payment_verified_by bigint(20) unsigned NOT NULL DEFAULT 0,
			payment_review_notes longtext NULL,
			access_code varchar(32) NOT NULL DEFAULT '',
			party_post_id bigint(20) unsigned NOT NULL DEFAULT 0,
			party_name varchar(190) NOT NULL DEFAULT '',
			party_slug varchar(190) NOT NULL DEFAULT '',
			host_first_name varchar(100) NOT NULL DEFAULT '',
			host_last_name varchar(100) NOT NULL DEFAULT '',
			host_email varchar(190) NOT NULL DEFAULT '',
			host_phone varchar(60) NOT NULL DEFAULT '',
			child_name varchar(120) NOT NULL DEFAULT '',
			child_age varchar(20) NOT NULL DEFAULT '',
			guest_count int(10) unsigned NOT NULL DEFAULT 0,
			included_guests int(10) unsigned NOT NULL DEFAULT 0,
			extra_guest_count int(10) unsigned NOT NULL DEFAULT 0,
			requested_party_date date DEFAULT NULL,
			requested_start_time varchar(10) NOT NULL DEFAULT '',
			requested_end_time varchar(10) NOT NULL DEFAULT '',
			requested_duration_minutes int(10) unsigned NOT NULL DEFAULT 0,
			setup_buffer_minutes int(10) unsigned NOT NULL DEFAULT 0,
			cleanup_buffer_minutes int(10) unsigned NOT NULL DEFAULT 0,
			confirmed_party_date date DEFAULT NULL,
			confirmed_start_time varchar(10) NOT NULL DEFAULT '',
			confirmed_end_time varchar(10) NOT NULL DEFAULT '',
			estimated_total decimal(12,2) NOT NULL DEFAULT 0.00,
			final_negotiated_total decimal(12,2) NOT NULL DEFAULT 0.00,
			deposit_amount decimal(12,2) NOT NULL DEFAULT 0.00,
			addons_json longtext NULL,
			reservation_notes longtext NULL,
			internal_notes longtext NULL,
			reservation_status varchar(40) NOT NULL DEFAULT 'new_request',
			assigned_staff_user_id bigint(20) unsigned NOT NULL DEFAULT 0,
			conflict_flag tinyint(1) NOT NULL DEFAULT 0,
			created_at datetime NOT NULL,
			updated_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY woo_order_id (woo_order_id),
			KEY reservation_status (reservation_status),
			KEY payment_status (payment_status),
			KEY access_code (access_code),
			KEY requested_party_date (requested_party_date),
			KEY confirmed_party_date (confirmed_party_date),
			KEY party_post_id (party_post_id),
			KEY host_email (host_email)
		) {$charset_collate};";

		$sql_blocks = "CREATE TABLE {$blocks_table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			reservation_id bigint(20) unsigned NOT NULL DEFAULT 0,
			block_type varchar(30) NOT NULL DEFAULT 'reservation',
			title varchar(190) NOT NULL DEFAULT '',
			block_date date DEFAULT NULL,
			start_datetime datetime NOT NULL,
			end_datetime datetime NOT NULL,
			source_status varchar(40) NOT NULL DEFAULT '',
			notes longtext NULL,
			created_at datetime NOT NULL,
			updated_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY reservation_id (reservation_id),
			KEY block_date (block_date),
			KEY start_datetime (start_datetime),
			KEY end_datetime (end_datetime),
			KEY block_type (block_type)
		) {$charset_collate};";

		$sql_waivers = "CREATE TABLE {$waivers_table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			reservation_id bigint(20) unsigned NOT NULL DEFAULT 0,
			woo_order_id bigint(20) unsigned NOT NULL DEFAULT 0,
			host_name varchar(190) NOT NULL DEFAULT '',
			host_email varchar(190) NOT NULL DEFAULT '',
			child_name varchar(190) NOT NULL DEFAULT '',
			signer_name varchar(190) NOT NULL DEFAULT '',
			signer_relationship varchar(100) NOT NULL DEFAULT '',
			accepted_terms tinyint(1) NOT NULL DEFAULT 0,
			typed_signature varchar(190) NOT NULL DEFAULT '',
			drawn_signature longtext NULL,
			waiver_text_version varchar(40) NOT NULL DEFAULT '',
			waiver_text_snapshot longtext NULL,
			waiver_pdf_path varchar(500) NOT NULL DEFAULT '',
			waiver_pdf_hash varchar(64) NOT NULL DEFAULT '',
			signature_date date DEFAULT NULL,
			ip_address varchar(80) NOT NULL DEFAULT '',
			user_agent varchar(255) NOT NULL DEFAULT '',
			status varchar(40) NOT NULL DEFAULT 'submitted',
			created_at datetime NOT NULL,
			updated_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY reservation_id (reservation_id),
			KEY woo_order_id (woo_order_id),
			KEY host_email (host_email),
			KEY status (status)
		) {$charset_collate};";

		$sql_guests = "CREATE TABLE {$guests_table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			reservation_id bigint(20) unsigned NOT NULL DEFAULT 0,
			woo_order_id bigint(20) unsigned NOT NULL DEFAULT 0,
			guest_name varchar(190) NOT NULL DEFAULT '',
			guest_birthdate date DEFAULT NULL,
			guest_age int(10) unsigned NOT NULL DEFAULT 0,
			guardian_name varchar(190) NOT NULL DEFAULT '',
			guardian_email varchar(190) NOT NULL DEFAULT '',
			invite_token varchar(64) NOT NULL DEFAULT '',
			invitation_status varchar(40) NOT NULL DEFAULT 'not_sent',
			waiver_status varchar(40) NOT NULL DEFAULT 'pending',
			signer_name varchar(190) NOT NULL DEFAULT '',
			signer_relationship varchar(100) NOT NULL DEFAULT '',
			accepted_terms tinyint(1) NOT NULL DEFAULT 0,
			typed_signature varchar(190) NOT NULL DEFAULT '',
			drawn_signature longtext NULL,
			waiver_text_version varchar(40) NOT NULL DEFAULT '',
			waiver_text_snapshot longtext NULL,
			waiver_pdf_path varchar(500) NOT NULL DEFAULT '',
			waiver_pdf_hash varchar(64) NOT NULL DEFAULT '',
			ip_address varchar(80) NOT NULL DEFAULT '',
			user_agent varchar(255) NOT NULL DEFAULT '',
			invited_at datetime DEFAULT NULL,
			signed_at datetime DEFAULT NULL,
			created_at datetime NOT NULL,
			updated_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY invite_token (invite_token),
			KEY reservation_id (reservation_id),
			KEY woo_order_id (woo_order_id),
			KEY guest_birthdate (guest_birthdate),
			KEY guardian_email (guardian_email),
			KEY invitation_status (invitation_status),
			KEY waiver_status (waiver_status)
		) {$charset_collate};";

		$sql_email_log = "CREATE TABLE {$email_log_table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			reservation_id bigint(20) unsigned NOT NULL DEFAULT 0,
			guest_id bigint(20) unsigned NOT NULL DEFAULT 0,
			recipient_email varchar(190) NOT NULL DEFAULT '',
			email_type varchar(60) NOT NULL DEFAULT '',
			trigger_source varchar(60) NOT NULL DEFAULT '',
			subject varchar(255) NOT NULL DEFAULT '',
			delivery_status varchar(30) NOT NULL DEFAULT 'failed',
			attempt_number int(10) unsigned NOT NULL DEFAULT 1,
			error_message varchar(500) NOT NULL DEFAULT '',
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY reservation_id (reservation_id),
			KEY guest_id (guest_id),
			KEY recipient_email (recipient_email),
			KEY email_type (email_type),
			KEY delivery_status (delivery_status),
			KEY created_at (created_at)
		) {$charset_collate};";

		dbDelta( $sql_reservations );
		dbDelta( $sql_blocks );
		dbDelta( $sql_waivers );
		dbDelta( $sql_guests );
		dbDelta( $sql_email_log );

		update_option( RNTA_Reservations_Plugin::OPTION_DB_VERSION, RNTA_Reservations_Plugin::DB_VERSION );
	}
}
