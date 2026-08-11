<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Repository {
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function get_table_name() {
		global $wpdb;
		return $wpdb->prefix . 'rnta_reservations';
	}

	public function get_by_order_id( $order_id ) {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE woo_order_id = %d LIMIT 1",
				$order_id
			),
			ARRAY_A
		);

		return $row ? $this->normalize_row_dates( $row ) : null;
	}

	public function get_by_id( $reservation_id ) {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE id = %d LIMIT 1",
				$reservation_id
			),
			ARRAY_A
		);

		return $row ? $this->normalize_row_dates( $row ) : null;
	}

	public function upsert_from_order_data( $data ) {
		global $wpdb;

		$table    = $this->get_table_name();
		$existing = $this->get_by_order_id( $data['woo_order_id'] );
		$now      = current_time( 'mysql' );

		$payload = array(
			'woo_order_id'               => absint( $data['woo_order_id'] ),
			'order_status_snapshot'      => sanitize_text_field( $data['order_status_snapshot'] ),
			'payment_method'             => sanitize_text_field( $data['payment_method'] ),
			'payment_review_status'      => sanitize_text_field( $data['payment_review_status'] ),
			'payment_status'             => isset( $data['payment_status'] ) ? sanitize_text_field( $data['payment_status'] ) : 'pending_proof',
			'payment_verified_at'        => ! empty( $data['payment_verified_at'] ) ? sanitize_text_field( $data['payment_verified_at'] ) : null,
			'payment_verified_by'        => isset( $data['payment_verified_by'] ) ? absint( $data['payment_verified_by'] ) : 0,
			'payment_review_notes'       => isset( $data['payment_review_notes'] ) ? sanitize_textarea_field( $data['payment_review_notes'] ) : '',
			'access_code'                => ! empty( $data['access_code'] ) ? sanitize_text_field( $data['access_code'] ) : ( $existing && ! empty( $existing['access_code'] ) ? $existing['access_code'] : $this->generate_access_code() ),
			'party_post_id'              => absint( $data['party_post_id'] ),
			'party_name'                 => sanitize_text_field( $data['party_name'] ),
			'party_slug'                 => sanitize_title( $data['party_slug'] ),
			'host_first_name'            => sanitize_text_field( $data['host_first_name'] ),
			'host_last_name'             => sanitize_text_field( $data['host_last_name'] ),
			'host_email'                 => sanitize_email( $data['host_email'] ),
			'host_phone'                 => sanitize_text_field( $data['host_phone'] ),
			'child_name'                 => sanitize_text_field( $data['child_name'] ),
			'child_age'                  => sanitize_text_field( $data['child_age'] ),
			'guest_count'                => absint( $data['guest_count'] ),
			'included_guests'            => absint( $data['included_guests'] ),
			'extra_guest_count'          => absint( $data['extra_guest_count'] ),
			'requested_party_date'       => ! empty( $data['requested_party_date'] ) ? sanitize_text_field( $data['requested_party_date'] ) : null,
			'requested_start_time'       => sanitize_text_field( $data['requested_start_time'] ),
			'requested_end_time'         => sanitize_text_field( $data['requested_end_time'] ),
			'requested_duration_minutes' => absint( $data['requested_duration_minutes'] ),
			'setup_buffer_minutes'       => absint( $data['setup_buffer_minutes'] ),
			'cleanup_buffer_minutes'     => absint( $data['cleanup_buffer_minutes'] ),
			'confirmed_party_date'       => ! empty( $data['confirmed_party_date'] ) ? sanitize_text_field( $data['confirmed_party_date'] ) : null,
			'confirmed_start_time'       => sanitize_text_field( $data['confirmed_start_time'] ),
			'confirmed_end_time'         => sanitize_text_field( $data['confirmed_end_time'] ),
			'estimated_total'            => number_format( (float) $data['estimated_total'], 2, '.', '' ),
			'final_negotiated_total'     => isset( $data['final_negotiated_total'] ) ? number_format( (float) $data['final_negotiated_total'], 2, '.', '' ) : 0.00,
			'deposit_amount'             => number_format( (float) $data['deposit_amount'], 2, '.', '' ),
			'addons_json'                => wp_json_encode( $data['addons_json'] ),
			'reservation_notes'          => sanitize_textarea_field( $data['reservation_notes'] ),
			'internal_notes'             => isset( $data['internal_notes'] ) ? sanitize_textarea_field( $data['internal_notes'] ) : '',
			'reservation_status'         => sanitize_text_field( $data['reservation_status'] ),
			'assigned_staff_user_id'     => absint( $data['assigned_staff_user_id'] ),
			'conflict_flag'              => absint( $data['conflict_flag'] ),
			'updated_at'                 => $now,
		);

		$formats = array(
			'%d', // woo_order_id
			'%s', // order_status_snapshot
			'%s', // payment_method
			'%s', // payment_review_status
			'%s', // payment_status
			'%s', // payment_verified_at
			'%d', // payment_verified_by
			'%s', // payment_review_notes
			'%s', // access_code
			'%d', // party_post_id
			'%s', // party_name
			'%s', // party_slug
			'%s', // host_first_name
			'%s', // host_last_name
			'%s', // host_email
			'%s', // host_phone
			'%s', // child_name
			'%s', // child_age
			'%d', // guest_count
			'%d', // included_guests
			'%d', // extra_guest_count
			'%s', // requested_party_date
			'%s', // requested_start_time
			'%s', // requested_end_time
			'%d', // requested_duration_minutes
			'%d', // setup_buffer_minutes
			'%d', // cleanup_buffer_minutes
			'%s', // confirmed_party_date
			'%s', // confirmed_start_time
			'%s', // confirmed_end_time
			'%f', // estimated_total
			'%f', // final_negotiated_total
			'%f', // deposit_amount
			'%s', // addons_json
			'%s', // reservation_notes
			'%s', // internal_notes
			'%s', // reservation_status
			'%d', // assigned_staff_user_id
			'%d', // conflict_flag
			'%s', // updated_at
		);

		if ( $existing ) {
			$wpdb->update(
				$table,
				$payload,
				array( 'woo_order_id' => absint( $data['woo_order_id'] ) ),
				$formats,
				array( '%d' )
			);

			return (int) $existing['id'];
		}

		$payload['created_at'] = $now;
		$formats[]             = '%s';

		$wpdb->insert( $table, $payload, $formats );

		return (int) $wpdb->insert_id;
	}

	public function generate_manual_order_id() {
		global $wpdb;

		$max_manual = (int) $wpdb->get_var(
			"SELECT MAX(woo_order_id) FROM {$this->get_table_name()} WHERE woo_order_id >= 990000 AND woo_order_id < 999999"
		);

		return $max_manual ? ( $max_manual + 1 ) : 990001;
	}

	public function create_manual_reservation( $data ) {
		$woo_order_id = $this->generate_manual_order_id();

		$host_first_name = isset( $data['host_first_name'] ) ? sanitize_text_field( $data['host_first_name'] ) : '';
		$host_last_name  = isset( $data['host_last_name'] ) ? sanitize_text_field( $data['host_last_name'] ) : '';

		if ( '' === $host_first_name && isset( $data['host_name'] ) ) {
			$parts           = explode( ' ', trim( (string) $data['host_name'] ), 2 );
			$host_first_name = $parts[0];
			$host_last_name  = isset( $parts[1] ) ? $parts[1] : '';
		}

		$party_name = ! empty( $data['party_name'] ) ? sanitize_text_field( $data['party_name'] ) : 'Manual Reservation Party';
		$party_date = ! empty( $data['party_date'] ) ? sanitize_text_field( $data['party_date'] ) : current_time( 'Y-m-d' );
		$party_time = ! empty( $data['party_time'] ) ? sanitize_text_field( $data['party_time'] ) : '12:00';

		$guest_count = isset( $data['guest_count'] ) ? max( 1, absint( $data['guest_count'] ) ) : 10;
		$included_guests = isset( $data['included_guests'] ) ? max( 0, absint( $data['included_guests'] ) ) : $guest_count;
		$order_payload = array(
			'woo_order_id'               => $woo_order_id,
			'order_status_snapshot'      => 'manual_waiver',
			'payment_method'             => 'manual',
			'payment_review_status'      => 'verified',
			'payment_status'             => 'verified',
			'access_code'                => $this->generate_access_code(),
			'party_post_id'              => isset( $data['party_post_id'] ) ? absint( $data['party_post_id'] ) : 0,
			'party_name'                 => $party_name,
			'party_slug'                 => sanitize_title( $party_name ),
			'host_first_name'            => $host_first_name,
			'host_last_name'             => $host_last_name,
			'host_email'                 => isset( $data['host_email'] ) ? sanitize_email( $data['host_email'] ) : '',
			'host_phone'                 => isset( $data['host_phone'] ) ? sanitize_text_field( $data['host_phone'] ) : '',
			'child_name'                 => isset( $data['child_name'] ) ? sanitize_text_field( $data['child_name'] ) : '',
			'child_age'                  => isset( $data['child_age'] ) ? sanitize_text_field( $data['child_age'] ) : '',
			'guest_count'                => $guest_count,
			'included_guests'            => $included_guests,
			'extra_guest_count'          => max( 0, $guest_count - $included_guests ),
			'requested_party_date'       => $party_date,
			'requested_start_time'       => $party_time,
			'requested_end_time'         => '',
			'requested_duration_minutes' => 120,
			'setup_buffer_minutes'       => 0,
			'cleanup_buffer_minutes'     => 0,
			'confirmed_party_date'       => $party_date,
			'confirmed_start_time'       => $party_time,
			'confirmed_end_time'         => '',
			'estimated_total'            => isset( $data['estimated_total'] ) ? (float) $data['estimated_total'] : 0.00,
			'final_negotiated_total'     => isset( $data['final_negotiated_total'] ) ? (float) $data['final_negotiated_total'] : 0.00,
			'deposit_amount'             => isset( $data['deposit_amount'] ) ? (float) $data['deposit_amount'] : 0.00,
			'addons_json'                => array(),
			'reservation_notes'          => isset( $data['reservation_notes'] ) ? sanitize_textarea_field( $data['reservation_notes'] ) : 'Created via backend manual reservation.',
			'internal_notes'             => isset( $data['internal_notes'] ) ? sanitize_textarea_field( $data['internal_notes'] ) : 'Manual reservation; lead-time and public slot rules bypassed by staff.',
			'reservation_status'         => 'confirmed',
			'assigned_staff_user_id'     => 0,
			'conflict_flag'              => 0,
		);

		$reservation_id = $this->upsert_from_order_data( $order_payload );

		if ( $reservation_id ) {
			// Manual reservations intentionally bypass the public lead-time/day/time rules,
			// but they must still create an operational calendar block immediately.
			RNTA_Reservations_Conflict_Engine::instance()->sync_reservation( $reservation_id );
			do_action( 'rnta_reservation_created', $reservation_id, $woo_order_id );
		}

		return $this->get_by_id( $reservation_id );
	}

	public function get_all( $limit = 200 ) {
		global $wpdb;

		$limit = max( 1, absint( $limit ) );

		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} ORDER BY created_at DESC, id DESC LIMIT %d",
				$limit
			),
			ARRAY_A
		);

		foreach ( $rows as $index => $row ) {
			$rows[ $index ] = $this->normalize_row_dates( $row );
		}

		return $rows;
	}

	public function get_by_lookup_credentials( $lookup_number, $access_code ) {
		global $wpdb;

		$lookup_number = absint( $lookup_number );
		$access_code   = sanitize_text_field( $access_code );

		if ( ! $lookup_number || '' === $access_code ) {
			return null;
		}

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE access_code = %s AND (id = %d OR woo_order_id = %d) LIMIT 1",
				$access_code,
				$lookup_number,
				$lookup_number
			),
			ARRAY_A
		);

		return $row ? $this->normalize_row_dates( $row ) : null;
	}

	public function ensure_access_code( $reservation_id ) {
		$reservation = $this->get_by_id( $reservation_id );

		if ( ! $reservation ) {
			return '';
		}

		if ( ! empty( $reservation['access_code'] ) ) {
			return $reservation['access_code'];
		}

		$code = $this->generate_access_code();

		$this->update_operational_fields(
			$reservation_id,
			array(
				'access_code' => $code,
			)
		);

		return $code;
	}

	public function update_operational_fields( $reservation_id, $data ) {
		global $wpdb;

		$before = $this->get_by_id( $reservation_id );

		$allowed_keys = array(
			'party_post_id'          => '%d',
			'party_name'             => '%s',
			'party_slug'             => '%s',
			'child_name'             => '%s',
			'child_age'              => '%s',
			'guest_count'            => '%d',
			'included_guests'        => '%d',
			'extra_guest_count'      => '%d',
			'estimated_total'        => '%f',
			'addons_json'            => '%s',
			'reservation_notes'      => '%s',
			'access_code'            => '%s',
			'reservation_status'   => '%s',
			'internal_notes'       => '%s',
			'confirmed_party_date' => '%s',
			'confirmed_start_time' => '%s',
			'confirmed_end_time'   => '%s',
			'conflict_flag'        => '%d',
			'payment_status'       => '%s',
			'payment_verified_at'  => '%s',
			'payment_verified_by'  => '%d',
			'payment_review_notes' => '%s',
			'final_negotiated_total'=> '%f',
			'updated_at'           => '%s',
		);

		$payload = array();
		$formats = array();

		foreach ( $allowed_keys as $key => $format ) {
			if ( ! array_key_exists( $key, $data ) ) {
				continue;
			}

			$value = $data[ $key ];

			if ( in_array( $key, array( 'internal_notes', 'payment_review_notes', 'reservation_notes' ), true ) ) {
				$value = sanitize_textarea_field( $value );
			} elseif ( in_array( $key, array( 'confirmed_party_date', 'confirmed_start_time', 'confirmed_end_time', 'reservation_status', 'payment_status', 'payment_verified_at', 'party_name', 'party_slug', 'child_name', 'child_age', 'access_code' ), true ) ) {
				$value = sanitize_text_field( $value );
			} elseif ( in_array( $key, array( 'final_negotiated_total', 'estimated_total' ), true ) ) {
				$value = (float) $value;
			} elseif ( in_array( $key, array( 'conflict_flag', 'payment_verified_by', 'party_post_id', 'guest_count', 'included_guests', 'extra_guest_count' ), true ) ) {
				$value = absint( $value );
			} elseif ( 'addons_json' === $key ) {
				$value = wp_json_encode( $value );
			}

			$payload[ $key ] = $value;
			$formats[]       = $format;
		}

		$payload['updated_at'] = current_time( 'mysql' );
		$formats[]             = '%s';

		$updated = (bool) $wpdb->update(
			$this->get_table_name(),
			$payload,
			array( 'id' => absint( $reservation_id ) ),
			$formats,
			array( '%d' )
		);

		if ( $updated ) {
			$after = $this->get_by_id( $reservation_id );
			do_action( 'rnta_reservation_updated', absint( $reservation_id ), $before, $after, $data );
		}

		return $updated;
	}

	public function delete_by_id( $reservation_id ) {
		global $wpdb;

		return (bool) $wpdb->delete(
			$this->get_table_name(),
			array( 'id' => absint( $reservation_id ) ),
			array( '%d' )
		);
	}

	public function delete_many( $reservation_ids ) {
		global $wpdb;

		$reservation_ids = array_filter( array_map( 'absint', (array) $reservation_ids ) );

		if ( empty( $reservation_ids ) ) {
			return 0;
		}

		$placeholders = implode( ',', array_fill( 0, count( $reservation_ids ), '%d' ) );
		$sql          = "DELETE FROM {$this->get_table_name()} WHERE id IN ({$placeholders})";

		return (int) $wpdb->query( $wpdb->prepare( $sql, $reservation_ids ) );
	}

	private function generate_access_code() {
		return strtoupper( wp_generate_password( 8, false, false ) );
	}

	private function normalize_row_dates( $row ) {
		foreach ( array( 'requested_party_date', 'confirmed_party_date' ) as $date_key ) {
			if ( isset( $row[ $date_key ] ) && $this->is_empty_date_value( $row[ $date_key ] ) ) {
				$row[ $date_key ] = '';
			}
		}

		if ( isset( $row['created_at'] ) && $this->is_empty_datetime_value( $row['created_at'] ) ) {
			$repaired = $this->repair_created_at_from_order( $row );
			if ( $repaired ) {
				$row['created_at'] = $repaired;
			} else {
				$row['created_at'] = '';
			}
		}

		return $row;
	}

	private function repair_created_at_from_order( $row ) {
		if ( empty( $row['id'] ) || empty( $row['woo_order_id'] ) || ! function_exists( 'wc_get_order' ) ) {
			return '';
		}

		$order = wc_get_order( absint( $row['woo_order_id'] ) );
		if ( ! $order || ! $order->get_date_created() ) {
			return '';
		}

		$created_at = $order->get_date_created()->date( 'Y-m-d H:i:s' );

		global $wpdb;
		$wpdb->update(
			$this->get_table_name(),
			array(
				'created_at' => $created_at,
				'updated_at' => current_time( 'mysql' ),
			),
			array( 'id' => absint( $row['id'] ) ),
			array( '%s', '%s' ),
			array( '%d' )
		);

		return $created_at;
	}

	private function is_empty_date_value( $value ) {
		$value = trim( (string) $value );
		return '' === $value || '0000-00-00' === $value;
	}

	private function is_empty_datetime_value( $value ) {
		$value = trim( (string) $value );
		return '' === $value || '0000-00-00 00:00:00' === $value || '0000-00-00' === $value;
	}
}
