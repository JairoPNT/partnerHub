<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_WooCommerce_Sync {
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		add_action( 'woocommerce_checkout_order_processed', array( $this, 'sync_checkout_order' ), 20, 3 );
		add_action( 'woocommerce_thankyou', array( $this, 'sync_order_from_thankyou' ), 20, 1 );
	}

	public function sync_checkout_order( $order_id, $posted_data, $order ) {
		if ( $order instanceof WC_Order ) {
			$this->sync_order( $order );
		}
	}

	public function sync_order_from_thankyou( $order_id ) {
		if ( ! function_exists( 'wc_get_order' ) ) {
			return;
		}

		$order = wc_get_order( $order_id );
		if ( $order ) {
			$this->sync_order( $order );
		}
	}

	public function sync_all_existing_orders() {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return 0;
		}

		$orders = wc_get_orders(
			array(
				'limit'   => -1,
				'orderby' => 'date',
				'order'   => 'DESC',
				'return'  => 'objects',
			)
		);

		$count = 0;

		foreach ( $orders as $order ) {
			if ( $this->is_reservation_order( $order ) ) {
				$this->sync_order( $order );
				$count++;
			}
		}

		return $count;
	}

	private function is_reservation_order( $order ) {
		return (bool) $order->get_meta( '_rnta_party_name' );
	}

	public function sync_order( $order ) {
		if ( ! $order instanceof WC_Order || ! $this->is_reservation_order( $order ) ) {
			return 0;
		}

		$existing_reservation = RNTA_Reservations_Repository::instance()->get_by_order_id( $order->get_id() );

		$party_id          = absint( $order->get_meta( '_rnta_party_id' ) );
		$party_name        = (string) $order->get_meta( '_rnta_party_name' );
		$guest_count       = absint( $order->get_meta( '_rnta_guest_count' ) );
		$extra_guest_count = absint( $order->get_meta( '_rnta_extra_guest_count' ) );
		$estimated_total   = (float) $order->get_meta( '_rnta_estimated_total' );
		$preferred_date    = (string) $order->get_meta( '_rnta_preferred_party_date' );
		$preferred_time    = (string) $order->get_meta( '_rnta_preferred_party_time' );
		$child_name        = (string) $order->get_meta( '_rnta_child_name' );
		$child_age         = (string) $order->get_meta( '_rnta_child_age' );
		$host_phone        = (string) $order->get_meta( '_rnta_host_phone' );
		$reservation_notes = (string) $order->get_meta( '_rnta_reservation_notes' );
		$selected_addons   = (string) $order->get_meta( '_rnta_selected_addons' );

		$addons_array = array();
		if ( $selected_addons ) {
			$decoded = json_decode( $selected_addons, true );
			if ( is_array( $decoded ) ) {
				$addons_array = $decoded;
			}
		}

		$duration_minutes = 120;
		$included_guests  = $party_id ? absint( get_post_meta( $party_id, '_rnta_included_guests', true ) ) : 0;

		$data = array(
			'woo_order_id'               => $order->get_id(),
			'order_status_snapshot'      => $order->get_status(),
			'payment_method'             => $order->get_payment_method(),
			'payment_review_status'      => $order->needs_payment() ? 'awaiting_payment' : 'payment_recorded',
			'payment_status'             => 'pending_proof',
			'payment_verified_at'        => null,
			'payment_verified_by'        => 0,
			'payment_review_notes'       => '',
			'party_post_id'              => $party_id,
			'party_name'                 => $party_name,
			'party_slug'                 => $party_id ? get_post_field( 'post_name', $party_id ) : sanitize_title( $party_name ),
			'host_first_name'            => $order->get_billing_first_name(),
			'host_last_name'             => $order->get_billing_last_name(),
			'host_email'                 => $order->get_billing_email(),
			'host_phone'                 => $host_phone ? $host_phone : $order->get_billing_phone(),
			'child_name'                 => $child_name,
			'child_age'                  => $child_age,
			'guest_count'                => $guest_count,
			'included_guests'            => $included_guests,
			'extra_guest_count'          => $extra_guest_count,
			'requested_party_date'       => $preferred_date,
			'requested_start_time'       => $preferred_time,
			'requested_end_time'         => '',
			'requested_duration_minutes' => $duration_minutes,
			'setup_buffer_minutes'       => 0,
			'cleanup_buffer_minutes'     => 30,
			'confirmed_party_date'       => null,
			'confirmed_start_time'       => '',
			'confirmed_end_time'         => '',
			'estimated_total'            => $estimated_total,
			'final_negotiated_total'     => 0,
			'deposit_amount'             => (float) $order->get_total(),
			'addons_json'                => $addons_array,
			'reservation_notes'          => $reservation_notes,
			'internal_notes'             => '',
			'reservation_status'         => 'pending_schedule_review',
			'assigned_staff_user_id'     => 0,
			'conflict_flag'              => 0,
		);

		$reservation_id = RNTA_Reservations_Repository::instance()->upsert_from_order_data( $data );

		if ( $reservation_id ) {
			RNTA_Reservations_Conflict_Engine::instance()->sync_reservation( $reservation_id );

			if ( ! $existing_reservation ) {
				do_action( 'rnta_reservation_created', $reservation_id, $order->get_id() );
			}
		}

		return $reservation_id;
	}

	private function parse_duration_to_minutes( $party_id ) {
		if ( ! $party_id ) {
			return 0;
		}

		$duration = (string) get_post_meta( $party_id, '_rnta_duration', true );
		if ( preg_match( '/(\d+)\s*hour/i', $duration, $matches ) ) {
			return absint( $matches[1] ) * 60;
		}

		if ( preg_match( '/(\d+)\s*min/i', $duration, $matches ) ) {
			return absint( $matches[1] );
		}

		return 0;
	}

	public function sync_order_status_from_reservation( $reservation_id ) {
		$reservation = RNTA_Reservations_Repository::instance()->get_by_id( $reservation_id );
		if ( ! $reservation || empty( $reservation['order_id'] ) ) {
			return false;
		}

		$order = wc_get_order( $reservation['order_id'] );
		if ( ! $order ) {
			return false;
		}

		$reservation_status = isset( $reservation['reservation_status'] ) ? $reservation['reservation_status'] : '';
		$payment_status     = isset( $reservation['payment_status'] ) ? $reservation['payment_status'] : '';

		if ( 'completed' === $reservation_status || 'fully_paid' === $payment_status ) {
			if ( ! $order->has_status( 'completed' ) ) {
				$order->update_status( 'completed', __( 'Order status updated to completed via RT Reservations status update.', 'rockntiara-reservations' ) );
				return true;
			}
		} elseif ( 'cancelled' === $reservation_status || 'declined' === $reservation_status ) {
			if ( ! $order->has_status( array( 'cancelled', 'failed', 'refunded' ) ) ) {
				$order->update_status( 'cancelled', __( 'Order status cancelled via RT Reservations status update.', 'rockntiara-reservations' ) );
				return true;
			}
		}

		return false;
	}
}
