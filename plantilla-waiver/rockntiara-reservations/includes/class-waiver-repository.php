<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Waiver_Repository {
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function get_table_name() {
		global $wpdb;
		return $wpdb->prefix . 'rnta_reservation_waivers';
	}

	public function get_by_reservation_id( $reservation_id ) {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE reservation_id = %d LIMIT 1",
				absint( $reservation_id )
			),
			ARRAY_A
		);

		return $row ? $row : null;
	}

	public function get_by_order_id( $woo_order_id ) {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE woo_order_id = %d LIMIT 1",
				absint( $woo_order_id )
			),
			ARRAY_A
		);

		return $row ? $row : null;
	}

	public function has_waiver( $reservation_id ) {
		return (bool) $this->get_by_reservation_id( $reservation_id );
	}

	public function count_by_reservation_id( $reservation_id ) {
		global $wpdb;

		if ( class_exists( 'RNTA_Reservations_Guest_Repository' ) ) {
			$guest_count = RNTA_Reservations_Guest_Repository::instance()->count_by_reservation_id( $reservation_id );

			if ( $guest_count > 0 ) {
				return RNTA_Reservations_Guest_Repository::instance()->count_signed_by_reservation_id( $reservation_id );
			}
		}

		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->get_table_name()} WHERE reservation_id = %d AND status = %s",
				absint( $reservation_id ),
				'submitted'
			)
		);
	}

	public function save_from_form( $reservation, $data ) {
		global $wpdb;

		$reservation_id = absint( $reservation['id'] );
		$existing       = $this->get_by_reservation_id( $reservation_id );
		$now            = current_time( 'mysql' );

		$payload = array(
			'reservation_id'      => $reservation_id,
			'woo_order_id'        => absint( $reservation['woo_order_id'] ),
			'host_name'           => sanitize_text_field( trim( $reservation['host_first_name'] . ' ' . $reservation['host_last_name'] ) ),
			'host_email'          => sanitize_email( $reservation['host_email'] ),
			'child_name'          => sanitize_text_field( $data['child_name'] ),
			'signer_name'         => sanitize_text_field( $data['signer_name'] ),
			'signer_relationship' => sanitize_text_field( $data['signer_relationship'] ),
			'accepted_terms'      => ! empty( $data['accepted_terms'] ) ? 1 : 0,
			'typed_signature'     => sanitize_text_field( $data['typed_signature'] ),
			'drawn_signature'     => isset( $data['drawn_signature'] ) ? $this->sanitize_signature_data_url( $data['drawn_signature'] ) : '',
			'waiver_text_version' => isset( $data['waiver_text_version'] ) ? sanitize_text_field( $data['waiver_text_version'] ) : '',
			'waiver_text_snapshot' => isset( $data['waiver_text_snapshot'] ) ? wp_kses_post( $data['waiver_text_snapshot'] ) : '',
			'signature_date'      => current_time( 'Y-m-d' ),
			'ip_address'          => isset( $data['ip_address'] ) ? sanitize_text_field( $data['ip_address'] ) : '',
			'user_agent'          => isset( $data['user_agent'] ) ? substr( sanitize_text_field( $data['user_agent'] ), 0, 255 ) : '',
			'status'              => 'submitted',
			'updated_at'          => $now,
		);

		$formats = array( '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' );

		if ( $existing ) {
			return (bool) $wpdb->update(
				$this->get_table_name(),
				$payload,
				array( 'reservation_id' => $reservation_id ),
				$formats,
				array( '%d' )
			);
		}

		$payload['created_at'] = $now;
		$formats[]            = '%s';

		return (bool) $wpdb->insert( $this->get_table_name(), $payload, $formats );
	}

	public function attach_pdf( $reservation_id, $relative_path, $file_hash ) {
		global $wpdb;

		return (bool) $wpdb->update(
			$this->get_table_name(),
			array(
				'waiver_pdf_path' => sanitize_text_field( $relative_path ),
				'waiver_pdf_hash' => sanitize_text_field( $file_hash ),
				'updated_at'      => current_time( 'mysql' ),
			),
			array( 'reservation_id' => absint( $reservation_id ) ),
			array( '%s', '%s', '%s' ),
			array( '%d' )
		);
	}

	private function sanitize_signature_data_url( $signature ) {
		$signature = trim( (string) $signature );

		if ( '' === $signature ) {
			return '';
		}

		if ( strlen( $signature ) > 500000 ) {
			return '';
		}

		if ( ! preg_match( '/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/', $signature ) ) {
			return '';
		}

		return $signature;
	}

	public function delete_by_reservation_id( $reservation_id ) {
		global $wpdb;

		return (bool) $wpdb->delete(
			$this->get_table_name(),
			array( 'reservation_id' => absint( $reservation_id ) ),
			array( '%d' )
		);
	}

	public function delete_many_by_reservation_ids( $reservation_ids ) {
		global $wpdb;

		$reservation_ids = array_filter( array_map( 'absint', (array) $reservation_ids ) );

		if ( empty( $reservation_ids ) ) {
			return 0;
		}

		$placeholders = implode( ',', array_fill( 0, count( $reservation_ids ), '%d' ) );
		$sql          = "DELETE FROM {$this->get_table_name()} WHERE reservation_id IN ({$placeholders})";

		return (int) $wpdb->query( $wpdb->prepare( $sql, $reservation_ids ) );
	}
}
