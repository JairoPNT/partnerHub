<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Waiver_Portal {
	const WAIVER_TEXT_VERSION = 'legal-mvp-2026-07-18-r2';

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		add_shortcode( 'rnta_reservation_waiver', array( $this, 'render_shortcode' ) );
		add_shortcode( 'rnta_manual_waiver', array( $this, 'render_manual_shortcode' ) );
		add_shortcode( 'rnta_signed_waivers', array( $this, 'render_signed_waivers_shortcode' ) );
		add_shortcode( 'rnta_waiver_terms', array( $this, 'render_terms_shortcode' ) );
		add_action( 'wp_footer', array( $this, 'print_assets' ), 101 );
	}

	public function render_terms_shortcode() {
		ob_start();
		$this->print_assets();
		?>
		<div class="rnta-waiver rnta-waiver--terms" id="waivers">
			<?php echo $this->render_waiver_legal_notice(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</div>
		<?php
		return ob_get_clean();
	}

	public function render_signed_waivers_shortcode() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return '<p class="rnta-waiver__message rnta-waiver__message--error">' . esc_html__( 'You must be logged in as an administrator or staff member to view signed waivers.', 'rockntiara-reservations' ) . '</p>';
		}

		ob_start();
		RNTA_Reservations_Admin_Menu::instance()->render_waivers_page();
		return ob_get_clean();
	}

	public function render_shortcode( $atts = array() ) {
		$atts = shortcode_atts( array( 'mode' => 'standard' ), $atts, 'rnta_reservation_waiver' );
		if ( ( isset( $atts['mode'] ) && 'manual' === $atts['mode'] ) || isset( $_GET['manual'] ) ) {
			return $this->render_manual_shortcode( $atts );
		}

		$lookup_number = isset( $_GET['reservation'] ) ? absint( wp_unslash( $_GET['reservation'] ) ) : 0;
		$access_code   = isset( $_GET['pass'] ) ? sanitize_text_field( wp_unslash( $_GET['pass'] ) ) : '';
		$guest_token   = isset( $_GET['guest'] ) ? sanitize_text_field( wp_unslash( $_GET['guest'] ) ) : '';
		$reservation   = null;
		$waiver        = null;
		$guest         = null;
		$error         = '';
		$success       = '';

		if ( 'POST' === strtoupper( $_SERVER['REQUEST_METHOD'] ) && isset( $_POST['rnta_submit_waiver'] ) ) {
			$result        = $this->handle_submission();
			$error         = $result['error'];
			$success       = $result['success'];
			$reservation   = $result['reservation'];
			$guest         = $result['guest'];
			$lookup_number = $reservation ? absint( $reservation['woo_order_id'] ) : $lookup_number;
			$access_code   = isset( $_POST['access_code'] ) ? sanitize_text_field( wp_unslash( $_POST['access_code'] ) ) : $access_code;
			$guest_token   = isset( $_POST['guest_token'] ) ? sanitize_text_field( wp_unslash( $_POST['guest_token'] ) ) : $guest_token;
		} elseif ( $guest_token ) {
			$guest = RNTA_Reservations_Guest_Repository::instance()->get_by_token( $guest_token );
			if ( $guest ) {
				$reservation = RNTA_Reservations_Repository::instance()->get_by_id( $guest['reservation_id'] );
			}
			if ( ! $guest || ! $reservation ) {
				$error = __( 'We could not find this guest waiver link.', 'rockntiara-reservations' );
			}
		} elseif ( $lookup_number && $access_code ) {
			$reservation = RNTA_Reservations_Repository::instance()->get_by_lookup_credentials( $lookup_number, $access_code );
			if ( ! $reservation ) {
				$error = __( 'We could not find a reservation with that number and access code.', 'rockntiara-reservations' );
			}
		}

		if ( $reservation ) {
			$waiver = RNTA_Reservations_Waiver_Repository::instance()->get_by_reservation_id( $reservation['id'] );
		}

		ob_start();
		?>
		<div class="rnta-waiver">
			<div class="rnta-waiver__intro">
				<?php if ( $reservation && $guest ) : ?>
					<span class="rnta-waiver__eyebrow"><?php esc_html_e( 'Birthday Invitation', 'rockntiara-reservations' ); ?></span>
					<h3 class="rnta-waiver__title">
						<?php
						echo esc_html(
							sprintf(
								/* translators: %s: birthday child name */
								__( 'Accept the invitation to celebrate %s', 'rockntiara-reservations' ),
								$reservation['child_name']
							)
						);
						?>
					</h3>
					<p class="rnta-waiver__copy">
						<?php
						echo esc_html(
							sprintf(
								/* translators: %s: invited child name */
								__( 'Please confirm the invited child details and accept the waiver terms so %s can attend the celebration.', 'rockntiara-reservations' ),
								$guest['guest_name']
							)
						);
						?>
					</p>
				<?php else : ?>
					<span class="rnta-waiver__eyebrow"><?php esc_html_e( 'Waiver', 'rockntiara-reservations' ); ?></span>
					<h3 class="rnta-waiver__title"><?php esc_html_e( 'Complete your party waiver', 'rockntiara-reservations' ); ?></h3>
					<p class="rnta-waiver__copy"><?php esc_html_e( 'Use your reservation number and access code to review the celebration details and submit the parent or guardian waiver.', 'rockntiara-reservations' ); ?></p>
				<?php endif; ?>
			</div>

			<?php if ( $error ) : ?>
				<div class="rnta-waiver__message rnta-waiver__message--error"><?php echo esc_html( $error ); ?></div>
			<?php endif; ?>

			<?php if ( $success ) : ?>
				<div class="rnta-waiver__message rnta-waiver__message--success"><?php echo esc_html( $success ); ?></div>
			<?php endif; ?>

			<?php if ( $reservation && $guest && 'signed' === $guest['waiver_status'] ) : ?>
				<?php echo $this->render_guest_received_state( $reservation, $guest ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<?php elseif ( $reservation && $waiver && ! $guest ) : ?>
				<?php echo $this->render_received_state( $reservation, $waiver ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<?php elseif ( $reservation ) : ?>
				<?php echo $this->render_waiver_form( $reservation, $lookup_number, $access_code, $guest ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<?php else : ?>
				<?php echo $this->render_lookup_form( $lookup_number, $access_code ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<?php endif; ?>
		</div>
		<?php

		return ob_get_clean();
	}

	public function render_manual_shortcode( $atts = array() ) {
		$error       = '';
		$success     = '';
		$reservation = null;
		$waiver      = null;

		if ( 'POST' === strtoupper( $_SERVER['REQUEST_METHOD'] ) && isset( $_POST['rnta_submit_manual_waiver'] ) ) {
			$result      = $this->handle_manual_submission();
			$error       = $result['error'];
			$success     = $result['success'];
			$reservation = $result['reservation'];
			$waiver      = $result['waiver'];
		}

		$prefill = array(
			'host_name'  => isset( $_GET['host_name'] ) ? sanitize_text_field( wp_unslash( $_GET['host_name'] ) ) : ( isset( $_GET['host'] ) ? sanitize_text_field( wp_unslash( $_GET['host'] ) ) : '' ),
			'host_email' => isset( $_GET['host_email'] ) ? sanitize_email( wp_unslash( $_GET['host_email'] ) ) : ( isset( $_GET['email'] ) ? sanitize_email( wp_unslash( $_GET['email'] ) ) : '' ),
			'host_phone' => isset( $_GET['host_phone'] ) ? sanitize_text_field( wp_unslash( $_GET['host_phone'] ) ) : ( isset( $_GET['phone'] ) ? sanitize_text_field( wp_unslash( $_GET['phone'] ) ) : '' ),
			'child_name' => isset( $_GET['child_name'] ) ? sanitize_text_field( wp_unslash( $_GET['child_name'] ) ) : ( isset( $_GET['child'] ) ? sanitize_text_field( wp_unslash( $_GET['child'] ) ) : '' ),
			'child_age'  => isset( $_GET['child_age'] ) ? sanitize_text_field( wp_unslash( $_GET['child_age'] ) ) : ( isset( $_GET['age'] ) ? sanitize_text_field( wp_unslash( $_GET['age'] ) ) : '' ),
			'party_name' => isset( $_GET['party_name'] ) ? sanitize_text_field( wp_unslash( $_GET['party_name'] ) ) : ( isset( $_GET['party'] ) ? sanitize_text_field( wp_unslash( $_GET['party'] ) ) : '' ),
			'party_date' => isset( $_GET['party_date'] ) ? sanitize_text_field( wp_unslash( $_GET['party_date'] ) ) : ( isset( $_GET['date'] ) ? sanitize_text_field( wp_unslash( $_GET['date'] ) ) : '' ),
			'party_time' => isset( $_GET['party_time'] ) ? sanitize_text_field( wp_unslash( $_GET['party_time'] ) ) : ( isset( $_GET['time'] ) ? sanitize_text_field( wp_unslash( $_GET['time'] ) ) : '' ),
		);

		ob_start();
		?>
		<div class="rnta-waiver rnta-waiver--manual">
			<div class="rnta-waiver__intro">
				<span class="rnta-waiver__eyebrow"><?php esc_html_e( 'Manual Waiver', 'rockntiara-reservations' ); ?></span>
				<h3 class="rnta-waiver__title"><?php esc_html_e( 'Complete party waiver', 'rockntiara-reservations' ); ?></h3>
				<p class="rnta-waiver__copy"><?php esc_html_e( 'Please fill out the party celebration information and complete the legal waiver consent below.', 'rockntiara-reservations' ); ?></p>
			</div>

			<?php if ( $error ) : ?>
				<div class="rnta-waiver__message rnta-waiver__message--error"><?php echo esc_html( $error ); ?></div>
			<?php endif; ?>

			<?php if ( $success ) : ?>
				<div class="rnta-waiver__message rnta-waiver__message--success"><?php echo esc_html( $success ); ?></div>
			<?php endif; ?>

			<?php if ( $reservation && $waiver ) : ?>
				<?php echo $this->render_received_state( $reservation, $waiver ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<?php else : ?>
				<?php echo $this->render_manual_waiver_form( $prefill ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<?php endif; ?>
		</div>
		<?php

		return ob_get_clean();
	}

	private function handle_manual_submission() {
		$result = array(
			'error'       => '',
			'success'     => '',
			'reservation' => null,
			'waiver'      => null,
		);

		if ( empty( $_POST['rnta_manual_waiver_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rnta_manual_waiver_nonce'] ) ), 'rnta_submit_manual_waiver' ) ) {
			$result['error'] = __( 'Security check failed. Please refresh the page and try again.', 'rockntiara-reservations' );
			return $result;
		}

		$host_name           = isset( $_POST['host_name'] ) ? sanitize_text_field( wp_unslash( $_POST['host_name'] ) ) : '';
		$host_email          = isset( $_POST['host_email'] ) ? sanitize_email( wp_unslash( $_POST['host_email'] ) ) : '';
		$host_phone          = isset( $_POST['host_phone'] ) ? sanitize_text_field( wp_unslash( $_POST['host_phone'] ) ) : '';
		$child_name          = isset( $_POST['child_name'] ) ? sanitize_text_field( wp_unslash( $_POST['child_name'] ) ) : '';
		$child_age           = isset( $_POST['child_age'] ) ? sanitize_text_field( wp_unslash( $_POST['child_age'] ) ) : '';
		$party_name          = isset( $_POST['party_name'] ) ? sanitize_text_field( wp_unslash( $_POST['party_name'] ) ) : '';
		$party_date          = isset( $_POST['party_date'] ) ? sanitize_text_field( wp_unslash( $_POST['party_date'] ) ) : '';
		$party_time          = isset( $_POST['party_time'] ) ? sanitize_text_field( wp_unslash( $_POST['party_time'] ) ) : '';

		$signer_name         = isset( $_POST['signer_name'] ) ? sanitize_text_field( wp_unslash( $_POST['signer_name'] ) ) : '';
		$signer_relationship = isset( $_POST['signer_relationship'] ) ? sanitize_text_field( wp_unslash( $_POST['signer_relationship'] ) ) : '';
		$typed_signature     = isset( $_POST['typed_signature'] ) ? sanitize_text_field( wp_unslash( $_POST['typed_signature'] ) ) : '';
		$drawn_signature     = isset( $_POST['drawn_signature'] ) ? trim( (string) wp_unslash( $_POST['drawn_signature'] ) ) : '';
		$accepted_terms      = ! empty( $_POST['accepted_terms'] );

		if ( '' === $host_name || '' === $host_email || '' === $child_name || '' === $party_name || '' === $party_date ) {
			$result['error'] = __( 'Please complete all party details (host name, email, child name, party package, and party date).', 'rockntiara-reservations' );
			return $result;
		}

		if ( '' === $signer_name || '' === $signer_relationship || '' === $typed_signature || ! $this->is_valid_signature_data_url( $drawn_signature ) || ! $accepted_terms ) {
			$result['error'] = __( 'Please complete the signer name, relationship, typed signature, hand-drawn signature, and acceptance checkbox.', 'rockntiara-reservations' );
			return $result;
		}

		$manual_reservation_data = array(
			'host_name'  => $host_name,
			'host_email' => $host_email,
			'host_phone' => $host_phone,
			'child_name' => $child_name,
			'child_age'  => $child_age,
			'party_name' => $party_name,
			'party_date' => $party_date,
			'party_time' => $party_time,
		);

		$reservation = RNTA_Reservations_Repository::instance()->create_manual_reservation( $manual_reservation_data );

		if ( ! $reservation ) {
			$result['error'] = __( 'Could not create reservation record. Please try again.', 'rockntiara-reservations' );
			return $result;
		}

		$ip_address = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';

		$waiver_data = array(
			'child_name'           => $child_name,
			'signer_name'          => $signer_name,
			'signer_relationship'  => $signer_relationship,
			'guest_birthdate'      => '',
			'guest_age'            => (int) $child_age,
			'accepted_terms'       => $accepted_terms,
			'typed_signature'      => $typed_signature,
			'drawn_signature'      => $drawn_signature,
			'waiver_text_version'  => self::WAIVER_TEXT_VERSION,
			'waiver_text_snapshot' => $this->get_waiver_terms_text(),
			'ip_address'           => $ip_address,
			'user_agent'           => $user_agent,
		);

		$saved = RNTA_Reservations_Waiver_Repository::instance()->save_from_form( $reservation, $waiver_data );

		if ( ! $saved ) {
			$result['error'] = __( 'We could not save the waiver. Please try again or contact Rock N Tiara.', 'rockntiara-reservations' );
			return $result;
		}

		$pdf_generator = new RNTA_Reservations_Waiver_PDF();
		$pdf_result    = $pdf_generator->generate( $reservation, $waiver_data );

		if ( is_wp_error( $pdf_result ) ) {
			error_log( 'Rock N Tiara manual waiver PDF generation failed: ' . $pdf_result->get_error_message() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		} else {
			RNTA_Reservations_Waiver_Repository::instance()->attach_pdf( $reservation['id'], $pdf_result['relative_path'], $pdf_result['hash'] );
		}

		$waiver = RNTA_Reservations_Waiver_Repository::instance()->get_by_reservation_id( $reservation['id'] );

		$result['reservation'] = $reservation;
		$result['waiver']      = $waiver;
		$result['success']     = __( 'Thank you. Your party waiver has been received successfully.', 'rockntiara-reservations' );

		return $result;
	}

	private function render_manual_waiver_form( $prefill = array() ) {
		$host_name  = isset( $prefill['host_name'] ) ? $prefill['host_name'] : '';
		$host_email = isset( $prefill['host_email'] ) ? $prefill['host_email'] : '';
		$host_phone = isset( $prefill['host_phone'] ) ? $prefill['host_phone'] : '';
		$child_name = isset( $prefill['child_name'] ) ? $prefill['child_name'] : '';
		$child_age  = isset( $prefill['child_age'] ) ? $prefill['child_age'] : '';
		$party_name = isset( $prefill['party_name'] ) ? $prefill['party_name'] : 'Glitz & Glam Party';
		$party_date = isset( $prefill['party_date'] ) ? $prefill['party_date'] : '';
		$party_time = isset( $prefill['party_time'] ) ? $prefill['party_time'] : '14:00';
		$signer     = $host_name;

		$packages = array(
			'Glitz & Glam Party',
			'Artzy Spa Party',
			'Rockstar Glam Party',
			'Slime & Glow Party',
			'Fiesta Personalizada / Otra',
		);

		ob_start();
		?>
		<form method="post" class="rnta-waiver__card rnta-waiver__form rnta-waiver__form--manual">
			<?php wp_nonce_field( 'rnta_submit_manual_waiver', 'rnta_manual_waiver_nonce' ); ?>
			<input type="hidden" name="rnta_submit_manual_waiver" value="1">

			<h4 class="rnta-waiver__section-heading"><?php esc_html_e( '1. Party & Celebration Details', 'rockntiara-reservations' ); ?></h4>

			<div class="rnta-waiver__field">
				<label for="rnta-manual-host-name"><?php esc_html_e( 'Host full name (Parent / Sponsor)', 'rockntiara-reservations' ); ?></label>
				<input type="text" name="host_name" id="rnta-manual-host-name" value="<?php echo esc_attr( $host_name ); ?>" placeholder="<?php esc_attr_e( 'First & Last Name', 'rockntiara-reservations' ); ?>" required>
			</div>

			<div class="rnta-waiver__field">
				<label for="rnta-manual-host-email"><?php esc_html_e( 'Host email address', 'rockntiara-reservations' ); ?></label>
				<input type="email" name="host_email" id="rnta-manual-host-email" value="<?php echo esc_attr( $host_email ); ?>" placeholder="email@example.com" required>
			</div>

			<div class="rnta-waiver__field">
				<label for="rnta-manual-host-phone"><?php esc_html_e( 'Phone number', 'rockntiara-reservations' ); ?></label>
				<input type="tel" name="host_phone" id="rnta-manual-host-phone" value="<?php echo esc_attr( $host_phone ); ?>" placeholder="(555) 000-0000">
			</div>

			<div class="rnta-waiver__field">
				<label for="rnta-manual-child-name"><?php esc_html_e( 'Birthday child name', 'rockntiara-reservations' ); ?></label>
				<input type="text" name="child_name" id="rnta-manual-child-name" value="<?php echo esc_attr( $child_name ); ?>" placeholder="<?php esc_attr_e( 'Child full name', 'rockntiara-reservations' ); ?>" required>
			</div>

			<div class="rnta-waiver__field">
				<label for="rnta-manual-child-age"><?php esc_html_e( 'Birthday child age', 'rockntiara-reservations' ); ?></label>
				<input type="number" name="child_age" id="rnta-manual-child-age" value="<?php echo esc_attr( $child_age ); ?>" placeholder="e.g. 7" min="1" max="18">
			</div>

			<div class="rnta-waiver__field">
				<label for="rnta-manual-party-name"><?php esc_html_e( 'Party package / experience', 'rockntiara-reservations' ); ?></label>
				<select name="party_name" id="rnta-manual-party-name" required>
					<?php foreach ( $packages as $pkg ) : ?>
						<option value="<?php echo esc_attr( $pkg ); ?>" <?php selected( $party_name, $pkg ); ?>><?php echo esc_html( $pkg ); ?></option>
					<?php endforeach; ?>
				</select>
			</div>

			<div class="rnta-waiver__field">
				<label for="rnta-manual-party-date"><?php esc_html_e( 'Party date', 'rockntiara-reservations' ); ?></label>
				<input type="date" name="party_date" id="rnta-manual-party-date" value="<?php echo esc_attr( $party_date ); ?>" required>
			</div>

			<div class="rnta-waiver__field">
				<label for="rnta-manual-party-time"><?php esc_html_e( 'Party start time', 'rockntiara-reservations' ); ?></label>
				<input type="time" name="party_time" id="rnta-manual-party-time" value="<?php echo esc_attr( $party_time ); ?>">
			</div>

			<h4 class="rnta-waiver__section-heading" style="margin-top:20px;"><?php esc_html_e( '2. Legal Waiver & Parent Consent', 'rockntiara-reservations' ); ?></h4>

			<div class="rnta-waiver__field">
				<label for="rnta-manual-signer-name"><?php esc_html_e( 'Parent / guardian full name', 'rockntiara-reservations' ); ?></label>
				<input type="text" name="signer_name" id="rnta-manual-signer-name" value="<?php echo esc_attr( $signer ); ?>" placeholder="<?php esc_attr_e( 'Signer full legal name', 'rockntiara-reservations' ); ?>" required>
			</div>

			<div class="rnta-waiver__field">
				<label for="rnta-manual-relationship"><?php esc_html_e( 'Relationship to child', 'rockntiara-reservations' ); ?></label>
				<input type="text" name="signer_relationship" id="rnta-manual-relationship" placeholder="<?php esc_attr_e( 'Parent, guardian, authorized adult...', 'rockntiara-reservations' ); ?>" required>
			</div>

			<?php echo $this->render_waiver_legal_notice(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>

			<div class="rnta-waiver__terms">
				<label>
					<input type="checkbox" name="accepted_terms" value="1" required>
					<span><?php echo esc_html( $this->get_waiver_terms_text() ); ?></span>
				</label>
			</div>

			<div class="rnta-waiver__signature-pad">
				<label><?php esc_html_e( 'Hand-drawn signature', 'rockntiara-reservations' ); ?></label>
				<div class="rnta-waiver__signature-actions">
					<button type="button" class="rnta-waiver__start-signature"><?php esc_html_e( 'Sign', 'rockntiara-reservations' ); ?></button>
					<button type="button" class="rnta-waiver__finish-signature"><?php esc_html_e( 'OK', 'rockntiara-reservations' ); ?></button>
					<button type="button" class="rnta-waiver__clear-signature"><?php esc_html_e( 'Clear signature', 'rockntiara-reservations' ); ?></button>
					<span class="rnta-waiver__signature-help"><?php esc_html_e( 'Tap Sign to write, then OK to continue scrolling.', 'rockntiara-reservations' ); ?></span>
				</div>
				<div class="rnta-waiver__canvas-wrap">
					<canvas class="rnta-waiver__canvas" width="900" height="260" tabindex="0" aria-label="<?php esc_attr_e( 'Draw your signature', 'rockntiara-reservations' ); ?>"></canvas>
				</div>
				<input type="hidden" name="drawn_signature" class="rnta-waiver__drawn-signature" value="">
			</div>

			<div class="rnta-waiver__field">
				<label for="rnta-manual-typed-signature"><?php esc_html_e( 'Typed signature', 'rockntiara-reservations' ); ?></label>
				<input type="text" name="typed_signature" id="rnta-manual-typed-signature" placeholder="<?php esc_attr_e( 'Type your full legal name', 'rockntiara-reservations' ); ?>" required>
			</div>

			<div class="rnta-waiver__actions">
				<button type="submit" class="rnta-waiver__btn rnta-waiver__btn--primary">
					<?php esc_html_e( 'Submit waiver', 'rockntiara-reservations' ); ?>
				</button>
			</div>
		</form>
		<?php
		return ob_get_clean();
	}

	private function handle_submission() {
		$result = array(
			'error'       => '',
			'success'     => '',
			'reservation' => null,
			'guest'       => null,
		);

		if ( empty( $_POST['rnta_waiver_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rnta_waiver_nonce'] ) ), 'rnta_submit_waiver' ) ) {
			$result['error'] = __( 'Security check failed. Please refresh the page and try again.', 'rockntiara-reservations' );
			return $result;
		}

		$lookup_number = isset( $_POST['reservation_number'] ) ? absint( wp_unslash( $_POST['reservation_number'] ) ) : 0;
		$access_code   = isset( $_POST['access_code'] ) ? sanitize_text_field( wp_unslash( $_POST['access_code'] ) ) : '';
		$guest_token   = isset( $_POST['guest_token'] ) ? sanitize_text_field( wp_unslash( $_POST['guest_token'] ) ) : '';
		$guest         = null;
		$reservation   = null;

		if ( $guest_token ) {
			$guest = RNTA_Reservations_Guest_Repository::instance()->get_by_token( $guest_token );
			if ( $guest ) {
				$reservation = RNTA_Reservations_Repository::instance()->get_by_id( $guest['reservation_id'] );
			}
		} else {
			$reservation = RNTA_Reservations_Repository::instance()->get_by_lookup_credentials( $lookup_number, $access_code );
		}

		if ( ! $reservation ) {
			$result['error'] = __( 'We could not validate this reservation. Please check the number and access code.', 'rockntiara-reservations' );
			return $result;
		}

		$result['reservation'] = $reservation;
		$result['guest']       = $guest;

		$signer_name         = isset( $_POST['signer_name'] ) ? sanitize_text_field( wp_unslash( $_POST['signer_name'] ) ) : '';
		$signer_relationship = isset( $_POST['signer_relationship'] ) ? sanitize_text_field( wp_unslash( $_POST['signer_relationship'] ) ) : '';
		$typed_signature     = isset( $_POST['typed_signature'] ) ? sanitize_text_field( wp_unslash( $_POST['typed_signature'] ) ) : '';
		$drawn_signature     = isset( $_POST['drawn_signature'] ) ? trim( (string) wp_unslash( $_POST['drawn_signature'] ) ) : '';
		$accepted_terms      = ! empty( $_POST['accepted_terms'] );
		$guest_birthdate     = isset( $_POST['guest_birthdate'] ) ? sanitize_text_field( wp_unslash( $_POST['guest_birthdate'] ) ) : '';
		$guest_age           = $guest ? $this->calculate_age_from_birthdate( $guest_birthdate ) : 0;

		if ( $guest ) {
			if ( '' === $signer_name || '' === $signer_relationship || ! $accepted_terms || ! $this->is_valid_birthdate( $guest_birthdate ) || $guest_age <= 0 ) {
				$result['error'] = __( 'Please complete the parent or guardian information, invited child birthday, and acceptance checkbox.', 'rockntiara-reservations' );
				return $result;
			}

			$typed_signature = '';
			$drawn_signature = '';
		} elseif ( '' === $signer_name || '' === $signer_relationship || '' === $typed_signature || ! $this->is_valid_signature_data_url( $drawn_signature ) || ! $accepted_terms ) {
			$result['error'] = __( 'Please complete the signer name, relationship, typed signature, hand-drawn signature, and acceptance checkbox.', 'rockntiara-reservations' );
			return $result;
		}

		$ip_address = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';

		$waiver_data = array(
			'child_name'           => isset( $_POST['child_name'] ) ? sanitize_text_field( wp_unslash( $_POST['child_name'] ) ) : $reservation['child_name'],
			'signer_name'          => $signer_name,
			'signer_relationship'  => $signer_relationship,
			'guest_birthdate'      => $guest_birthdate,
			'guest_age'            => $guest_age,
			'accepted_terms'       => $accepted_terms,
			'typed_signature'      => $typed_signature,
			'drawn_signature'      => $drawn_signature,
			'waiver_text_version'  => self::WAIVER_TEXT_VERSION,
			'waiver_text_snapshot' => $guest ? $this->get_guest_waiver_terms_text() : $this->get_waiver_terms_text(),
			'ip_address'           => $ip_address,
			'user_agent'           => $user_agent,
		);

		if ( $guest ) {
			$saved = RNTA_Reservations_Guest_Repository::instance()->save_guest_waiver( $guest, $waiver_data );
			$guest = RNTA_Reservations_Guest_Repository::instance()->get_by_id( $guest['id'] );
			$result['guest'] = $guest;
		} else {
			$saved = RNTA_Reservations_Waiver_Repository::instance()->save_from_form( $reservation, $waiver_data );
		}

		if ( ! $saved ) {
			$result['error'] = __( 'We could not save the waiver. Please try again or contact Rock N Tiara.', 'rockntiara-reservations' );
			return $result;
		}

		$pdf_generator = new RNTA_Reservations_Waiver_PDF();
		$pdf_result    = $pdf_generator->generate( $reservation, $waiver_data, $guest );

		if ( is_wp_error( $pdf_result ) ) {
			error_log( 'Rock N Tiara waiver PDF generation failed: ' . $pdf_result->get_error_message() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		} elseif ( $guest ) {
			$attached = RNTA_Reservations_Guest_Repository::instance()->attach_waiver_pdf( $guest['id'], $pdf_result['relative_path'], $pdf_result['hash'] );
			if ( ! $attached ) {
				error_log( 'Rock N Tiara waiver PDF was created but could not be attached to guest #' . absint( $guest['id'] ) . '.' ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			}
		} else {
			$attached = RNTA_Reservations_Waiver_Repository::instance()->attach_pdf( $reservation['id'], $pdf_result['relative_path'], $pdf_result['hash'] );
			if ( ! $attached ) {
				error_log( 'Rock N Tiara waiver PDF was created but could not be attached to reservation #' . absint( $reservation['id'] ) . '.' ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			}
		}

		$result['success'] = $guest
			? sprintf(
				/* translators: %s: invited child name */
				__( 'Thank you. The invitation for %s has been accepted and the consent form has been received.', 'rockntiara-reservations' ),
				$guest['guest_name']
			)
			: __( 'Thank you. Your waiver has been received.', 'rockntiara-reservations' );
		return $result;
	}

	private function render_lookup_form( $lookup_number, $access_code ) {
		ob_start();
		?>
		<form method="get" class="rnta-waiver__card rnta-waiver__lookup">
			<div class="rnta-waiver__field">
				<label for="rnta-waiver-reservation-number"><?php esc_html_e( 'Order or reservation number', 'rockntiara-reservations' ); ?></label>
				<input type="number" name="reservation" id="rnta-waiver-reservation-number" value="<?php echo esc_attr( $lookup_number ); ?>" required>
			</div>
			<div class="rnta-waiver__field">
				<label for="rnta-waiver-access-code"><?php esc_html_e( 'Access code', 'rockntiara-reservations' ); ?></label>
				<input type="text" name="pass" id="rnta-waiver-access-code" value="<?php echo esc_attr( $access_code ); ?>" required>
			</div>
			<div class="rnta-waiver__actions">
				<button type="submit" class="rnta-waiver__btn rnta-waiver__btn--primary"><?php esc_html_e( 'Open waiver', 'rockntiara-reservations' ); ?></button>
			</div>
		</form>
		<?php
		return ob_get_clean();
	}

	private function render_waiver_form( $reservation, $lookup_number, $access_code, $guest = null ) {
		$host_name  = trim( $reservation['host_first_name'] . ' ' . $reservation['host_last_name'] );
		$date_label = ! empty( $reservation['confirmed_party_date'] ) ? $reservation['confirmed_party_date'] : $reservation['requested_party_date'];
		$time_label = ! empty( $reservation['confirmed_start_time'] ) ? $reservation['confirmed_start_time'] : $reservation['requested_start_time'];
		$child_name = $guest && ! empty( $guest['guest_name'] ) ? $guest['guest_name'] : $reservation['child_name'];
		$signer     = $guest && ! empty( $guest['guardian_name'] ) ? $guest['guardian_name'] : $host_name;

		ob_start();
		?>
		<form method="post" class="rnta-waiver__card rnta-waiver__form">
			<?php wp_nonce_field( 'rnta_submit_waiver', 'rnta_waiver_nonce' ); ?>
			<input type="hidden" name="rnta_submit_waiver" value="1">
			<input type="hidden" name="reservation_number" value="<?php echo esc_attr( $lookup_number ? $lookup_number : $reservation['woo_order_id'] ); ?>">
			<input type="hidden" name="access_code" value="<?php echo esc_attr( $access_code ); ?>">
			<?php if ( $guest ) : ?>
				<input type="hidden" name="guest_token" value="<?php echo esc_attr( $guest['invite_token'] ); ?>">
				<div class="rnta-waiver__acceptance-note">
					<strong><?php esc_html_e( 'Your invitation response', 'rockntiara-reservations' ); ?></strong>
					<p><?php esc_html_e( 'Confirming this form accepts the birthday invitation and records parent or guardian consent for the invited child.', 'rockntiara-reservations' ); ?></p>
				</div>
			<?php endif; ?>

			<div class="rnta-waiver__summary">
				<div><strong><?php esc_html_e( 'Reservation', 'rockntiara-reservations' ); ?></strong><span>#<?php echo esc_html( $reservation['woo_order_id'] ); ?></span></div>
				<div><strong><?php esc_html_e( 'Party', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( $reservation['party_name'] ); ?></span></div>
				<div><strong><?php esc_html_e( 'Host', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( $host_name ); ?></span></div>
				<?php if ( $guest ) : ?>
					<div><strong><?php esc_html_e( 'Invited child', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( $guest['guest_name'] ); ?></span></div>
				<?php endif; ?>
				<div><strong><?php esc_html_e( 'Date / time', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( trim( $date_label . ' ' . $time_label ) ); ?></span></div>
				<div><strong><?php esc_html_e( 'Location', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( RNTA_RESERVATIONS_VENUE_LABEL ); ?></span></div>
			</div>

			<div class="rnta-waiver__field">
				<label for="rnta-waiver-child-name"><?php esc_html_e( 'Child name', 'rockntiara-reservations' ); ?></label>
				<input type="text" name="child_name" id="rnta-waiver-child-name" value="<?php echo esc_attr( $child_name ); ?>" required>
			</div>
			<div class="rnta-waiver__field">
				<label for="rnta-waiver-signer-name"><?php esc_html_e( 'Parent / guardian full name', 'rockntiara-reservations' ); ?></label>
				<input type="text" name="signer_name" id="rnta-waiver-signer-name" value="<?php echo esc_attr( $signer ); ?>" required>
			</div>
			<div class="rnta-waiver__field">
				<label for="rnta-waiver-relationship"><?php esc_html_e( 'Relationship to child', 'rockntiara-reservations' ); ?></label>
				<input type="text" name="signer_relationship" id="rnta-waiver-relationship" placeholder="<?php esc_attr_e( 'Parent, guardian, authorized adult...', 'rockntiara-reservations' ); ?>" required>
			</div>
			<?php if ( $guest ) : ?>
				<?php echo $this->render_guest_birthdate_picker(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<?php endif; ?>

			<?php if ( ! $guest ) : ?>
				<?php echo $this->render_waiver_legal_notice(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<?php endif; ?>

			<div class="rnta-waiver__terms">
				<label>
					<input type="checkbox" name="accepted_terms" value="1" required>
					<?php if ( $guest ) : ?>
						<span>
							<?php
							printf(
								wp_kses(
									/* translators: %s: Terms and Conditions URL */
									__( 'I have read and agree to the Rock N Tiara waiver terms in the <a href="%s" target="_blank" rel="noopener">Terms & Conditions</a>, and I authorize the invited child to participate in this celebration.', 'rockntiara-reservations' ),
									array(
										'a' => array(
											'href'   => array(),
											'target' => array(),
											'rel'    => array(),
										),
									)
								),
								esc_url( $this->get_terms_conditions_url() )
							);
							?>
						</span>
					<?php else : ?>
						<span><?php echo esc_html( $this->get_waiver_terms_text() ); ?></span>
					<?php endif; ?>
				</label>
			</div>
			<?php if ( ! $guest ) : ?>
				<div class="rnta-waiver__signature-pad">
					<label><?php esc_html_e( 'Hand-drawn signature', 'rockntiara-reservations' ); ?></label>
					<div class="rnta-waiver__signature-actions">
						<button type="button" class="rnta-waiver__start-signature"><?php esc_html_e( 'Sign', 'rockntiara-reservations' ); ?></button>
						<button type="button" class="rnta-waiver__finish-signature"><?php esc_html_e( 'OK', 'rockntiara-reservations' ); ?></button>
						<button type="button" class="rnta-waiver__clear-signature"><?php esc_html_e( 'Clear signature', 'rockntiara-reservations' ); ?></button>
						<span class="rnta-waiver__signature-help"><?php esc_html_e( 'Tap Sign to write, then OK to continue scrolling.', 'rockntiara-reservations' ); ?></span>
					</div>
					<div class="rnta-waiver__canvas-wrap">
						<canvas class="rnta-waiver__canvas" width="900" height="260" tabindex="0" aria-label="<?php esc_attr_e( 'Draw your signature', 'rockntiara-reservations' ); ?>"></canvas>
					</div>
					<input type="hidden" name="drawn_signature" class="rnta-waiver__drawn-signature" value="">
				</div>
				<div class="rnta-waiver__field">
					<label for="rnta-waiver-signature"><?php esc_html_e( 'Typed signature', 'rockntiara-reservations' ); ?></label>
					<input type="text" name="typed_signature" id="rnta-waiver-signature" placeholder="<?php esc_attr_e( 'Type your full legal name', 'rockntiara-reservations' ); ?>" required>
				</div>
			<?php endif; ?>
			<div class="rnta-waiver__actions">
				<button type="submit" class="rnta-waiver__btn rnta-waiver__btn--primary">
					<?php $guest ? esc_html_e( 'Accept invitation and submit consent', 'rockntiara-reservations' ) : esc_html_e( 'Submit waiver', 'rockntiara-reservations' ); ?>
				</button>
			</div>
		</form>
		<?php
		return ob_get_clean();
	}

	private function render_guest_birthdate_picker() {
		ob_start();
		?>
		<div class="rnta-waiver__field rnta-waiver__field--full rnta-waiver__birthdate" data-rnta-guest-birthdate>
			<label for="rnta-waiver-guest-birthdate"><?php esc_html_e( 'Invited child birthday', 'rockntiara-reservations' ); ?></label>
			<input type="hidden" name="guest_birthdate" id="rnta-waiver-guest-birthdate" data-rnta-guest-birth-hidden required>
			<div class="rnta-waiver__birth-picker">
				<select data-rnta-guest-birth-month required>
					<option value=""><?php esc_html_e( 'Month', 'rockntiara-reservations' ); ?></option>
					<?php for ( $month = 1; $month <= 12; $month++ ) : ?>
						<option value="<?php echo esc_attr( sprintf( '%02d', $month ) ); ?>"><?php echo esc_html( gmdate( 'F', gmmktime( 0, 0, 0, $month, 1 ) ) ); ?></option>
					<?php endfor; ?>
				</select>
				<select data-rnta-guest-birth-day required>
					<option value=""><?php esc_html_e( 'Day', 'rockntiara-reservations' ); ?></option>
					<?php for ( $day = 1; $day <= 31; $day++ ) : ?>
						<option value="<?php echo esc_attr( sprintf( '%02d', $day ) ); ?>"><?php echo esc_html( $day ); ?></option>
					<?php endfor; ?>
				</select>
				<select data-rnta-guest-birth-year required>
					<option value=""><?php esc_html_e( 'Year', 'rockntiara-reservations' ); ?></option>
					<?php for ( $year = (int) gmdate( 'Y' ); $year >= ( (int) gmdate( 'Y' ) - 18 ); $year-- ) : ?>
						<option value="<?php echo esc_attr( $year ); ?>"><?php echo esc_html( $year ); ?></option>
					<?php endfor; ?>
				</select>
			</div>
			<p class="rnta-waiver__field-note" data-rnta-guest-age-note><?php esc_html_e( 'We use this only to keep the guest record accurate for the event.', 'rockntiara-reservations' ); ?></p>
		</div>
		<?php
		return ob_get_clean();
	}

	private function render_waiver_legal_notice() {
		$sections = $this->get_waiver_sections();

		ob_start();
		?>
		<div class="rnta-waiver__legal">
			<div class="rnta-waiver__legal-head">
				<span><?php esc_html_e( 'Please read before signing', 'rockntiara-reservations' ); ?></span>
				<h4><?php esc_html_e( 'Waiver, safety acknowledgment, and event disclaimer', 'rockntiara-reservations' ); ?></h4>
				<p><?php esc_html_e( 'This waiver is connected to the reservation details shown above. It must be completed by the parent, legal guardian, or authorized adult before participation.', 'rockntiara-reservations' ); ?></p>
			</div>
			<div class="rnta-waiver__legal-grid">
				<?php foreach ( $sections as $section ) : ?>
					<section class="rnta-waiver__legal-section">
						<h5><?php echo esc_html( $section['title'] ); ?></h5>
						<p><?php echo esc_html( $section['body'] ); ?></p>
					</section>
				<?php endforeach; ?>
			</div>
			<p class="rnta-waiver__legal-note">
				<?php esc_html_e( 'Operational note: final legal copy and policy references should be reviewed by Rock N Tiara legal counsel before public launch.', 'rockntiara-reservations' ); ?>
			</p>
		</div>
		<?php

		return ob_get_clean();
	}

	private function render_received_state( $reservation, $waiver ) {
		ob_start();
		?>
		<div class="rnta-waiver__card rnta-waiver__received">
			<span class="rnta-waiver__status"><?php esc_html_e( 'Waiver received', 'rockntiara-reservations' ); ?></span>
			<h4><?php esc_html_e( 'This reservation already has a submitted waiver.', 'rockntiara-reservations' ); ?></h4>
			<div class="rnta-waiver__summary">
				<div><strong><?php esc_html_e( 'Reservation', 'rockntiara-reservations' ); ?></strong><span>#<?php echo esc_html( $reservation['woo_order_id'] ); ?></span></div>
				<div><strong><?php esc_html_e( 'Child', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( $waiver['child_name'] ); ?></span></div>
				<div><strong><?php esc_html_e( 'Signer', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( $waiver['signer_name'] ); ?></span></div>
				<div><strong><?php esc_html_e( 'Submitted', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( $waiver['created_at'] ); ?></span></div>
			</div>
			<?php if ( ! empty( $waiver['drawn_signature'] ) ) : ?>
				<div class="rnta-waiver__signature-preview">
					<strong><?php esc_html_e( 'Signature on file', 'rockntiara-reservations' ); ?></strong>
					<img src="<?php echo esc_attr( $waiver['drawn_signature'] ); ?>" alt="<?php esc_attr_e( 'Submitted hand-drawn signature', 'rockntiara-reservations' ); ?>">
				</div>
			<?php endif; ?>
		</div>
		<?php
		return ob_get_clean();
	}

	private function render_guest_received_state( $reservation, $guest ) {
		ob_start();
		?>
		<div class="rnta-waiver__card rnta-waiver__received">
			<span class="rnta-waiver__status"><?php esc_html_e( 'Invitation accepted', 'rockntiara-reservations' ); ?></span>
			<h4>
				<?php
				echo esc_html(
					sprintf(
						/* translators: %s: invited child name */
						__( '%s is confirmed for the celebration.', 'rockntiara-reservations' ),
						$guest['guest_name']
					)
				);
				?>
			</h4>
			<div class="rnta-waiver__summary">
				<div><strong><?php esc_html_e( 'Reservation', 'rockntiara-reservations' ); ?></strong><span>#<?php echo esc_html( $reservation['woo_order_id'] ); ?></span></div>
				<div><strong><?php esc_html_e( 'Guest', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( $guest['guest_name'] ); ?></span></div>
				<?php if ( ! empty( $guest['guest_birthdate'] ) ) : ?>
					<div><strong><?php esc_html_e( 'Birthday', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( $guest['guest_birthdate'] ); ?></span></div>
				<?php endif; ?>
				<?php if ( ! empty( $guest['guest_age'] ) ) : ?>
					<div><strong><?php esc_html_e( 'Age', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( $guest['guest_age'] ); ?></span></div>
				<?php endif; ?>
				<div><strong><?php esc_html_e( 'Signer', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( $guest['signer_name'] ); ?></span></div>
				<div><strong><?php esc_html_e( 'Submitted', 'rockntiara-reservations' ); ?></strong><span><?php echo esc_html( $guest['signed_at'] ); ?></span></div>
			</div>
			<?php if ( ! empty( $guest['drawn_signature'] ) ) : ?>
				<div class="rnta-waiver__signature-preview">
					<strong><?php esc_html_e( 'Signature on file', 'rockntiara-reservations' ); ?></strong>
					<img src="<?php echo esc_attr( $guest['drawn_signature'] ); ?>" alt="<?php esc_attr_e( 'Submitted hand-drawn signature', 'rockntiara-reservations' ); ?>">
				</div>
			<?php endif; ?>
		</div>
		<?php
		return ob_get_clean();
	}

	private function get_waiver_terms_text() {
		$intro = sprintf(
			/* translators: %s: venue label */
			__( 'By signing below, I confirm that I am the parent, legal guardian, or authorized adult for this child and I accept Rock N Tiara waiver and release terms for this celebration taking place at %s.', 'rockntiara-reservations' ),
			RNTA_RESERVATIONS_VENUE_LABEL
		);

		$sections = array_map(
			function( $section ) {
				return $section['title'] . ': ' . $section['body'];
			},
			$this->get_waiver_sections()
		);

		return $intro . "\n\n" . implode( "\n\n", $sections );
	}

	private function get_guest_waiver_terms_text() {
		return sprintf(
			/* translators: %s: Terms and Conditions URL */
			__( 'Guest invitation consent accepted. The parent or guardian confirmed they read and agreed to the Rock N Tiara waiver terms in the Terms & Conditions page: %s', 'rockntiara-reservations' ),
			$this->get_terms_conditions_url()
		);
	}

	private function get_terms_conditions_url() {
		return home_url( '/terms-conditions/#waivers' );
	}

	private function is_valid_birthdate( $birthdate ) {
		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) $birthdate ) ) {
			return false;
		}

		$timestamp = strtotime( $birthdate );
		if ( ! $timestamp ) {
			return false;
		}

		return gmdate( 'Y-m-d', $timestamp ) === $birthdate && $birthdate <= current_time( 'Y-m-d' );
	}

	private function calculate_age_from_birthdate( $birthdate ) {
		if ( ! $this->is_valid_birthdate( $birthdate ) ) {
			return 0;
		}

		try {
			$birthday = new DateTimeImmutable( $birthdate );
			$today    = new DateTimeImmutable( current_time( 'Y-m-d' ) );
		} catch ( Exception $e ) {
			return 0;
		}

		return absint( $birthday->diff( $today )->y );
	}

	private function get_waiver_sections() {
		return array(
			array(
				'title' => __( 'Event details and location', 'rockntiara-reservations' ),
				'body'  => sprintf(
					/* translators: %s: venue label */
					__( 'The celebration is scheduled as a private children party or kids spa event at %s. Event date, time, package, guest count, selected add-ons, and host information are tied to the reservation record and may be updated only by Rock N Tiara after review.', 'rockntiara-reservations' ),
					RNTA_RESERVATIONS_VENUE_LABEL
				),
			),
			array(
				'title' => __( 'Authorized attendees', 'rockntiara-reservations' ),
				'body'  => __( 'Participation is limited to the child, invited guests, authorized accompanying parents or guardians, the host, and Rock N Tiara staff or approved service providers. Unauthorized visitors or unapproved third parties are not part of the event access.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Nature of the service', 'rockntiara-reservations' ),
				'body'  => __( 'The host understands that Rock N Tiara provides children entertainment, spa-party styling, themed celebration experiences, creative activities, and party services. These services are for entertainment purposes only. Although staff may be trained for party activities and guest care, Rock N Tiara services do not constitute medical, therapeutic, dermatological, cosmetology, or health treatment services.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Child-appropriate materials', 'rockntiara-reservations' ),
				'body'  => __( 'Rock N Tiara selects activities, decor, materials, products, and party elements intended for children and supervised celebration use. The host acknowledges that they are booking a children party service and that the ordinary activities are designed to be age-appropriate, decorative, playful, and non-medical.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Spa activity policies', 'rockntiara-reservations' ),
				'body'  => __( 'Rock N Tiara does not cut nails and does not use sharp utensils to perform manicures or pedicures. Rock N Tiara does not use electricity with water for party spa activities and uses warm water basins only. Pedicure basins are sanitized between parties and lined with disposable pedicure liners. Disposable makeup applicators are used for each guest when applicable.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Allergies, sensitivities, and medical disclosure', 'rockntiara-reservations' ),
				'body'  => __( 'The host is responsible for notifying Rock N Tiara in advance if any child has food allergies, dietary restrictions, skin sensitivities, respiratory conditions, medical limitations, behavioral needs, accessibility needs, or any other information that may affect safe participation. Rock N Tiara cannot evaluate or protect against conditions that are not disclosed before the event.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Food, treats, products, and add-ons', 'rockntiara-reservations' ),
				'body'  => __( 'The host acknowledges that parties may include food, candy, beverages, cosmetic-style play products, glitter, lotions, polish, slime, craft materials, decorations, or third-party add-ons. Rock N Tiara is not responsible for allergic reactions or sensitivities related to nail or makeup-style products, robes, costumes, food, beverages, treats, crafts, or other party materials when the relevant allergy, restriction, or sensitivity was not disclosed in advance. Availability, ingredients, suitability, and pricing for some add-ons may require separate confirmation before the event.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Rock N Tiara property and equipment', 'rockntiara-reservations' ),
				'body'  => __( 'Spa robes, costumes, party props, decor, equipment, supplies, and party items remain the property of Rock N Tiara unless Rock N Tiara specifically states otherwise. They are not intended for guests to keep. If Rock N Tiara equipment or party items are lost, damaged, or taken by a guest, whether intentionally or unintentionally, the host may be responsible for reasonable monetary reimbursement.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Safety rules and guest conduct', 'rockntiara-reservations' ),
				'body'  => __( 'Guests and accompanying adults must follow staff instructions and venue rules. The host and attending parents or guardians remain responsible for supervising children, keeping them safe and under control, and helping prevent unsafe behavior during the party. Running, pushing, climbing on furniture, unsafe play, damaging property, entering restricted areas, or disruptive behavior may result in a paused activity, removal from an activity, or other action needed to protect children, guests, staff, and the venue.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Right to refuse or stop service', 'rockntiara-reservations' ),
				'body'  => __( 'Rock N Tiara reserves the right to refuse service to any child, guest, or party if Rock N Tiara believes a health risk, safety risk, unsafe environment, disruptive behavior, undisclosed condition, or other concern may place guests, employees, associates, contractors, or the venue at risk.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Required permission waiver', 'rockntiara-reservations' ),
				'body'  => __( 'Each child attendee may be required to have a signed permission waiver from a parent, legal guardian, or authorized adult before participating in party activities. Rock N Tiara may limit participation when required waiver information has not been provided.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Assumption of ordinary event risks', 'rockntiara-reservations' ),
				'body'  => __( 'The host understands that children events may involve ordinary and inherent risks, including slips, trips, minor falls, bumps, allergic reactions, product sensitivities, stains, property damage, emotional discomfort, or incidents caused during the event by guest behavior, undisclosed conditions, food, beverages, costumes, robes, products, decorations, or party activities.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Photos, videos, and privacy', 'rockntiara-reservations' ),
				'body'  => __( 'Photos or videos taken by Rock N Tiara may be used by Rock N Tiara for internal records and promotional purposes, including website, social media, print, advertisements, or publications, unless the host requests otherwise in writing before the event. Rock N Tiara respects client privacy and does not sell or disclose personal contact information to third parties for unrelated marketing.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Release and hold harmless acknowledgment', 'rockntiara-reservations' ),
				'body'  => __( 'To the fullest extent allowed by applicable law, the host affirms that they have read this agreement, understand the nature of the party and spa-style entertainment services provided to the child, and agree to release, defend, indemnify, and hold harmless Rock N Tiara, its owners, staff, contractors, representatives, and approved providers from claims, losses, suits, damages, or causes of action arising from ordinary event risks, guest conduct, omitted medical or allergy information, product sensitivities, misuse of materials, property damage, failure to follow instructions, or circumstances outside Rock N Tiara reasonable control.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Emergency authorization', 'rockntiara-reservations' ),
				'body'  => __( 'If an urgent situation occurs, the host authorizes Rock N Tiara to contact emergency services and the host contact information on file. The host remains responsible for medical decisions, follow-up care, related costs, and any required documentation.', 'rockntiara-reservations' ),
			),
			array(
				'title' => __( 'Final acknowledgment', 'rockntiara-reservations' ),
				'body'  => __( 'By checking the acceptance box and signing, the signer confirms they have read this waiver, understand it, had the opportunity to ask questions, and voluntarily accept these terms for the child and celebration connected to this reservation.', 'rockntiara-reservations' ),
			),
		);
	}

	private function is_valid_signature_data_url( $signature ) {
		$signature = trim( (string) $signature );

		if ( '' === $signature || strlen( $signature ) > 500000 ) {
			return false;
		}

		return (bool) preg_match( '/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/', $signature );
	}

	public function print_assets() {
		static $printed = false;

		if ( $printed ) {
			return;
		}

		$printed = true;
		?>
		<style>
			.rnta-waiver{width:min(calc(100% - 32px),1200px);margin:0 auto;padding:54px 0;display:grid;gap:24px;}
			.rnta-waiver--terms{width:100%;max-width:none;margin:0;padding:0;}
			.rnta-waiver__intro{text-align:center;display:grid;gap:12px;justify-items:center;}
			.rnta-waiver__eyebrow,.rnta-waiver__status{display:inline-flex;align-items:center;min-height:38px;padding:0 16px;border-radius:999px;border:1px solid rgba(237,79,143,.22);background:rgba(255,255,255,.82);color:#ed4f8f;font:800 12px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;}
			.rnta-waiver__title{margin:0;color:#ed4f8f;font:400 clamp(44px,6vw,78px)/.9 "Great Vibes",cursive;}
			.rnta-waiver__copy{max-width:720px;margin:0;color:#856b76;font:500 16px/1.7 "Quicksand",sans-serif;}
			.rnta-waiver__card{background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,248,251,.96));border:1px solid rgba(237,79,143,.16);border-radius:32px;padding:28px;box-shadow:0 18px 40px rgba(69,44,53,.06);}
			.rnta-waiver__section-heading{grid-column:1/-1;margin:16px 0 4px;color:#ed4f8f;font:700 20px/1.2 "Quicksand",sans-serif;border-bottom:1px solid rgba(237,79,143,.15);padding-bottom:8px;}
			.rnta-waiver__filter-bar{grid-column:1/-1;background:#fff;border:1px solid rgba(237,79,143,.18);border-radius:24px;padding:20px;display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;}
			.rnta-waiver__filter-group{display:grid;gap:6px;flex:1 1 200px;}
			.rnta-waiver__filter-group label{color:#a4838f;font:800 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;}
			.rnta-waiver__filter-group input,.rnta-waiver__filter-group select{width:100%;min-height:48px;border-radius:999px;border:1px solid rgba(237,79,143,.18);background:#fff;padding:0 16px;color:#452c35;font:600 14px/1 "Quicksand",sans-serif;}
			.rnta-waiver__table-wrap{grid-column:1/-1;overflow-x:auto;border-radius:24px;border:1px solid rgba(237,79,143,.16);background:#fff;padding:0;}
			.rnta-waiver__table{width:100%;border-collapse:collapse;text-align:left;font:500 14px/1.5 "Quicksand",sans-serif;}
			.rnta-waiver__table th{background:#fff8fb;color:#ed4f8f;font:800 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:14px 16px;border-bottom:1px solid rgba(237,79,143,.14);}
			.rnta-waiver__table td{padding:14px 16px;border-bottom:1px solid rgba(237,79,143,.08);color:#452c35;}
			.rnta-waiver__table tr:last-child td{border-bottom:none;}
			.rnta-waiver__badge{display:inline-flex;align-items:center;padding:4px 12px;border-radius:999px;font:700 11px/1 "Quicksand",sans-serif;letter-spacing:.04em;text-transform:uppercase;}
			.rnta-waiver__badge--host{background:#ecfdf3;color:#027a48;border:1px solid #abefc6;}
			.rnta-waiver__badge--guest{background:#eff8ff;color:#175cd3;border:1px solid #b2ddff;}
			.rnta-waiver__btn-sm{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 14px;border-radius:999px;font:700 12px/1 "Quicksand",sans-serif;text-decoration:none;transition:all .15s ease;margin:2px 4px 2px 0;}
			.rnta-waiver__btn-sm--primary{background:#ed4f8f;border:1px solid #ed4f8f;color:#fff;}
			.rnta-waiver__btn-sm--primary:hover{background:#d83c7a;border-color:#d83c7a;color:#fff;}
			.rnta-waiver__btn-sm--zip{background:#fdf2f8;border:1px solid #f472b6;color:#be185d;}
			.rnta-waiver__btn-sm--zip:hover{background:#fce7f3;color:#9d174d;}
			.rnta-waiver__lookup,.rnta-waiver__form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:end;}
			.rnta-waiver__acceptance-note{grid-column:1/-1;border:1px solid rgba(237,79,143,.2);border-radius:24px;background:linear-gradient(135deg,#fff4f8,#fffaf1);padding:18px 20px;text-align:center;display:grid;gap:6px;}
			.rnta-waiver__acceptance-note strong{color:#ed4f8f;font:400 34px/1 "Great Vibes",cursive;}
			.rnta-waiver__acceptance-note p{max-width:680px;margin:0 auto;color:#856b76;font:600 14px/1.6 "Quicksand",sans-serif;}
			.rnta-waiver__summary{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:8px;}
			.rnta-waiver__summary div{border:1px solid rgba(237,79,143,.12);border-radius:20px;background:#fff;padding:16px;display:grid;gap:8px;}
			.rnta-waiver__summary strong,.rnta-waiver__field label{color:#a4838f;font:800 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;}
			.rnta-waiver__summary span,.rnta-waiver__terms span{color:#856b76;font:600 14px/1.55 "Quicksand",sans-serif;}
			.rnta-waiver__field{display:grid;gap:8px;}
			.rnta-waiver__field input,.rnta-waiver__field select{width:100%;min-height:56px;border-radius:999px;border:1px solid rgba(237,79,143,.18);background:#fff;padding:0 18px;color:#452c35;font:600 15px/1 "Quicksand",sans-serif;}
			.rnta-waiver__field--full{grid-column:1/-1;}
			.rnta-waiver__birth-picker{display:grid;grid-template-columns:1.2fr .8fr .9fr;gap:12px;}
			.rnta-waiver__field-note{margin:0;color:#856b76;font:600 13px/1.55 "Quicksand",sans-serif;}
			.rnta-waiver__terms{grid-column:1/-1;border:1px solid rgba(237,79,143,.12);border-radius:24px;background:#fff;padding:18px;}
			.rnta-waiver__terms label{display:flex;gap:12px;align-items:flex-start;}
			.rnta-waiver__terms input{width:18px;height:18px;margin:3px 0 0;accent-color:#ed4f8f;flex:0 0 auto;}
			.rnta-waiver__legal{grid-column:1/-1;border:1px solid rgba(237,79,143,.14);border-radius:30px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(255,247,251,.96));padding:24px;display:grid;gap:18px;}
			.rnta-waiver--terms .rnta-waiver__legal{box-shadow:none;}
			.rnta-waiver__legal-head{display:grid;gap:8px;}
			.rnta-waiver__legal-head span{width:max-content;max-width:100%;display:inline-flex;align-items:center;min-height:34px;padding:0 14px;border-radius:999px;border:1px solid rgba(237,79,143,.22);background:#fff;color:#ed4f8f;font:800 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;}
			.rnta-waiver__legal-head h4{margin:0;color:#ed4f8f;font:400 clamp(34px,4vw,52px)/.92 "Great Vibes",cursive;}
			.rnta-waiver__legal-head p,.rnta-waiver__legal-note{margin:0;color:#856b76;font:500 14px/1.65 "Quicksand",sans-serif;}
			.rnta-waiver__legal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
			.rnta-waiver__legal-section{border:1px solid rgba(237,79,143,.12);border-radius:22px;background:#fff;padding:16px;display:grid;gap:8px;}
			.rnta-waiver__legal-section h5{margin:0;color:#452c35;font:700 16px/1.18 "Quicksand",sans-serif;}
			.rnta-waiver__legal-section p{margin:0;color:#856b76;font:500 13px/1.58 "Quicksand",sans-serif;}
			.rnta-waiver__signature-pad{grid-column:1/-1;display:grid;gap:10px;}
			.rnta-waiver__signature-pad label,.rnta-waiver__signature-preview strong{color:#a4838f;font:800 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;}
			.rnta-waiver__canvas-wrap{position:relative;border:1px solid rgba(237,79,143,.18);border-radius:24px;background:#fff;padding:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.8);}
			.rnta-waiver__canvas-wrap::after{content:"Tap Sign before writing";position:absolute;inset:auto 18px 18px auto;pointer-events:none;border-radius:999px;background:rgba(255,255,255,.9);border:1px solid rgba(237,79,143,.18);color:#ed4f8f;font:800 11px/1 "Quicksand",sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:10px 12px;box-shadow:0 12px 24px rgba(69,44,53,.08);}
			.rnta-waiver__canvas-wrap.is-signing{border-color:rgba(237,79,143,.58);box-shadow:0 0 0 4px rgba(237,79,143,.08), inset 0 1px 0 rgba(255,255,255,.8);}
			.rnta-waiver__canvas-wrap.is-signing::after{content:"Signature mode on";background:#ed4f8f;border-color:#ed4f8f;color:#fff;}
			.rnta-waiver__canvas{display:block;width:100%;height:180px;border-radius:18px;background:linear-gradient(180deg,#fff,#fff8fb);touch-action:auto;cursor:pointer;}
			.rnta-waiver__canvas-wrap.is-signing .rnta-waiver__canvas{touch-action:none;cursor:crosshair;}
			.rnta-waiver__signature-actions{position:relative;z-index:5;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;color:#856b76;font:600 13px/1.45 "Quicksand",sans-serif;}
			.rnta-waiver__start-signature,.rnta-waiver__finish-signature,.rnta-waiver__clear-signature{position:relative;z-index:6;display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 18px;border-radius:999px;border:1px solid rgba(237,79,143,.22);background:#fff;color:#ed4f8f;font:800 12px/1 "Quicksand",sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent;}
			.rnta-waiver__start-signature{background:#ed4f8f;border-color:#ed4f8f;color:#fff;box-shadow:0 12px 24px rgba(237,79,143,.18);}
			.rnta-waiver__finish-signature{display:none;background:#452c35;border-color:#452c35;color:#fff;}
			.rnta-waiver__signature-pad.is-signing .rnta-waiver__start-signature{display:none;}
			.rnta-waiver__signature-pad.is-signing .rnta-waiver__finish-signature{display:inline-flex;align-items:center;}
			.rnta-waiver__signature-help{flex:1 1 220px;}
			.rnta-waiver__actions{grid-column:1/-1;display:flex;justify-content:center;}
			.rnta-waiver__btn{display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:0 28px;border-radius:999px;border:1px solid #ed4f8f;background:#ed4f8f;color:#fff;font:800 14px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;}
			.rnta-waiver__message{border-radius:22px;padding:16px 18px;font:700 14px/1.5 "Quicksand",sans-serif;}
			.rnta-waiver__message--success{background:#ecfdf3;border:1px solid #abefc6;color:#027a48;}
			.rnta-waiver__message--error{background:#fff1f3;border:1px solid #f8c7d4;color:#b42318;}
			.rnta-waiver__received{display:grid;gap:16px;}
			.rnta-waiver__received h4{margin:0;color:#452c35;font:700 28px/1.08 "Quicksand",sans-serif;}
			.rnta-waiver__signature-preview{display:grid;gap:10px;border:1px solid rgba(237,79,143,.12);border-radius:22px;background:#fff;padding:16px;}
			.rnta-waiver__signature-preview img{display:block;width:min(100%,420px);min-height:86px;border-radius:16px;border:1px solid rgba(237,79,143,.12);background:#fff;}
			@media (max-width:767px){
				.rnta-waiver{width:min(calc(100% - 20px),1200px);padding:24px 0;gap:16px;}
				.rnta-waiver--terms{width:100%;padding:0;}
				.rnta-waiver__lookup,.rnta-waiver__form,.rnta-waiver__summary,.rnta-waiver__legal-grid{grid-template-columns:1fr;}
				.rnta-waiver__card{padding:16px;border-radius:24px;}
				.rnta-waiver__birth-picker{grid-template-columns:1fr;}
				.rnta-waiver__acceptance-note{padding:15px 14px;border-radius:20px;}
				.rnta-waiver__acceptance-note strong{font-size:30px;}
				.rnta-waiver__legal{padding:16px;border-radius:24px;}
				.rnta-waiver--terms .rnta-waiver__legal{padding:14px;border-radius:20px;}
				.rnta-waiver__summary div,.rnta-waiver__terms,.rnta-waiver__legal-section{padding:14px;border-radius:18px;}
				.rnta-waiver--terms .rnta-waiver__legal-section{border-radius:16px;}
				.rnta-waiver__title{font-size:clamp(40px,13vw,58px);}
				.rnta-waiver__copy{font-size:14px;line-height:1.58;}
				.rnta-waiver__canvas-wrap{padding:8px;border-radius:20px;}
				.rnta-waiver__canvas-wrap::after{display:none;}
				.rnta-waiver__canvas{height:150px;border-radius:16px;}
				.rnta-waiver__signature-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
				.rnta-waiver__start-signature,.rnta-waiver__finish-signature,.rnta-waiver__clear-signature{width:100%;min-height:46px;padding:0 12px;}
				.rnta-waiver__clear-signature{grid-column:1/-1;}
				.rnta-waiver__signature-help{grid-column:1/-1;font-size:12px;line-height:1.45;}
				.rnta-waiver__actions{justify-content:stretch;}
				.rnta-waiver__btn{width:100%;}
			}
		</style>
		<script>
			document.addEventListener('DOMContentLoaded', function () {
				document.querySelectorAll('[data-rnta-guest-birthdate]').forEach(function (picker) {
					const hidden = picker.querySelector('[data-rnta-guest-birth-hidden]');
					const month = picker.querySelector('[data-rnta-guest-birth-month]');
					const day = picker.querySelector('[data-rnta-guest-birth-day]');
					const year = picker.querySelector('[data-rnta-guest-birth-year]');
					const note = picker.querySelector('[data-rnta-guest-age-note]');

					function syncBirthdate() {
						if (!hidden || !month || !day || !year) {
							return;
						}

						if (!month.value || !day.value || !year.value) {
							hidden.value = '';
							return;
						}

						hidden.value = `${year.value}-${month.value}-${day.value}`;

						if (note) {
							const birthdate = new Date(Number(year.value), Number(month.value) - 1, Number(day.value));
							const today = new Date();
							let age = today.getFullYear() - birthdate.getFullYear();
							const monthDiff = today.getMonth() - birthdate.getMonth();
							const dayDiff = today.getDate() - birthdate.getDate();
							if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
								age -= 1;
							}
							note.textContent = age > 0 ? `Invited child age: ${age}` : 'We use this only to keep the guest record accurate for the event.';
						}
					}

					[month, day, year].forEach(function (select) {
						if (select) {
							select.addEventListener('change', syncBirthdate);
						}
					});
				});

				document.querySelectorAll('.rnta-waiver__form').forEach(function (form) {
					const canvas = form.querySelector('.rnta-waiver__canvas');
					const canvasWrap = form.querySelector('.rnta-waiver__canvas-wrap');
					const input = form.querySelector('.rnta-waiver__drawn-signature');
					const startSign = form.querySelector('.rnta-waiver__start-signature');
					const finishSign = form.querySelector('.rnta-waiver__finish-signature');
					const clear = form.querySelector('.rnta-waiver__clear-signature');

					if (!canvas || !input) {
						return;
					}

					const ctx = canvas.getContext('2d');
					let drawing = false;
					let hasInk = false;
					let signingMode = false;

					function setSigningMode(isActive) {
						signingMode = Boolean(isActive);
						drawing = false;

						if (canvasWrap) {
							canvasWrap.classList.toggle('is-signing', signingMode);
						}

						form.classList.toggle('is-signing', signingMode);
						const signaturePad = form.querySelector('.rnta-waiver__signature-pad');
						if (signaturePad) {
							signaturePad.classList.toggle('is-signing', signingMode);
						}
					}

					function resetCanvas() {
						ctx.clearRect(0, 0, canvas.width, canvas.height);
						ctx.fillStyle = '#ffffff';
						ctx.fillRect(0, 0, canvas.width, canvas.height);
						ctx.strokeStyle = '#452c35';
						ctx.lineWidth = 4;
						ctx.lineCap = 'round';
						ctx.lineJoin = 'round';
						input.value = '';
						hasInk = false;
					}

					function getPoint(event) {
						const rect = canvas.getBoundingClientRect();
						const source = event.touches ? event.touches[0] : event;
						return {
							x: (source.clientX - rect.left) * (canvas.width / rect.width),
							y: (source.clientY - rect.top) * (canvas.height / rect.height)
						};
					}

					function start(event) {
						if (!signingMode) {
							return;
						}

						event.preventDefault();
						drawing = true;
						const point = getPoint(event);
						ctx.beginPath();
						ctx.moveTo(point.x, point.y);
					}

					function move(event) {
						if (!signingMode || !drawing) {
							return;
						}

						event.preventDefault();
						const point = getPoint(event);
						ctx.lineTo(point.x, point.y);
						ctx.stroke();
						hasInk = true;
						input.value = canvas.toDataURL('image/png');
					}

					function stop(event) {
						if (!signingMode || !drawing) {
							return;
						}

						event.preventDefault();
						drawing = false;
						if (hasInk) {
							input.value = canvas.toDataURL('image/png');
						}
					}

					function bindTap(element, callback) {
						if (!element) {
							return;
						}

						element.addEventListener('click', callback);
						element.addEventListener('touchend', function (event) {
							event.preventDefault();
							callback(event);
						}, { passive: false });
					}

					resetCanvas();
					setSigningMode(false);

					canvas.addEventListener('mousedown', start);
					canvas.addEventListener('mousemove', move);
					window.addEventListener('mouseup', stop);
					canvas.addEventListener('touchstart', start, { passive: false });
					canvas.addEventListener('touchmove', move, { passive: false });
					canvas.addEventListener('touchend', stop, { passive: false });

					bindTap(startSign, function () {
						setSigningMode(true);
						canvas.focus();
					});

					bindTap(finishSign, function () {
						setSigningMode(false);
					});

					bindTap(clear, function () {
						resetCanvas();
						setSigningMode(false);
					});

					form.addEventListener('submit', function (event) {
						if (!hasInk || !input.value) {
							event.preventDefault();
							alert('<?php echo esc_js( __( 'Please tap Sign, draw your signature, and tap OK before submitting the waiver.', 'rockntiara-reservations' ) ); ?>');
						}
					});
				});
			});
		</script>
		<?php
	}
}
