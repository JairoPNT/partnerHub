<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Email_Log_Repository {
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function get_table_name() {
		global $wpdb;
		return $wpdb->prefix . 'rnta_email_log';
	}

	public function record_attempt( $data ) {
		global $wpdb;

		$reservation_id = ! empty( $data['reservation_id'] ) ? absint( $data['reservation_id'] ) : 0;
		$guest_id       = ! empty( $data['guest_id'] ) ? absint( $data['guest_id'] ) : 0;
		$recipient      = isset( $data['recipient_email'] ) ? sanitize_email( $data['recipient_email'] ) : '';
		$email_type     = isset( $data['email_type'] ) ? sanitize_key( $data['email_type'] ) : 'unknown';

		$attempt_number = 1 + (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->get_table_name()} WHERE reservation_id = %d AND guest_id = %d AND recipient_email = %s AND email_type = %s",
				$reservation_id,
				$guest_id,
				$recipient,
				$email_type
			)
		);

		return (bool) $wpdb->insert(
			$this->get_table_name(),
			array(
				'reservation_id' => $reservation_id,
				'guest_id'       => $guest_id,
				'recipient_email' => $recipient,
				'email_type'     => $email_type,
				'trigger_source' => isset( $data['trigger_source'] ) ? sanitize_key( $data['trigger_source'] ) : 'system',
				'subject'        => isset( $data['subject'] ) ? sanitize_text_field( $data['subject'] ) : '',
				'delivery_status' => ! empty( $data['delivery_status'] ) ? sanitize_key( $data['delivery_status'] ) : 'failed',
				'attempt_number' => $attempt_number,
				'error_message'  => isset( $data['error_message'] ) ? sanitize_text_field( $data['error_message'] ) : '',
				'created_at'     => current_time( 'mysql' ),
			),
			array( '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s' )
		);
	}

	public function get_entries( $search = '', $limit = 200 ) {
		global $wpdb;

		$limit = max( 1, min( 500, absint( $limit ) ) );
		$sql   = "SELECT * FROM {$this->get_table_name()}";

		if ( '' !== trim( (string) $search ) ) {
			$like = '%' . $wpdb->esc_like( trim( (string) $search ) ) . '%';
			$sql .= $wpdb->prepare(
				' WHERE recipient_email LIKE %s OR subject LIKE %s OR email_type LIKE %s',
				$like,
				$like,
				$like
			);
		}

		$sql .= $wpdb->prepare( ' ORDER BY created_at DESC, id DESC LIMIT %d', $limit );
		return $wpdb->get_results( $sql, ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}
}
