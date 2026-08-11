<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Block_Repository {
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function get_table_name() {
		global $wpdb;
		return $wpdb->prefix . 'rnta_reservation_blocks';
	}

	public function delete_by_reservation_id( $reservation_id ) {
		global $wpdb;

		return (bool) $wpdb->delete(
			$this->get_table_name(),
			array( 'reservation_id' => absint( $reservation_id ) ),
			array( '%d' )
		);
	}

	public function delete_by_id( $block_id ) {
		global $wpdb;

		return (bool) $wpdb->delete(
			$this->get_table_name(),
			array( 'id' => absint( $block_id ) ),
			array( '%d' )
		);
	}

	public function get_by_id( $block_id ) {
		global $wpdb;

		return $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE id = %d LIMIT 1",
				absint( $block_id )
			),
			ARRAY_A
		);
	}

	public function upsert_reservation_block( $reservation_id, $title, $block_date, $start_datetime, $end_datetime, $source_status, $notes = '' ) {
		global $wpdb;

		$table    = $this->get_table_name();
		$existing = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE reservation_id = %d AND block_type = %s LIMIT 1",
				absint( $reservation_id ),
				'reservation'
			),
			ARRAY_A
		);

		$payload = array(
			'reservation_id' => absint( $reservation_id ),
			'block_type'     => 'reservation',
			'title'          => sanitize_text_field( $title ),
			'block_date'     => $block_date ? sanitize_text_field( $block_date ) : null,
			'start_datetime' => sanitize_text_field( $start_datetime ),
			'end_datetime'   => sanitize_text_field( $end_datetime ),
			'source_status'  => sanitize_text_field( $source_status ),
			'notes'          => sanitize_textarea_field( $notes ),
			'updated_at'     => current_time( 'mysql' ),
		);

		$formats = array( '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' );

		if ( $existing ) {
			$wpdb->update(
				$table,
				$payload,
				array( 'id' => absint( $existing['id'] ) ),
				$formats,
				array( '%d' )
			);

			return (int) $existing['id'];
		}

		$payload['created_at'] = current_time( 'mysql' );
		$formats[]             = '%s';
		$wpdb->insert( $table, $payload, $formats );

		return (int) $wpdb->insert_id;
	}

	public function create_manual_block( $title, $start_datetime, $end_datetime, $notes = '' ) {
		global $wpdb;

		$start = sanitize_text_field( $start_datetime );
		$end   = sanitize_text_field( $end_datetime );

		$wpdb->insert(
			$this->get_table_name(),
			array(
				'reservation_id' => 0,
				'block_type'     => 'manual',
				'title'          => sanitize_text_field( $title ),
				'block_date'     => substr( $start, 0, 10 ),
				'start_datetime' => $start,
				'end_datetime'   => $end,
				'source_status'  => 'manual_block',
				'notes'          => sanitize_textarea_field( $notes ),
				'created_at'     => current_time( 'mysql' ),
				'updated_at'     => current_time( 'mysql' ),
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);

		return (int) $wpdb->insert_id;
	}

	public function get_all_blocks( $limit = 300 ) {
		global $wpdb;

		$limit = max( 1, absint( $limit ) );

		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} ORDER BY start_datetime DESC, id DESC LIMIT %d",
				$limit
			),
			ARRAY_A
		);
	}

	public function get_manual_blocks( $limit = 200 ) {
		global $wpdb;

		$limit = max( 1, absint( $limit ) );

		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE block_type = %s ORDER BY start_datetime DESC, id DESC LIMIT %d",
				'manual',
				$limit
			),
			ARRAY_A
		);
	}

	public function get_overlaps( $start_datetime, $end_datetime, $exclude_reservation_id = 0 ) {
		global $wpdb;

		$table = $this->get_table_name();
		$sql   = "SELECT * FROM {$table} WHERE start_datetime < %s AND end_datetime > %s";
		$args  = array( $end_datetime, $start_datetime );

		if ( $exclude_reservation_id > 0 ) {
			$sql   .= ' AND reservation_id != %d';
			$args[] = absint( $exclude_reservation_id );
		}

		$sql .= ' ORDER BY start_datetime ASC';

		return $wpdb->get_results( $wpdb->prepare( $sql, $args ), ARRAY_A );
	}

	public function get_blocks_between( $start_datetime, $end_datetime ) {
		global $wpdb;

		$table = $this->get_table_name();

		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE start_datetime < %s AND end_datetime > %s ORDER BY start_datetime ASC",
				$end_datetime,
				$start_datetime
			),
			ARRAY_A
		);
	}

	public function get_blocks_for_date( $date ) {
		global $wpdb;

		$start = sanitize_text_field( $date ) . ' 00:00:00';
		$end   = sanitize_text_field( $date ) . ' 23:59:59';

		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE start_datetime < %s AND end_datetime > %s ORDER BY start_datetime ASC",
				$end,
				$start
			),
			ARRAY_A
		);
	}
}
