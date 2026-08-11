<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Email_Notifications {
	private static $instance = null;
	private $last_mail_error = '';

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		add_action( 'rnta_reservation_created', array( $this, 'send_reservation_created_emails' ), 10, 2 );
		add_action( 'rnta_reservation_updated', array( $this, 'maybe_send_confirmation_email' ), 10, 4 );
		add_action( 'rnta_reservation_updated', array( $this, 'maybe_send_payment_verified_email' ), 11, 4 );
		add_action( 'rnta_reservation_updated', array( $this, 'maybe_send_rescheduled_email' ), 12, 4 );
		add_action( 'rnta_reservation_updated', array( $this, 'maybe_send_closed_email' ), 13, 4 );
	}

	public function send_reservation_created_emails( $reservation_id, $order_id ) {
		$reservation = RNTA_Reservations_Repository::instance()->get_by_id( $reservation_id );

		if ( ! $reservation || get_option( $this->get_sent_option_key( 'created', $reservation_id ) ) ) {
			return;
		}

		$host_sent     = $this->send_host_request_received_email( $reservation );
		$internal_sent = $this->send_internal_new_request_email( $reservation, $order_id );

		if ( $host_sent || $internal_sent ) {
			update_option( $this->get_sent_option_key( 'created', $reservation_id ), current_time( 'mysql' ), false );
		}
	}

	public function maybe_send_confirmation_email( $reservation_id, $before, $after, $changed_data ) {
		if ( ! $after || empty( $after['host_email'] ) ) {
			return;
		}

		$previous_status = is_array( $before ) && ! empty( $before['reservation_status'] ) ? $before['reservation_status'] : '';
		$current_status  = ! empty( $after['reservation_status'] ) ? $after['reservation_status'] : '';

		if ( 'confirmed' !== $current_status || 'confirmed' === $previous_status ) {
			return;
		}

		if ( get_option( $this->get_sent_option_key( 'confirmed', $reservation_id ) ) ) {
			return;
		}

		if ( $this->send_host_confirmed_email( $after ) ) {
			update_option( $this->get_sent_option_key( 'confirmed', $reservation_id ), current_time( 'mysql' ), false );
		}
	}

	public function maybe_send_payment_verified_email( $reservation_id, $before, $after, $changed_data ) {
		if ( ! $after || empty( $after['host_email'] ) ) {
			return;
		}

		$previous_payment = is_array( $before ) && ! empty( $before['payment_status'] ) ? $before['payment_status'] : '';
		$current_payment  = ! empty( $after['payment_status'] ) ? $after['payment_status'] : '';
		$previous_status  = is_array( $before ) && ! empty( $before['reservation_status'] ) ? $before['reservation_status'] : '';
		$current_status   = ! empty( $after['reservation_status'] ) ? $after['reservation_status'] : '';

		if ( ! in_array( $current_payment, array( 'payment_verified', 'fully_paid' ), true ) || in_array( $previous_payment, array( 'payment_verified', 'fully_paid' ), true ) ) {
			return;
		}

		if ( 'confirmed' === $current_status && 'confirmed' !== $previous_status ) {
			return;
		}

		if ( get_option( $this->get_sent_option_key( 'payment_verified', $reservation_id ) ) ) {
			return;
		}

		if ( $this->send_host_payment_verified_email( $after ) ) {
			update_option( $this->get_sent_option_key( 'payment_verified', $reservation_id ), current_time( 'mysql' ), false );
		}
	}

	public function maybe_send_rescheduled_email( $reservation_id, $before, $after, $changed_data ) {
		if ( ! $after || empty( $after['host_email'] ) ) {
			return;
		}

		$previous_status = is_array( $before ) && ! empty( $before['reservation_status'] ) ? $before['reservation_status'] : '';
		$current_status  = ! empty( $after['reservation_status'] ) ? $after['reservation_status'] : '';

		if ( 'rescheduled' !== $current_status || 'rescheduled' === $previous_status ) {
			return;
		}

		if ( get_option( $this->get_sent_option_key( 'rescheduled', $reservation_id ) ) ) {
			return;
		}

		if ( $this->send_host_rescheduled_email( $after ) ) {
			update_option( $this->get_sent_option_key( 'rescheduled', $reservation_id ), current_time( 'mysql' ), false );
		}
	}

	public function maybe_send_closed_email( $reservation_id, $before, $after, $changed_data ) {
		if ( ! $after || empty( $after['host_email'] ) ) {
			return;
		}

		$previous_status = is_array( $before ) && ! empty( $before['reservation_status'] ) ? $before['reservation_status'] : '';
		$current_status  = ! empty( $after['reservation_status'] ) ? $after['reservation_status'] : '';

		if ( ! in_array( $current_status, array( 'cancelled', 'canceled', 'declined', 'expired' ), true ) || $current_status === $previous_status ) {
			return;
		}

		if ( get_option( $this->get_sent_option_key( 'closed_' . $current_status, $reservation_id ) ) ) {
			return;
		}

		if ( $this->send_host_closed_email( $after, $current_status ) ) {
			update_option( $this->get_sent_option_key( 'closed_' . $current_status, $reservation_id ), current_time( 'mysql' ), false );
		}
	}

	private function send_host_request_received_email( $reservation ) {
		$to = sanitize_email( $reservation['host_email'] );

		if ( ! $to ) {
			return false;
		}

		$access_code = RNTA_Reservations_Repository::instance()->ensure_access_code( $reservation['id'] );
		$portal_url  = add_query_arg(
			array(
				'reservation' => $reservation['woo_order_id'],
				'pass'        => $access_code,
			),
			home_url( '/reservations/' )
		);

		$subject = sprintf(
			/* translators: %s: order number */
			__( 'Rock N Tiara reservation request #%s received', 'rockntiara-reservations' ),
			$reservation['woo_order_id']
		);

		$message = $this->wrap_email(
			__( 'We received your reservation request', 'rockntiara-reservations' ),
			$this->build_detail_rows(
				array(
					__( 'Order number', 'rockntiara-reservations' )       => '#' . $reservation['woo_order_id'],
					__( 'Party', 'rockntiara-reservations' )              => $reservation['party_name'],
					__( 'Requested date', 'rockntiara-reservations' )     => $reservation['requested_party_date'],
					__( 'Requested start time', 'rockntiara-reservations' ) => $reservation['requested_start_time'],
					__( 'Event location', 'rockntiara-reservations' )       => RNTA_RESERVATIONS_VENUE_LABEL,
					__( 'Child', 'rockntiara-reservations' )              => $reservation['child_name'],
					__( 'Guest count', 'rockntiara-reservations' )        => $reservation['guest_count'],
					__( 'Estimated celebration total', 'rockntiara-reservations' ) => '$' . number_format( (float) $reservation['estimated_total'], 2 ),
					__( 'Deposit due', 'rockntiara-reservations' )        => '$' . number_format( (float) $reservation['deposit_amount'], 2 ),
				)
			) .
			'<p>Your request is now in review. Rock N Tiara will verify payment proof, review availability, and contact you before the event is considered confirmed.</p>' .
			'<p><a class="rnta-email-btn" href="' . esc_url( $portal_url ) . '">Check reservation status</a></p>' .
			'<p>Please save your order number and access code: <strong>' . esc_html( $access_code ) . '</strong>.</p>'
		);

		return $this->send_logged_email( $to, $subject, $message, $reservation, 'host_request_received', 'automation' );
	}

	private function send_internal_new_request_email( $reservation, $order_id ) {
		$to = $this->get_internal_recipient();

		if ( ! $to ) {
			return false;
		}

		$subject = sprintf(
			/* translators: %s: order number */
			__( 'New Rock N Tiara reservation request #%s', 'rockntiara-reservations' ),
			$reservation['woo_order_id']
		);

		$admin_url = admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $reservation['id'] ) );

		$message = $this->wrap_email(
			__( 'New reservation request needs review', 'rockntiara-reservations' ),
			$this->build_detail_rows(
				array(
					__( 'Woo order', 'rockntiara-reservations' )          => '#' . $reservation['woo_order_id'],
					__( 'Host', 'rockntiara-reservations' )               => trim( $reservation['host_first_name'] . ' ' . $reservation['host_last_name'] ),
					__( 'Email', 'rockntiara-reservations' )              => $reservation['host_email'],
					__( 'Phone', 'rockntiara-reservations' )              => $reservation['host_phone'],
					__( 'Party', 'rockntiara-reservations' )              => $reservation['party_name'],
					__( 'Child', 'rockntiara-reservations' )              => $reservation['child_name'],
					__( 'Requested date/time', 'rockntiara-reservations' ) => trim( $reservation['requested_party_date'] . ' ' . $reservation['requested_start_time'] ),
					__( 'Event location', 'rockntiara-reservations' )      => RNTA_RESERVATIONS_VENUE_LABEL,
					__( 'Guest count', 'rockntiara-reservations' )        => $reservation['guest_count'],
					__( 'Estimated total', 'rockntiara-reservations' )    => '$' . number_format( (float) $reservation['estimated_total'], 2 ),
				)
			) .
			'<p><a class="rnta-email-btn" href="' . esc_url( $admin_url ) . '">Open reservation detail</a></p>'
		);

		return $this->send_logged_email( $to, $subject, $message, $reservation, 'internal_new_request', 'automation' );
	}

	private function send_host_confirmed_email( $reservation ) {
		$to = sanitize_email( $reservation['host_email'] );

		if ( ! $to ) {
			return false;
		}

		$access_code = RNTA_Reservations_Repository::instance()->ensure_access_code( $reservation['id'] );
		$portal_url  = add_query_arg(
			array(
				'reservation' => $reservation['woo_order_id'],
				'pass'        => $access_code,
			),
			home_url( '/reservations/' )
		);

		$confirmed_date = ! empty( $reservation['confirmed_party_date'] ) ? $reservation['confirmed_party_date'] : $reservation['requested_party_date'];
		$confirmed_time = ! empty( $reservation['confirmed_start_time'] ) ? $reservation['confirmed_start_time'] : $reservation['requested_start_time'];
		$final_total    = (float) $reservation['final_negotiated_total'] > 0 ? (float) $reservation['final_negotiated_total'] : (float) $reservation['estimated_total'];

		$subject = sprintf(
			/* translators: %s: order number */
			__( 'Your Rock N Tiara reservation #%s is confirmed', 'rockntiara-reservations' ),
			$reservation['woo_order_id']
		);

		$message = $this->wrap_email(
			__( 'Your celebration is confirmed', 'rockntiara-reservations' ),
			'<p>Rock N Tiara has confirmed your reservation details. Please keep this message and your order number handy.</p>' .
			$this->build_detail_rows(
				array(
					__( 'Order number', 'rockntiara-reservations' ) => '#' . $reservation['woo_order_id'],
					__( 'Party', 'rockntiara-reservations' )        => $reservation['party_name'],
					__( 'Confirmed date', 'rockntiara-reservations' ) => $confirmed_date,
					__( 'Confirmed start time', 'rockntiara-reservations' ) => $confirmed_time,
					__( 'Event location', 'rockntiara-reservations' ) => RNTA_RESERVATIONS_VENUE_LABEL,
					__( 'Child', 'rockntiara-reservations' )        => $reservation['child_name'],
					__( 'Guest count', 'rockntiara-reservations' )  => $reservation['guest_count'],
					__( 'Final/estimated total', 'rockntiara-reservations' ) => '$' . number_format( $final_total, 2 ),
				)
			) .
			'<p><a class="rnta-email-btn" href="' . esc_url( $portal_url ) . '">View reservation status</a></p>'
		);

		return $this->send_logged_email( $to, $subject, $message, $reservation, 'host_confirmed', 'automation' );
	}

	private function send_host_payment_verified_email( $reservation ) {
		$to = sanitize_email( $reservation['host_email'] );

		if ( ! $to ) {
			return false;
		}

		$subject = sprintf(
			/* translators: %s: order number */
			__( 'Rock N Tiara deposit payment reviewed for reservation #%s', 'rockntiara-reservations' ),
			$reservation['woo_order_id']
		);

		$message = $this->wrap_email(
			__( 'Your deposit payment has been reviewed', 'rockntiara-reservations' ),
			'<p>Rock N Tiara has reviewed the deposit payment information for your reservation request. The team will continue reviewing availability and final celebration details before the event is considered confirmed.</p>' .
			$this->build_detail_rows(
				array(
					__( 'Order number', 'rockntiara-reservations' ) => '#' . $reservation['woo_order_id'],
					__( 'Party', 'rockntiara-reservations' )        => $reservation['party_name'],
					__( 'Requested date', 'rockntiara-reservations' ) => $reservation['requested_party_date'],
					__( 'Requested start time', 'rockntiara-reservations' ) => $reservation['requested_start_time'],
					__( 'Event location', 'rockntiara-reservations' ) => RNTA_RESERVATIONS_VENUE_LABEL,
					__( 'Deposit', 'rockntiara-reservations' )      => '$' . number_format( (float) $reservation['deposit_amount'], 2 ),
				)
			) .
			'<p><a class="rnta-email-btn" href="' . esc_url( $this->get_portal_url( $reservation ) ) . '">Check reservation status</a></p>'
		);

		return $this->send_logged_email( $to, $subject, $message, $reservation, 'host_payment_verified', 'automation' );
	}

	private function send_host_rescheduled_email( $reservation ) {
		$to = sanitize_email( $reservation['host_email'] );

		if ( ! $to ) {
			return false;
		}

		$confirmed_date = ! empty( $reservation['confirmed_party_date'] ) ? $reservation['confirmed_party_date'] : $reservation['requested_party_date'];
		$confirmed_time = ! empty( $reservation['confirmed_start_time'] ) ? $reservation['confirmed_start_time'] : $reservation['requested_start_time'];

		$subject = sprintf(
			/* translators: %s: order number */
			__( 'Rock N Tiara reservation #%s schedule update', 'rockntiara-reservations' ),
			$reservation['woo_order_id']
		);

		$message = $this->wrap_email(
			__( 'Your reservation schedule was updated', 'rockntiara-reservations' ),
			'<p>Rock N Tiara updated the schedule information for your celebration. Please review the latest reservation details below.</p>' .
			$this->build_detail_rows(
				array(
					__( 'Order number', 'rockntiara-reservations' ) => '#' . $reservation['woo_order_id'],
					__( 'Party', 'rockntiara-reservations' )        => $reservation['party_name'],
					__( 'Updated date', 'rockntiara-reservations' ) => $confirmed_date,
					__( 'Updated start time', 'rockntiara-reservations' ) => $confirmed_time,
					__( 'Event location', 'rockntiara-reservations' ) => RNTA_RESERVATIONS_VENUE_LABEL,
					__( 'Child', 'rockntiara-reservations' )        => $reservation['child_name'],
				)
			) .
			'<p><a class="rnta-email-btn" href="' . esc_url( $this->get_portal_url( $reservation ) ) . '">View reservation status</a></p>'
		);

		return $this->send_logged_email( $to, $subject, $message, $reservation, 'host_rescheduled', 'automation' );
	}

	private function send_host_closed_email( $reservation, $status ) {
		$to = sanitize_email( $reservation['host_email'] );

		if ( ! $to ) {
			return false;
		}

		$status_label = ucwords( str_replace( '_', ' ', (string) $status ) );

		$subject = sprintf(
			/* translators: %s: order number */
			__( 'Rock N Tiara reservation #%s status update', 'rockntiara-reservations' ),
			$reservation['woo_order_id']
		);

		$message = $this->wrap_email(
			__( 'Your reservation status was updated', 'rockntiara-reservations' ),
			'<p>Rock N Tiara updated the status of your reservation request. If you have questions or need help with a new date, please contact the team directly.</p>' .
			$this->build_detail_rows(
				array(
					__( 'Order number', 'rockntiara-reservations' ) => '#' . $reservation['woo_order_id'],
					__( 'Party', 'rockntiara-reservations' )        => $reservation['party_name'],
					__( 'Status', 'rockntiara-reservations' )       => $status_label,
					__( 'Child', 'rockntiara-reservations' )        => $reservation['child_name'],
				)
			) .
			'<p><a class="rnta-email-btn" href="' . esc_url( home_url( '/contact/' ) ) . '">Contact Rock N Tiara</a></p>'
		);

		return $this->send_logged_email( $to, $subject, $message, $reservation, 'host_closed', 'automation' );
	}

	public function send_guest_invitation_email( $reservation, $guest, $trigger_source = 'manual' ) {
		$to = sanitize_email( $guest['guardian_email'] );

		if ( ! $to ) {
			return false;
		}

		$waiver_url = RNTA_Reservations_Guest_Repository::instance()->get_guest_waiver_url( $guest );
		$date       = ! empty( $reservation['confirmed_party_date'] ) ? $reservation['confirmed_party_date'] : $reservation['requested_party_date'];
		$time       = ! empty( $reservation['confirmed_start_time'] ) ? $reservation['confirmed_start_time'] : $reservation['requested_start_time'];

		$subject = sprintf(
			/* translators: %s: birthday child name */
			__( "You're invited to celebrate %s at Rock N Tiara!", 'rockntiara-reservations' ),
			$reservation['child_name']
		);

		$message = $this->wrap_invitation_email(
			__( "You're Invited!", 'rockntiara-reservations' ),
			$this->build_invitation_card(
				array(
					'invited_child'  => $guest['guest_name'],
					'birthday_child' => $reservation['child_name'],
					'party'          => $reservation['party_name'],
					'date'           => $date,
					'time'           => $time,
					'location'       => RNTA_RESERVATIONS_VENUE_LABEL,
					'waiver_url'     => $waiver_url,
				)
			)
		);

		return $this->send_logged_email( $to, $subject, $message, $reservation, 'guest_invitation', $trigger_source, $guest );
	}

	public function capture_mail_error( $error ) {
		if ( is_wp_error( $error ) ) {
			$this->last_mail_error = $error->get_error_message();
		}
	}

	private function send_logged_email( $to, $subject, $message, $reservation, $email_type, $trigger_source, $guest = null ) {
		$this->last_mail_error = '';
		add_action( 'wp_mail_failed', array( $this, 'capture_mail_error' ) );
		$sent = wp_mail( $to, $subject, $message, $this->get_headers() );
		remove_action( 'wp_mail_failed', array( $this, 'capture_mail_error' ) );

		RNTA_Reservations_Email_Log_Repository::instance()->record_attempt(
			array(
				'reservation_id' => ! empty( $reservation['id'] ) ? $reservation['id'] : 0,
				'guest_id'       => $guest && ! empty( $guest['id'] ) ? $guest['id'] : 0,
				'recipient_email' => $to,
				'email_type'     => $email_type,
				'trigger_source' => $trigger_source,
				'subject'        => $subject,
				'delivery_status' => $sent ? 'accepted' : 'failed',
				'error_message'  => $sent ? '' : ( $this->last_mail_error ? $this->last_mail_error : 'wp_mail() returned false.' ),
			)
		);

		return $sent;
	}

	private function wrap_email( $title, $body ) {
		return '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Quicksand:wght@500;600;700;800&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:#fff6fa;font-family:Quicksand,Arial,sans-serif;color:#4a2d39;">'
			. '<div style="max-width:680px;margin:0 auto;padding:24px 12px;">'
			. '<div style="overflow:hidden;background:#fffafc;border:1px solid #efb7ca;border-radius:28px;box-shadow:0 18px 40px rgba(206,76,128,.12);">'
			. '<div style="height:8px;background:linear-gradient(90deg,#f4a9c2 0%,#f8d8a7 35%,#ef7ead 65%,#f4a9c2 100%);font-size:0;line-height:0;">&nbsp;</div>'
			. '<div class="rnta-email-inner" style="padding:28px 26px 24px;background:radial-gradient(circle at 8% 4%,rgba(244,169,194,.18) 0,rgba(244,169,194,0) 22%),radial-gradient(circle at 94% 10%,rgba(248,216,167,.22) 0,rgba(248,216,167,0) 20%),linear-gradient(180deg,#fffafc 0%,#fff6fa 100%);">'
			. '<p style="margin:0 0 8px;color:#bc6685;font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;">Rock N Tiara Kids Spa</p>'
			. '<h1 class="rnta-email-title" style="margin:0 0 18px;color:#df4f88;font-size:44px;line-height:1;font-weight:400;font-family:\'Great Vibes\',Georgia,\'Times New Roman\',cursive;">' . esc_html( $title ) . '</h1>'
			. wp_kses_post( $body )
			. '</div></div>'
			. '<p style="font-size:12px;color:#8b6675;margin:18px 0 0;text-align:center;">' . esc_html( RNTA_RESERVATIONS_VENUE_LABEL ) . '</p>'
			. '<style>p{color:#765564;font:600 14px/1.65 Quicksand,Arial,sans-serif}.rnta-email-btn{display:inline-block;background:#ed4f8f;color:#fff!important;text-decoration:none;border:1px solid #d9437d;border-radius:999px;padding:13px 22px;font-weight:800;letter-spacing:.04em;box-shadow:0 8px 16px rgba(217,67,125,.20)}.rnta-email-table{width:100%;border-collapse:collapse;margin:18px 0;background:rgba(255,255,255,.62);border-top:1px solid #efd1dc;border-bottom:1px solid #efd1dc}.rnta-email-table td{border-bottom:1px solid #f7dbe5;padding:11px 0;font-size:14px;vertical-align:top}.rnta-email-table tr:last-child td{border-bottom:0}.rnta-email-table td:first-child{color:#9a7182;font-weight:700;padding-right:14px}.rnta-email-table td:last-child{text-align:right;font-weight:800;color:#4a2d39}@media only screen and (max-width:480px){.rnta-email-inner{padding:22px 16px 20px!important}.rnta-email-title{font-size:39px!important}.rnta-email-table td{display:block!important;width:100%!important;text-align:left!important;padding:7px 0!important}.rnta-email-table td:first-child{padding-bottom:0!important}.rnta-email-btn{display:block!important;text-align:center!important}}</style>'
			. '</div></body></html>';
	}

	private function wrap_invitation_email( $title, $body ) {
		return '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:#fff8fb;font-family:Arial,sans-serif;color:#5a3a49;">'
			. '<div style="max-width:680px;margin:0 auto;padding:16px 10px;">'
			. '<div class="rnta-invitation" style="overflow:hidden;background:#fffafc;border:1px solid #efb7ca;border-radius:28px;box-shadow:0 18px 40px rgba(206,76,128,.12);">'
			. '<div style="height:9px;background:linear-gradient(90deg,#f4a9c2 0%,#f8d8a7 35%,#ef7ead 65%,#f4a9c2 100%);font-size:0;line-height:0;">&nbsp;</div>'
			. '<div class="rnta-invitation-inner" style="padding:24px 24px 22px;text-align:center;background:radial-gradient(circle at 10% 8%,rgba(244,169,194,.20) 0,rgba(244,169,194,0) 22%),radial-gradient(circle at 92% 16%,rgba(248,216,167,.24) 0,rgba(248,216,167,0) 20%),linear-gradient(180deg,#fffafc 0%,#fff4f8 100%);">'
			. '<div style="color:#d59a45;font-size:20px;line-height:1;margin-bottom:8px;">&#9825; &nbsp; &#9813; &nbsp; &#9825;</div>'
			. '<p style="margin:0 0 8px;color:#bc6685;font-size:11px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;">A Rock N Tiara Celebration</p>'
			. '<h1 class="rnta-invitation-title" style="margin:0;text-align:center;color:#df4f88;font-size:48px;line-height:1.1;font-weight:400;font-family:\'Great Vibes\', Georgia, \'Times New Roman\', cursive;">' . esc_html( $title ) . '</h1>'
			. '<div style="width:58px;height:1px;background:#deb16b;margin:12px auto 18px;font-size:0;line-height:0;">&nbsp;</div>'
			. $body
			. '<div style="margin-top:22px;color:#d59a45;font-size:14px;letter-spacing:.25em;">&#9825; &#10022; &#9825;</div>'
			. '<p style="font-size:11px;color:#987383;margin:12px 0 0;line-height:1.5;">' . esc_html( RNTA_RESERVATIONS_VENUE_LABEL ) . '</p>'
			. '</div></div>'
			. '<style>@media only screen and (max-width:480px){.rnta-invitation-inner{padding:20px 14px 18px!important}.rnta-invitation-title{font-size:41px!important}.rnta-party-name{font-size:41px!important}.rnta-details td{display:block!important;width:100%!important;padding:6px 0!important;border-right:0!important}.rnta-email-btn{display:block!important;min-width:0!important;width:auto!important}}</style>'
			. '</div></body></html>';
	}

	private function build_invitation_card( $data ) {
		$waiver_url  = ! empty( $data['waiver_url'] ) ? esc_url( $data['waiver_url'] ) : '#';
		$display_date = $data['date'];
		$display_time = $data['time'];
		$location     = $data['location'];
		$venue_name   = $location;
		$venue_address = '';

		$date_object = DateTimeImmutable::createFromFormat( '!Y-m-d', (string) $data['date'] );
		if ( $date_object ) {
			$display_date = $date_object->format( 'l, F j, Y' );
		}

		foreach ( array( '!H:i:s', '!H:i' ) as $time_format ) {
			$time_object = DateTimeImmutable::createFromFormat( $time_format, (string) $data['time'] );
			if ( $time_object ) {
				$display_time = $time_object->format( 'g:i A' );
				break;
			}
		}

		$location_parts = explode( ' - ', (string) $location, 2 );
		if ( 2 === count( $location_parts ) ) {
			$venue_name    = $location_parts[0];
			$venue_address = $location_parts[1];
		}

		return
			'<p style="margin:0 0 8px;color:#704c5c;font-size:16px;line-height:1.6;">Dear <strong style="color:#d94e86;">' . esc_html( $data['invited_child'] ) . '</strong>,</p>' .
			'<p style="margin:0;color:#765564;font-size:15px;line-height:1.65;">Put on your brightest smile and join us to celebrate</p>' .
			'<div class="rnta-party-name" style="margin:8px 0 2px;color:#d94682;font-size:48px;line-height:1.05;font-family:\'Great Vibes\', Georgia, \'Times New Roman\', cursive;">' . esc_html( $data['birthday_child'] ) . '</div>' .
			'<p style="margin:0 0 18px;color:#a45b77;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">for a magical birthday celebration</p>' .
			'<table class="rnta-details" role="presentation" width="100%" style="width:100%;border-collapse:collapse;border-top:1px solid #efd1dc;border-bottom:1px solid #efd1dc;background:rgba(255,255,255,.52);">' .
				'<tr>' .
					'<td width="50%" valign="top" style="width:50%;padding:16px 12px;border-right:1px solid #efd1dc;text-align:center;">' .
						'<div style="margin-bottom:5px;color:#c27894;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">When</div>' .
						'<div style="color:#5b3949;font-family:Georgia,\'Times New Roman\',serif;font-size:16px;font-weight:700;line-height:1.45;">' . esc_html( $display_date ) . '</div>' .
						'<div style="color:#a45b77;font-size:14px;line-height:1.5;">at ' . esc_html( $display_time ) . '</div>' .
					'</td>' .
					'<td width="50%" valign="top" style="width:50%;padding:16px 12px;text-align:center;">' .
						'<div style="margin-bottom:5px;color:#c27894;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">The Celebration</div>' .
						'<div style="color:#5b3949;font-family:Georgia,\'Times New Roman\',serif;font-size:16px;font-weight:700;line-height:1.45;">' . esc_html( $data['party'] ) . '</div>' .
						'<div style="color:#a45b77;font-size:14px;line-height:1.5;">Party</div>' .
					'</td>' .
				'</tr>' .
			'</table>' .
			'<div style="padding:16px 8px 0;text-align:center;">' .
				'<div style="margin-bottom:5px;color:#c27894;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">Where</div>' .
				'<div style="color:#5b3949;font-family:Georgia,\'Times New Roman\',serif;font-size:16px;font-weight:700;line-height:1.45;">' . esc_html( $venue_name ) . '</div>' .
				( $venue_address ? '<div style="color:#876675;font-size:13px;line-height:1.55;">' . esc_html( $venue_address ) . '</div>' : '' ) .
			'</div>' .
			'<p style="margin:18px auto 0;max-width:500px;color:#795867;font-size:13px;line-height:1.65;">We would love to celebrate with you. To accept this invitation, please complete the required parent or guardian waiver.</p>' .
			'<table role="presentation" width="100%" style="margin:16px 0 0;border-collapse:collapse;"><tr><td align="center"><a class="rnta-email-btn" href="' . esc_url( $waiver_url ) . '" style="display:inline-block;background:#e9528d;color:#ffffff !important;text-decoration:none;border:1px solid #d9437d;border-radius:999px;padding:14px 25px;font-size:14px;font-weight:700;letter-spacing:.03em;box-shadow:0 8px 16px rgba(217,67,125,.20);min-width:220px;text-align:center;">I accept the invitation</a></td></tr></table>' .
			'<p style="margin:13px 0 0;color:#9a7a88;font-size:11px;line-height:1.55;">This invitation is reserved for ' . esc_html( $data['invited_child'] ) . '. Please do not forward it.</p>';
	}

	private function build_detail_rows( $rows ) {
		$html = '<table class="rnta-email-table" role="presentation">';

		foreach ( $rows as $label => $value ) {
			if ( '' === (string) $value ) {
				$value = 'Pending';
			}

			$html .= '<tr><td>' . esc_html( $label ) . '</td><td>' . esc_html( $value ) . '</td></tr>';
		}

		$html .= '</table>';

		return $html;
	}

	private function get_headers() {
		return array(
			'Content-Type: text/html; charset=UTF-8',
		);
	}

	private function get_internal_recipient() {
		$default_recipient = get_option( 'admin_email' );
		$recipient         = apply_filters( 'rnta_internal_notification_email', $default_recipient ? $default_recipient : 'info@rockntiarakidsspa.com' );

		return sanitize_email( $recipient );
	}

	private function get_sent_option_key( $type, $reservation_id ) {
		return 'rnta_email_sent_' . sanitize_key( $type ) . '_' . absint( $reservation_id );
	}

	private function get_portal_url( $reservation ) {
		$access_code = RNTA_Reservations_Repository::instance()->ensure_access_code( $reservation['id'] );

		return add_query_arg(
			array(
				'reservation' => $reservation['woo_order_id'],
				'pass'        => $access_code,
			),
			home_url( '/reservations/' )
		);
	}
}
