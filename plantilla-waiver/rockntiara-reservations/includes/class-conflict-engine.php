<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Conflict_Engine {
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function sync_reservation( $reservation_id ) {
		$reservation = RNTA_Reservations_Repository::instance()->get_by_id( $reservation_id );

		if ( ! $reservation ) {
			return array(
				'conflicts' => array(),
				'window'    => null,
			);
		}

		$window = $this->build_window( $reservation );

		if ( ! $window ) {
			RNTA_Reservations_Repository::instance()->update_operational_fields(
				$reservation_id,
				array(
					'conflict_flag' => 0,
				)
			);
			RNTA_Reservations_Block_Repository::instance()->delete_by_reservation_id( $reservation_id );

			return array(
				'conflicts' => array(),
				'window'    => null,
			);
		}

		$conflicts = RNTA_Reservations_Block_Repository::instance()->get_overlaps(
			$window['start_datetime'],
			$window['end_datetime'],
			$reservation_id
		);

		RNTA_Reservations_Repository::instance()->update_operational_fields(
			$reservation_id,
			array(
				'conflict_flag' => empty( $conflicts ) ? 0 : 1,
			)
		);

		if ( $this->reservation_blocks_calendar( $reservation ) ) {
			RNTA_Reservations_Block_Repository::instance()->upsert_reservation_block(
				$reservation_id,
				$this->get_block_title( $reservation ),
				$window['block_date'],
				$window['start_datetime'],
				$window['end_datetime'],
				$this->get_block_source_status( $reservation ),
				$this->get_block_note( $reservation )
			);
		} else {
			RNTA_Reservations_Block_Repository::instance()->delete_by_reservation_id( $reservation_id );
		}

		return array(
			'conflicts' => $conflicts,
			'window'    => $window,
		);
	}

	public function refresh_all_reservation_blocks( $limit = 500 ) {
		$reservations = RNTA_Reservations_Repository::instance()->get_all( $limit );

		foreach ( $reservations as $reservation ) {
			if ( empty( $reservation['id'] ) ) {
				continue;
			}

			$this->sync_reservation( (int) $reservation['id'] );
		}
	}

	public function build_window( $reservation ) {
		$party_date = '';
		$start_time = '';

		if (
			$this->is_confirmed_style_status( $reservation['reservation_status'] ) &&
			! empty( $reservation['confirmed_party_date'] ) &&
			! empty( $reservation['confirmed_start_time'] )
		) {
			$party_date = $reservation['confirmed_party_date'];
			$start_time = $reservation['confirmed_start_time'];
		} else {
			$party_date = $reservation['requested_party_date'];
			$start_time = $reservation['requested_start_time'];
		}

		$duration = absint( $reservation['requested_duration_minutes'] );

		if ( empty( $party_date ) || empty( $start_time ) || $duration <= 0 ) {
			return null;
		}

		try {
			$event_start = new DateTimeImmutable( $party_date . ' ' . $start_time . ':00' );
		} catch ( Exception $e ) {
			return null;
		}

		$event_end = $event_start->modify( '+' . $duration . ' minutes' );
		$block_start = $event_start->modify( '-' . absint( $reservation['setup_buffer_minutes'] ) . ' minutes' );
		$block_end   = $event_end->modify( '+' . absint( $reservation['cleanup_buffer_minutes'] ) . ' minutes' );

		return array(
			'block_date'      => $party_date,
			'event_start'     => $event_start->format( 'Y-m-d H:i:s' ),
			'event_end'       => $event_end->format( 'Y-m-d H:i:s' ),
			'start_datetime'  => $block_start->format( 'Y-m-d H:i:s' ),
			'end_datetime'    => $block_end->format( 'Y-m-d H:i:s' ),
		);
	}

	public function reservation_blocks_calendar( $reservation ) {
		$status         = isset( $reservation['reservation_status'] ) ? $reservation['reservation_status'] : '';
		$payment_status = isset( $reservation['payment_status'] ) ? $reservation['payment_status'] : '';

		if ( in_array( $status, array( 'cancelled', 'declined' ), true ) ) {
			return false;
		}

		if ( $this->is_confirmed_style_status( $status ) || in_array( $payment_status, array( 'payment_verified', 'fully_paid' ), true ) ) {
			return true;
		}

		if ( $this->is_hold_candidate_status( $status ) && $this->reservation_hold_is_active( $reservation ) ) {
			return true;
		}

		return false;
	}

	public function reservation_hold_is_active( $reservation ) {
		$payment_status = isset( $reservation['payment_status'] ) ? $reservation['payment_status'] : 'pending_proof';

		if ( in_array( $payment_status, array( 'payment_verified', 'fully_paid' ), true ) ) {
			return false;
		}

		if ( empty( $reservation['created_at'] ) ) {
			return false;
		}

		$expires_at = $this->get_hold_expiration_datetime( $reservation );

		if ( ! $expires_at ) {
			return false;
		}

		try {
			$now = new DateTimeImmutable( current_time( 'mysql' ) );
		} catch ( Exception $e ) {
			return false;
		}

		return $now < $expires_at;
	}

	public function get_hold_expiration_datetime( $reservation ) {
		if ( empty( $reservation['created_at'] ) ) {
			return null;
		}

		try {
			$created = new DateTimeImmutable( $reservation['created_at'] );
		} catch ( Exception $e ) {
			return null;
		}

		return $created->modify( '+2 days' );
	}

	private function is_confirmed_style_status( $status ) {
		return in_array( $status, array( 'confirmed', 'rescheduled', 'pending_client_confirmation', 'completed' ), true );
	}

	private function is_hold_candidate_status( $status ) {
		return in_array( $status, array( 'new_request', 'awaiting_payment_review', 'pending_schedule_review' ), true );
	}

	private function get_block_title( $reservation ) {
		if ( $this->is_confirmed_style_status( $reservation['reservation_status'] ) ) {
			return $reservation['party_name'];
		}

		return sprintf( 'Temporary hold - %s', $reservation['party_name'] );
	}

	private function get_block_source_status( $reservation ) {
		if ( $this->is_confirmed_style_status( $reservation['reservation_status'] ) ) {
			return $reservation['reservation_status'];
		}

		return 'temporary_hold';
	}

	private function get_block_note( $reservation ) {
		if ( $this->is_confirmed_style_status( $reservation['reservation_status'] ) ) {
			return 'Auto-generated from confirmed reservation workflow.';
		}

		$expires_at = $this->get_hold_expiration_datetime( $reservation );
		$label      = $expires_at ? $expires_at->format( 'Y-m-d H:i:s' ) : 'unknown';

		return 'Temporary hold generated from Book Now request. Hold expires at ' . $label . ' if payment is not verified.';
	}
}
