<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Guest_Repository {
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function get_table_name() {
		global $wpdb;
		return $wpdb->prefix . 'rnta_reservation_guests';
	}

	public function get_by_id( $guest_id ) {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE id = %d LIMIT 1",
				absint( $guest_id )
			),
			ARRAY_A
		);

		return $row ? $row : null;
	}

	public function get_by_token( $token ) {
		global $wpdb;

		$token = sanitize_text_field( (string) $token );

		if ( '' === $token ) {
			return null;
		}

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE invite_token = %s LIMIT 1",
				$token
			),
			ARRAY_A
		);

		return $row ? $row : null;
	}

	public function get_by_reservation_id( $reservation_id ) {
		global $wpdb;

		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE reservation_id = %d ORDER BY created_at ASC, id ASC",
				absint( $reservation_id )
			),
			ARRAY_A
		);
	}

	public function get_pending_waiver_by_reservation_id( $reservation_id ) {
		global $wpdb;

		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->get_table_name()} WHERE reservation_id = %d AND waiver_status <> %s ORDER BY created_at ASC, id ASC",
				absint( $reservation_id ),
				'signed'
			),
			ARRAY_A
		);
	}

	public function count_by_reservation_id( $reservation_id ) {
		global $wpdb;

		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->get_table_name()} WHERE reservation_id = %d",
				absint( $reservation_id )
			)
		);
	}

	public function count_signed_by_reservation_id( $reservation_id ) {
		global $wpdb;

		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->get_table_name()} WHERE reservation_id = %d AND waiver_status = %s",
				absint( $reservation_id ),
				'signed'
			)
		);
	}

	public function find_duplicate_candidate( $reservation_id, $guest_name, $guardian_email = '' ) {
		global $wpdb;

		$reservation_id = absint( $reservation_id );
		$guest_name     = $this->normalize_identity_value( $guest_name );
		$guardian_email = sanitize_email( $guardian_email );

		if ( $reservation_id <= 0 || ( '' === $guest_name && '' === $guardian_email ) ) {
			return null;
		}

		if ( '' !== $guardian_email && '' !== $guest_name ) {
			$row = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM {$this->get_table_name()} WHERE reservation_id = %d AND LOWER(guardian_email) = LOWER(%s) AND LOWER(TRIM(guest_name)) = %s ORDER BY CASE WHEN waiver_status = 'signed' THEN 0 ELSE 1 END, id ASC LIMIT 1",
					$reservation_id,
					$guardian_email,
					$guest_name
				),
				ARRAY_A
			);

			if ( $row ) {
				return $row;
			}
		}

		if ( '' !== $guest_name && '' === $guardian_email ) {
			$row = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM {$this->get_table_name()} WHERE reservation_id = %d AND LOWER(TRIM(guest_name)) = %s AND (guardian_email = '' OR guardian_email IS NULL) ORDER BY CASE WHEN waiver_status = 'signed' THEN 0 ELSE 1 END, id ASC LIMIT 1",
					$reservation_id,
					$guest_name
				),
				ARRAY_A
			);

			return $row ? $row : null;
		}

		return null;
	}

	public function get_waiver_progress_by_reservation_ids( $reservation_ids ) {
		global $wpdb;

		$reservation_ids = array_values( array_filter( array_map( 'absint', (array) $reservation_ids ) ) );

		if ( empty( $reservation_ids ) ) {
			return array();
		}

		$placeholders = implode( ',', array_fill( 0, count( $reservation_ids ), '%d' ) );
		$sql          = $wpdb->prepare(
			"SELECT reservation_id, COUNT(*) AS total, SUM(CASE WHEN waiver_status = 'signed' THEN 1 ELSE 0 END) AS signed FROM {$this->get_table_name()} WHERE reservation_id IN ({$placeholders}) GROUP BY reservation_id",
			$reservation_ids
		);
		$rows         = $wpdb->get_results( $sql, ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$progress     = array();

		foreach ( $rows as $row ) {
			$reservation_id = absint( $row['reservation_id'] );
			$total          = absint( $row['total'] );
			$signed         = absint( $row['signed'] );

			$progress[ $reservation_id ] = array(
				'total'   => $total,
				'signed'  => $signed,
				'pending' => max( 0, $total - $signed ),
			);
		}

		return $progress;
	}

	public function create_guest( $reservation, $guest_name, $guardian_email = '', $guardian_name = '' ) {
		global $wpdb;

		$guest_name     = sanitize_text_field( $guest_name );
		$guardian_email = sanitize_email( $guardian_email );
		$guardian_name  = sanitize_text_field( $guardian_name );

		if ( '' === $guest_name ) {
			return false;
		}

		if ( $this->find_duplicate_candidate( $reservation['id'], $guest_name, $guardian_email ) ) {
			return false;
		}

		$now = current_time( 'mysql' );

		return (bool) $wpdb->insert(
			$this->get_table_name(),
			array(
				'reservation_id'    => absint( $reservation['id'] ),
				'woo_order_id'      => absint( $reservation['woo_order_id'] ),
				'guest_name'        => $guest_name,
				'guardian_name'     => $guardian_name,
				'guardian_email'    => $guardian_email,
				'invite_token'      => $this->generate_token(),
				'invitation_status' => 'not_sent',
				'waiver_status'     => 'pending',
				'created_at'        => $now,
				'updated_at'        => $now,
			),
			array( '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);
	}

	public function create_many_from_lines( $reservation, $raw_lines ) {
		$raw_lines = trim( (string) $raw_lines );

		if ( '' === $raw_lines ) {
			return 0;
		}

		$created = 0;
		$lines   = preg_split( '/\r\n|\r|\n/', $raw_lines );

		foreach ( $lines as $line ) {
			$line = trim( $line );

			if ( '' === $line ) {
				continue;
			}

			$parts          = array_map( 'trim', explode( '|', $line ) );
			$guest_name     = isset( $parts[0] ) ? $parts[0] : '';
			$guardian_email = isset( $parts[1] ) ? $parts[1] : '';
			$guardian_name  = isset( $parts[2] ) ? $parts[2] : '';

			if ( $this->create_guest( $reservation, $guest_name, $guardian_email, $guardian_name ) ) {
				$created++;
			}
		}

		return $created;
	}

	public function create_many_from_rows( $reservation, $rows ) {
		$created = 0;
		$rows    = is_array( $rows ) ? $rows : array();

		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			$guest_name     = isset( $row['guest_name'] ) ? $row['guest_name'] : '';
			$guardian_email = isset( $row['guardian_email'] ) ? $row['guardian_email'] : '';
			$guardian_name  = isset( $row['guardian_name'] ) ? $row['guardian_name'] : '';

			if ( $this->create_guest( $reservation, $guest_name, $guardian_email, $guardian_name ) ) {
				$created++;
			}
		}

		return $created;
	}

	public function upsert_many_from_rows( $reservation, $rows, $limit = 0 ) {
		global $wpdb;

		$result = array(
			'created'   => 0,
			'updated'   => 0,
			'skipped'   => 0,
			'guest_ids' => array(),
		);
		$rows   = is_array( $rows ) ? $rows : array();
		$limit  = absint( $limit );

		foreach ( $rows as $row ) {
			if ( $limit > 0 && count( $result['guest_ids'] ) >= $limit ) {
				break;
			}

			if ( ! is_array( $row ) ) {
				continue;
			}

			$guest_name     = isset( $row['guest_name'] ) ? sanitize_text_field( $row['guest_name'] ) : '';
			$guardian_email = isset( $row['guardian_email'] ) ? sanitize_email( $row['guardian_email'] ) : '';
			$guardian_name  = isset( $row['guardian_name'] ) ? sanitize_text_field( $row['guardian_name'] ) : '';

			if ( '' === $guest_name ) {
				continue;
			}

			$existing = $this->find_duplicate_candidate( $reservation['id'], $guest_name, $guardian_email );

			if ( $existing ) {
				if ( 'signed' === $existing['waiver_status'] ) {
					$result['skipped']++;
					continue;
				}

				if ( $this->update_guest( $existing['id'], $guest_name, $guardian_email, $guardian_name ) ) {
					$result['updated']++;
					$result['guest_ids'][] = absint( $existing['id'] );
				} else {
					$result['skipped']++;
				}

				continue;
			}

			if ( $this->create_guest( $reservation, $guest_name, $guardian_email, $guardian_name ) ) {
				$result['created']++;
				$result['guest_ids'][] = absint( $wpdb->insert_id );
			}
		}

		$result['guest_ids'] = array_values( array_unique( array_filter( array_map( 'absint', $result['guest_ids'] ) ) ) );

		return $result;
	}

	public function cleanup_duplicate_pending_by_reservation_id( $reservation_id ) {
		$guests = $this->get_by_reservation_id( $reservation_id );

		if ( count( $guests ) < 2 ) {
			return 0;
		}

		$signed_keys = array();
		$deleted     = 0;

		foreach ( $guests as $guest ) {
			if ( 'signed' !== $guest['waiver_status'] ) {
				continue;
			}

			foreach ( $this->get_guest_identity_keys( $guest ) as $key ) {
				$signed_keys[ $key ] = true;
			}
		}

		if ( empty( $signed_keys ) ) {
			return 0;
		}

		foreach ( $guests as $guest ) {
			if ( 'signed' === $guest['waiver_status'] ) {
				continue;
			}

			foreach ( $this->get_guest_identity_keys( $guest ) as $key ) {
				if ( isset( $signed_keys[ $key ] ) ) {
					if ( $this->delete_by_id( $guest['id'] ) ) {
						$deleted++;
					}
					break;
				}
			}
		}

		return $deleted;
	}

	public function mark_invited( $guest_id ) {
		global $wpdb;

		return (bool) $wpdb->update(
			$this->get_table_name(),
			array(
				'invitation_status' => 'sent',
				'invited_at'        => current_time( 'mysql' ),
				'updated_at'        => current_time( 'mysql' ),
			),
			array( 'id' => absint( $guest_id ) ),
			array( '%s', '%s', '%s' ),
			array( '%d' )
		);
	}

	public function update_guest( $guest_id, $guest_name, $guardian_email = '', $guardian_name = '' ) {
		global $wpdb;

		$guest = $this->get_by_id( $guest_id );

		if ( ! $guest || 'signed' === $guest['waiver_status'] ) {
			return false;
		}

		$guest_name     = sanitize_text_field( $guest_name );
		$guardian_email = sanitize_email( $guardian_email );
		$guardian_name  = sanitize_text_field( $guardian_name );

		if ( '' === $guest_name ) {
			return false;
		}

		if (
			$guest_name === $guest['guest_name']
			&& $guardian_name === $guest['guardian_name']
			&& $guardian_email === $guest['guardian_email']
		) {
			return true;
		}

		return (bool) $wpdb->update(
			$this->get_table_name(),
			array(
				'guest_name'     => $guest_name,
				'guardian_name'  => $guardian_name,
				'guardian_email' => $guardian_email,
				'updated_at'     => current_time( 'mysql' ),
			),
			array( 'id' => absint( $guest_id ) ),
			array( '%s', '%s', '%s', '%s' ),
			array( '%d' )
		);
	}

	public function save_guest_waiver( $guest, $data ) {
		global $wpdb;

		return (bool) $wpdb->update(
			$this->get_table_name(),
			array(
				'waiver_status'        => 'signed',
				'guest_birthdate'      => ! empty( $data['guest_birthdate'] ) ? sanitize_text_field( $data['guest_birthdate'] ) : null,
				'guest_age'            => isset( $data['guest_age'] ) ? absint( $data['guest_age'] ) : 0,
				'signer_name'          => sanitize_text_field( $data['signer_name'] ),
				'signer_relationship'  => sanitize_text_field( $data['signer_relationship'] ),
				'accepted_terms'       => ! empty( $data['accepted_terms'] ) ? 1 : 0,
				'typed_signature'      => sanitize_text_field( $data['typed_signature'] ),
				'drawn_signature'      => isset( $data['drawn_signature'] ) ? $this->sanitize_signature_data_url( $data['drawn_signature'] ) : '',
				'waiver_text_version'  => isset( $data['waiver_text_version'] ) ? sanitize_text_field( $data['waiver_text_version'] ) : '',
				'waiver_text_snapshot' => isset( $data['waiver_text_snapshot'] ) ? wp_kses_post( $data['waiver_text_snapshot'] ) : '',
				'ip_address'           => isset( $data['ip_address'] ) ? sanitize_text_field( $data['ip_address'] ) : '',
				'user_agent'           => isset( $data['user_agent'] ) ? substr( sanitize_text_field( $data['user_agent'] ), 0, 255 ) : '',
				'signed_at'            => current_time( 'mysql' ),
				'updated_at'           => current_time( 'mysql' ),
			),
			array( 'id' => absint( $guest['id'] ) ),
			array( '%s', '%s', '%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' ),
			array( '%d' )
		);
	}

	public function attach_waiver_pdf( $guest_id, $relative_path, $file_hash ) {
		global $wpdb;

		return (bool) $wpdb->update(
			$this->get_table_name(),
			array(
				'waiver_pdf_path' => sanitize_text_field( $relative_path ),
				'waiver_pdf_hash' => sanitize_text_field( $file_hash ),
				'updated_at'      => current_time( 'mysql' ),
			),
			array( 'id' => absint( $guest_id ) ),
			array( '%s', '%s', '%s' ),
			array( '%d' )
		);
	}

	public function delete_by_id( $guest_id ) {
		global $wpdb;

		return (bool) $wpdb->delete(
			$this->get_table_name(),
			array( 'id' => absint( $guest_id ) ),
			array( '%d' )
		);
	}

	public function delete_by_reservation_id( $reservation_id ) {
		global $wpdb;

		return (int) $wpdb->delete(
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

	public function get_guest_waiver_url( $guest ) {
		return add_query_arg(
			array(
				'guest' => $guest['invite_token'],
			),
			home_url( '/waiver/' )
		);
	}

	private function normalize_identity_value( $value ) {
		$value = sanitize_text_field( (string) $value );
		$value = trim( preg_replace( '/\s+/', ' ', $value ) );

		return strtolower( $value );
	}

	private function get_guest_identity_keys( $guest ) {
		$keys           = array();
		$guest_name     = isset( $guest['guest_name'] ) ? $this->normalize_identity_value( $guest['guest_name'] ) : '';
		$guardian_email = isset( $guest['guardian_email'] ) ? sanitize_email( $guest['guardian_email'] ) : '';

		if ( '' !== $guest_name && '' !== $guardian_email ) {
			$keys[] = 'child_email:' . $guest_name . '|' . strtolower( $guardian_email );
		}

		return $keys;
	}

	private function generate_token() {
		global $wpdb;

		do {
			$token = wp_generate_password( 32, false, false );
			$found = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$this->get_table_name()} WHERE invite_token = %s LIMIT 1",
					$token
				)
			);
		} while ( $found );

		return $token;
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
}
