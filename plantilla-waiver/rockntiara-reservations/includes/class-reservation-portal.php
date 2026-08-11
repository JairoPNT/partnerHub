<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Portal {
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		add_shortcode( 'rnta_reservation_status_portal', array( $this, 'render_status_portal_shortcode' ) );
		add_shortcode( 'rnta_reservation_studio', array( $this, 'render_reservation_studio_shortcode' ) );
		add_shortcode( 'rnta_order_received_reservation_next', array( $this, 'render_order_received_shortcode' ) );
		add_action( 'init', array( $this, 'maybe_export_confirmed_calendar' ) );
		add_action( 'wp_footer', array( $this, 'print_assets' ), 100 );
	}

	public function render_status_portal_shortcode( $atts = array() ) {
		$atts = shortcode_atts(
			array(
				'title' => 'Check your reservation status',
			),
			$atts,
			'rnta_reservation_status_portal'
		);

		$lookup_number = isset( $_GET['reservation'] ) ? absint( wp_unslash( $_GET['reservation'] ) ) : 0;
		$access_code   = isset( $_GET['pass'] ) ? sanitize_text_field( wp_unslash( $_GET['pass'] ) ) : '';
		$reservation   = null;
		$error         = '';
		$notice        = array();

		if ( $lookup_number && $access_code ) {
			$reservation = RNTA_Reservations_Repository::instance()->get_by_lookup_credentials( $lookup_number, $access_code );
			if ( ! $reservation ) {
				$error = __( 'We could not find a reservation with that number and access code.', 'rockntiara-reservations' );
			} else {
				$notice = $this->maybe_handle_host_guest_actions( $reservation, $access_code );
			}
		}

		ob_start();
		?>
		<div class="rnta-res-portal">
			<div class="rnta-res-portal__intro">
				<span class="rnta-res-portal__eyebrow"><?php esc_html_e( 'Reservation lookup', 'rockntiara-reservations' ); ?></span>
				<h3 class="rnta-res-portal__title"><?php echo esc_html( $atts['title'] ); ?></h3>
				<p class="rnta-res-portal__copy"><?php esc_html_e( 'Use your order or reservation number together with your access code to review the current status of your celebration.', 'rockntiara-reservations' ); ?></p>
			</div>

			<form method="get" class="rnta-res-portal__form">
				<div class="rnta-res-portal__field">
					<label for="rnta-reservation-number"><?php esc_html_e( 'Order or reservation number', 'rockntiara-reservations' ); ?></label>
					<input type="number" name="reservation" id="rnta-reservation-number" value="<?php echo esc_attr( $lookup_number ); ?>" required>
				</div>
				<div class="rnta-res-portal__field">
					<label for="rnta-reservation-pass"><?php esc_html_e( 'Access code', 'rockntiara-reservations' ); ?></label>
					<input type="text" name="pass" id="rnta-reservation-pass" value="<?php echo esc_attr( $access_code ); ?>" required>
				</div>
				<div class="rnta-res-portal__actions">
					<button type="submit" class="rnta-res-portal__btn rnta-res-portal__btn--primary"><?php esc_html_e( 'Check reservation', 'rockntiara-reservations' ); ?></button>
				</div>
			</form>

			<?php if ( $error ) : ?>
				<div class="rnta-res-portal__message rnta-res-portal__message--error"><?php echo esc_html( $error ); ?></div>
			<?php endif; ?>

			<?php if ( ! empty( $notice['message'] ) ) : ?>
				<div class="rnta-res-portal__message rnta-res-portal__message--<?php echo esc_attr( ! empty( $notice['type'] ) ? $notice['type'] : 'success' ); ?>"><?php echo esc_html( $notice['message'] ); ?></div>
			<?php endif; ?>

			<?php if ( $reservation ) : ?>
				<?php echo $this->render_reservation_result( $reservation ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<?php endif; ?>
		</div>
		<?php

		return ob_get_clean();
	}

	public function render_order_received_shortcode( $atts = array() ) {
		if ( ! function_exists( 'wc_get_order' ) ) {
			return '';
		}

		$atts = shortcode_atts(
			array(
				'portal_url' => home_url( '/reservations/' ),
			),
			$atts,
			'rnta_order_received_reservation_next'
		);

		$order_id = absint( get_query_var( 'order-received' ) );

		if ( ! $order_id && isset( $_GET['key'] ) ) {
			$order_id = wc_get_order_id_by_order_key( sanitize_text_field( wp_unslash( $_GET['key'] ) ) );
		}

		if ( ! $order_id ) {
			return '';
		}

		$reservation = RNTA_Reservations_Repository::instance()->get_by_order_id( $order_id );

		if ( ! $reservation ) {
			$order = wc_get_order( $order_id );
			if ( $order ) {
				RNTA_Reservations_WooCommerce_Sync::instance()->sync_order( $order );
				$reservation = RNTA_Reservations_Repository::instance()->get_by_order_id( $order_id );
			}
		}

		if ( ! $reservation ) {
			return '';
		}

		$code       = RNTA_Reservations_Repository::instance()->ensure_access_code( $reservation['id'] );
		$portal_url = add_query_arg(
			array(
				'reservation' => $reservation['woo_order_id'],
				'pass'        => $code,
			),
			$atts['portal_url']
		);

		ob_start();
		?>
		<div class="rnta-order-next">
			<span class="rnta-order-next__eyebrow"><?php esc_html_e( 'Final step', 'rockntiara-reservations' ); ?></span>
			<h3 class="rnta-order-next__title"><?php esc_html_e( 'Finish your reservation process', 'rockntiara-reservations' ); ?></h3>
			<p class="rnta-order-next__copy"><?php esc_html_e( 'Please save your order number and access code. You will use them to check your reservation status and next updates.', 'rockntiara-reservations' ); ?></p>
			<div class="rnta-order-next__facts">
				<div><strong><?php esc_html_e( 'Order number', 'rockntiara-reservations' ); ?>:</strong> #<?php echo esc_html( $reservation['woo_order_id'] ); ?></div>
				<div><strong><?php esc_html_e( 'Access code', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $code ); ?></div>
				<div><strong><?php esc_html_e( 'Event location', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( RNTA_RESERVATIONS_VENUE_LABEL ); ?></div>
			</div>
			<div class="rnta-order-next__actions">
				<a href="<?php echo esc_url( $portal_url ); ?>" class="rnta-order-next__btn rnta-order-next__btn--primary"><?php esc_html_e( 'I am ready / Check my reservation', 'rockntiara-reservations' ); ?></a>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}

	public function render_reservation_studio_shortcode( $atts = array() ) {
		if ( ! is_user_logged_in() ) {
			return $this->render_reservation_studio_login_prompt();
		}

		if ( ! $this->current_user_can_manage_reservations() ) {
			return $this->render_reservation_studio_forbidden();
		}

		$atts = shortcode_atts(
			array(
				'title' => 'Reservation Studio',
				'limit' => 300,
			),
			$atts,
			'rnta_reservation_studio'
		);

		$notice = $this->maybe_handle_studio_actions();

		$status_filter  = isset( $_GET['rnta_status'] ) ? sanitize_text_field( wp_unslash( $_GET['rnta_status'] ) ) : '';
		$payment_filter = isset( $_GET['rnta_payment'] ) ? sanitize_text_field( wp_unslash( $_GET['rnta_payment'] ) ) : '';
		$search_filter  = isset( $_GET['rnta_search'] ) ? sanitize_text_field( wp_unslash( $_GET['rnta_search'] ) ) : '';

		$reservations = RNTA_Reservations_Repository::instance()->get_all( (int) $atts['limit'] );
		$stats        = $this->build_studio_stats( $reservations );
		$rows         = $this->filter_studio_reservations( $reservations, $status_filter, $payment_filter, $search_filter );
		$party_options = $this->get_studio_experience_options( 'party' );
		$addon_options = $this->get_studio_experience_options( 'addon' );
		$manual_blocks = RNTA_Reservations_Block_Repository::instance()->get_manual_blocks( 12 );
		$calendar_export_url = wp_nonce_url(
			add_query_arg( 'rnta_calendar_export', 'confirmed', home_url( '/reservation-studio/' ) ),
			'rnta_export_confirmed_calendar'
		);

		ob_start();
		?>
		<div class="rnta-studio">
			<div class="rnta-studio__hero">
				<div>
					<span class="rnta-res-portal__eyebrow"><?php esc_html_e( 'Internal dashboard', 'rockntiara-reservations' ); ?></span>
					<h3 class="rnta-res-portal__title"><?php echo esc_html( $atts['title'] ); ?></h3>
					<p class="rnta-res-portal__copy"><?php esc_html_e( 'Review reservations, payment stages, confirmed dates, and jump quickly into operational detail.', 'rockntiara-reservations' ); ?></p>
				</div>
				<div class="rnta-studio__hero-actions">
					<a href="<?php echo esc_url( $calendar_export_url ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Download confirmed events (.ics)', 'rockntiara-reservations' ); ?></a>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=rnta-reservations' ) ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Open wp-admin reservations', 'rockntiara-reservations' ); ?></a>
				</div>
			</div>

			<?php if ( ! empty( $notice['message'] ) ) : ?>
				<div class="rnta-studio__notice rnta-studio__notice--<?php echo esc_attr( ! empty( $notice['type'] ) ? $notice['type'] : 'success' ); ?>">
					<?php echo esc_html( $notice['message'] ); ?>
				</div>
			<?php endif; ?>

			<div class="rnta-studio__stats">
				<?php foreach ( $stats as $stat ) : ?>
					<div class="rnta-studio__stat-card">
						<span class="rnta-studio__stat-label"><?php echo esc_html( $stat['label'] ); ?></span>
						<strong class="rnta-studio__stat-value"><?php echo esc_html( $stat['value'] ); ?></strong>
					</div>
				<?php endforeach; ?>
			</div>

			<?php echo $this->render_studio_blackout_manager( $manual_blocks ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>

			<form method="get" class="rnta-studio__filters">
				<?php if ( is_page() ) : ?>
					<input type="hidden" name="page_id" value="<?php echo esc_attr( get_the_ID() ); ?>">
				<?php endif; ?>
				<div class="rnta-studio__filter">
					<label for="rnta_status"><?php esc_html_e( 'Reservation status', 'rockntiara-reservations' ); ?></label>
					<select name="rnta_status" id="rnta_status">
						<option value=""><?php esc_html_e( 'All statuses', 'rockntiara-reservations' ); ?></option>
						<?php foreach ( $this->get_studio_status_options() as $value => $label ) : ?>
							<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $status_filter, $value ); ?>><?php echo esc_html( $label ); ?></option>
						<?php endforeach; ?>
					</select>
				</div>
				<div class="rnta-studio__filter">
					<label for="rnta_payment"><?php esc_html_e( 'Payment stage', 'rockntiara-reservations' ); ?></label>
					<select name="rnta_payment" id="rnta_payment">
						<option value=""><?php esc_html_e( 'All payment stages', 'rockntiara-reservations' ); ?></option>
						<?php foreach ( $this->get_studio_payment_options() as $value => $label ) : ?>
							<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $payment_filter, $value ); ?>><?php echo esc_html( $label ); ?></option>
						<?php endforeach; ?>
					</select>
				</div>
				<div class="rnta-studio__filter rnta-studio__filter--search">
					<label for="rnta_search"><?php esc_html_e( 'Search host / child / party / order #', 'rockntiara-reservations' ); ?></label>
					<input type="text" name="rnta_search" id="rnta_search" value="<?php echo esc_attr( $search_filter ); ?>">
				</div>
				<div class="rnta-studio__filter-actions">
					<button type="submit" class="rnta-res-portal__btn rnta-res-portal__btn--primary"><?php esc_html_e( 'Apply filters', 'rockntiara-reservations' ); ?></button>
					<a href="<?php echo esc_url( home_url( '/reservation-studio/' ) ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Reset', 'rockntiara-reservations' ); ?></a>
				</div>
			</form>

			<div class="rnta-studio__list">
				<?php if ( empty( $rows ) ) : ?>
					<div class="rnta-res-portal__message rnta-res-portal__message--error"><?php esc_html_e( 'No reservations match the current filters.', 'rockntiara-reservations' ); ?></div>
				<?php else : ?>
					<?php foreach ( $rows as $reservation ) : ?>
						<?php
						$status_label  = $this->humanize_status( $reservation['reservation_status'] );
						$payment_label = $this->humanize_status( $reservation['payment_status'] );
						$addon_ids     = $this->get_selected_addon_ids( $reservation );
						$event_date    = ! empty( $reservation['confirmed_party_date'] ) ? $reservation['confirmed_party_date'] : $reservation['requested_party_date'];
						$event_time    = ! empty( $reservation['confirmed_start_time'] ) ? $reservation['confirmed_start_time'] : $reservation['requested_start_time'];
						$portal_code   = RNTA_Reservations_Repository::instance()->ensure_access_code( $reservation['id'] );
						$portal_link   = add_query_arg(
							array(
								'reservation' => $reservation['woo_order_id'],
								'pass'        => $portal_code,
							),
							home_url( '/reservations/' )
						);
						$waiver_repo        = RNTA_Reservations_Waiver_Repository::instance();
						RNTA_Reservations_Guest_Repository::instance()->cleanup_duplicate_pending_by_reservation_id( $reservation['id'] );
						$waiver             = $waiver_repo->get_by_reservation_id( $reservation['id'] );
						$waivers_signed     = $waiver_repo->count_by_reservation_id( $reservation['id'] );
						$managed_guests     = RNTA_Reservations_Guest_Repository::instance()->count_by_reservation_id( $reservation['id'] );
						$waiver_goal        = max( 1, $managed_guests > 0 ? $managed_guests : absint( $reservation['guest_count'] ) );
						$waiver_percent     = min( 100, (int) round( ( $waivers_signed / $waiver_goal ) * 100 ) );
						$host_waiver_is_complete = ! empty( $waiver ) && ( empty( $waiver['status'] ) || 'submitted' === $waiver['status'] );
						$waiver_label       = $host_waiver_is_complete ? __( 'Waiver Received', 'rockntiara-reservations' ) : __( 'Waiver Pending', 'rockntiara-reservations' );
						$waiver_badge_class = $host_waiver_is_complete ? 'received' : 'pending';
						$waiver_hue         = (int) round( 42 + ( ( 145 - 42 ) * ( $waiver_percent / 100 ) ) );
						$final_total        = (float) $reservation['final_negotiated_total'] > 0 ? (float) $reservation['final_negotiated_total'] : (float) $reservation['estimated_total'];
						$hold_status        = $this->get_studio_hold_status( $reservation );
						$google_calendar_url = $this->build_google_calendar_url( $reservation );
						?>
						<div class="rnta-studio__reservation-card">
							<div class="rnta-studio__reservation-top">
								<div>
									<span class="rnta-studio__reservation-kicker"><?php echo esc_html( '#' . $reservation['woo_order_id'] ); ?></span>
									<h4 class="rnta-studio__reservation-title"><?php echo esc_html( $reservation['party_name'] ); ?></h4>
									<p class="rnta-studio__reservation-copy"><?php echo esc_html( trim( $reservation['host_first_name'] . ' ' . $reservation['host_last_name'] ) ); ?> - <?php echo esc_html( $reservation['child_name'] ); ?></p>
								</div>
								<div class="rnta-studio__reservation-badges">
									<span class="rnta-res-portal__status-badge rnta-res-portal__status-badge--reservation rnta-res-portal__status-badge--<?php echo esc_attr( sanitize_html_class( $reservation['reservation_status'] ) ); ?>"><?php echo esc_html( $status_label ); ?></span>
									<span class="rnta-res-portal__status-badge rnta-res-portal__status-badge--payment rnta-res-portal__status-badge--<?php echo esc_attr( sanitize_html_class( $reservation['payment_status'] ) ); ?>"><?php echo esc_html( $payment_label ); ?></span>
									<span class="rnta-studio__waiver-badge rnta-studio__waiver-badge--<?php echo esc_attr( $waiver_badge_class ); ?>"><?php echo esc_html( $waiver_label ); ?></span>
								</div>
							</div>
							<div class="rnta-studio__reservation-grid">
								<div><strong><?php esc_html_e( 'Date', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $event_date ? $event_date : 'Pending' ); ?></div>
								<div><strong><?php esc_html_e( 'Time', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $event_time ? $event_time : 'Pending' ); ?></div>
								<div><strong><?php esc_html_e( 'Guests', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $reservation['guest_count'] ); ?></div>
								<div><strong><?php esc_html_e( 'Total', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( '$' . number_format( $final_total, 2 ) ); ?></div>
							</div>
							<?php if ( ! empty( $hold_status['message'] ) ) : ?>
								<div class="rnta-studio__hold-note rnta-studio__hold-note--<?php echo esc_attr( $hold_status['type'] ); ?>">
									<strong><?php echo esc_html( $hold_status['label'] ); ?></strong>
									<span><?php echo esc_html( $hold_status['message'] ); ?></span>
								</div>
							<?php endif; ?>
							<div class="rnta-studio__waiver-progress" style="<?php echo esc_attr( '--rnta-waiver-hue:' . $waiver_hue . ';--rnta-waiver-progress:' . $waiver_percent . '%;' ); ?>">
								<div class="rnta-studio__waiver-progress-head">
									<strong><?php esc_html_e( 'Invitations accepted', 'rockntiara-reservations' ); ?></strong>
									<span><?php echo esc_html( $waivers_signed . ' / ' . $waiver_goal . ' - ' . $waiver_percent . '%' ); ?></span>
								</div>
								<div class="rnta-studio__waiver-progress-track" aria-hidden="true">
									<span></span>
								</div>
								<p>
									<?php
									if ( $managed_guests > 0 ) {
										echo esc_html( sprintf( _n( '%d guest consent is still pending.', '%d guest consents are still pending.', max( 0, $managed_guests - $waivers_signed ), 'rockntiara-reservations' ), max( 0, $managed_guests - $waivers_signed ) ) );
									} else {
										esc_html_e( 'Guest invitations have not been added yet; this progress reflects the host waiver.', 'rockntiara-reservations' );
									}
									?>
								</p>
							</div>
							<div class="rnta-studio__reservation-actions">
								<a href="<?php echo esc_url( admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $reservation['id'] ) ) ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--primary"><?php esc_html_e( 'Open detail', 'rockntiara-reservations' ); ?></a>
								<?php if ( $google_calendar_url ) : ?>
									<a href="<?php echo esc_url( $google_calendar_url ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--secondary" target="_blank" rel="noopener"><?php esc_html_e( 'Add to Google Calendar', 'rockntiara-reservations' ); ?></a>
								<?php endif; ?>
								<?php if ( $waiver && ! empty( $waiver['waiver_pdf_path'] ) ) : ?>
									<a href="<?php echo esc_url( RNTA_Reservations_Waiver_PDF_Download::instance()->get_download_url( 'host', $reservation['id'] ) ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Download host waiver', 'rockntiara-reservations' ); ?></a>
								<?php endif; ?>
								<a href="<?php echo esc_url( admin_url( 'post.php?post=' . absint( $reservation['woo_order_id'] ) . '&action=edit' ) ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Woo order', 'rockntiara-reservations' ); ?></a>
								<a href="<?php echo esc_url( $portal_link ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--secondary" target="_blank" rel="noopener"><?php esc_html_e( 'Host portal', 'rockntiara-reservations' ); ?></a>
							</div>
							<details class="rnta-studio__editor">
								<summary><?php esc_html_e( 'Quick edit reservation', 'rockntiara-reservations' ); ?></summary>
								<form method="post" class="rnta-studio__editor-form">
									<?php wp_nonce_field( 'rnta_studio_update_reservation', 'rnta_studio_nonce' ); ?>
									<input type="hidden" name="rnta_studio_action" value="save_quick_edit">
									<input type="hidden" name="reservation_id" value="<?php echo esc_attr( $reservation['id'] ); ?>">
									<div class="rnta-studio__editor-grid">
										<div class="rnta-studio__editor-field">
											<label for="rnta_party_post_id_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Party selected', 'rockntiara-reservations' ); ?></label>
											<select id="rnta_party_post_id_<?php echo esc_attr( $reservation['id'] ); ?>" name="party_post_id">
												<option value="0"><?php esc_html_e( 'Keep current party text', 'rockntiara-reservations' ); ?></option>
												<?php foreach ( $party_options as $party_id => $party_title ) : ?>
													<option value="<?php echo esc_attr( $party_id ); ?>" <?php selected( (int) $reservation['party_post_id'], (int) $party_id ); ?>><?php echo esc_html( $party_title ); ?></option>
												<?php endforeach; ?>
											</select>
										</div>
										<div class="rnta-studio__editor-field">
											<label for="rnta_reservation_status_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Reservation status', 'rockntiara-reservations' ); ?></label>
											<select id="rnta_reservation_status_<?php echo esc_attr( $reservation['id'] ); ?>" name="reservation_status">
												<?php foreach ( $this->get_studio_status_options() as $value => $label ) : ?>
													<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $reservation['reservation_status'], $value ); ?>><?php echo esc_html( $label ); ?></option>
												<?php endforeach; ?>
											</select>
										</div>
										<div class="rnta-studio__editor-field">
											<label for="rnta_payment_status_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Payment status', 'rockntiara-reservations' ); ?></label>
											<select id="rnta_payment_status_<?php echo esc_attr( $reservation['id'] ); ?>" name="payment_status">
												<?php foreach ( $this->get_studio_payment_options() as $value => $label ) : ?>
													<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $reservation['payment_status'], $value ); ?>><?php echo esc_html( $label ); ?></option>
												<?php endforeach; ?>
											</select>
										</div>
										<div class="rnta-studio__editor-field">
											<label for="rnta_confirmed_party_date_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Confirmed party date', 'rockntiara-reservations' ); ?></label>
											<input type="date" id="rnta_confirmed_party_date_<?php echo esc_attr( $reservation['id'] ); ?>" name="confirmed_party_date" value="<?php echo esc_attr( $reservation['confirmed_party_date'] ); ?>">
										</div>
										<div class="rnta-studio__editor-field">
											<label for="rnta_confirmed_start_time_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Confirmed start time', 'rockntiara-reservations' ); ?></label>
											<input type="time" step="1800" id="rnta_confirmed_start_time_<?php echo esc_attr( $reservation['id'] ); ?>" name="confirmed_start_time" value="<?php echo esc_attr( $reservation['confirmed_start_time'] ); ?>">
										</div>
										<div class="rnta-studio__editor-field">
											<label for="rnta_confirmed_end_time_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Confirmed end time', 'rockntiara-reservations' ); ?></label>
											<input type="time" step="1800" id="rnta_confirmed_end_time_<?php echo esc_attr( $reservation['id'] ); ?>" name="confirmed_end_time" value="<?php echo esc_attr( $reservation['confirmed_end_time'] ); ?>">
										</div>
										<div class="rnta-studio__editor-field">
											<label for="rnta_final_negotiated_total_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Final negotiated total', 'rockntiara-reservations' ); ?></label>
											<input type="number" step="0.01" min="0" id="rnta_final_negotiated_total_<?php echo esc_attr( $reservation['id'] ); ?>" name="final_negotiated_total" value="<?php echo esc_attr( $reservation['final_negotiated_total'] ); ?>">
										</div>
										<div class="rnta-studio__editor-field">
											<label for="rnta_guest_count_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Guest count', 'rockntiara-reservations' ); ?></label>
											<input type="number" min="1" id="rnta_guest_count_<?php echo esc_attr( $reservation['id'] ); ?>" name="guest_count" value="<?php echo esc_attr( $reservation['guest_count'] ); ?>">
										</div>
										<div class="rnta-studio__editor-field">
											<label for="rnta_child_name_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Child name', 'rockntiara-reservations' ); ?></label>
											<input type="text" id="rnta_child_name_<?php echo esc_attr( $reservation['id'] ); ?>" name="child_name" value="<?php echo esc_attr( $reservation['child_name'] ); ?>">
										</div>
										<div class="rnta-studio__editor-field">
											<label for="rnta_child_age_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Child age', 'rockntiara-reservations' ); ?></label>
											<input type="text" id="rnta_child_age_<?php echo esc_attr( $reservation['id'] ); ?>" name="child_age" value="<?php echo esc_attr( $reservation['child_age'] ); ?>">
										</div>
										<div class="rnta-studio__editor-field rnta-studio__editor-field--full">
											<label><?php esc_html_e( 'Selected addons', 'rockntiara-reservations' ); ?></label>
											<?php if ( empty( $addon_options ) ) : ?>
												<p class="rnta-studio__editor-muted"><?php esc_html_e( 'No addons found yet in Experiences.', 'rockntiara-reservations' ); ?></p>
											<?php else : ?>
												<div class="rnta-studio__addon-checks">
													<?php foreach ( $addon_options as $addon_id => $addon_title ) : ?>
														<label class="rnta-studio__addon-check">
															<input type="checkbox" name="selected_addons[]" value="<?php echo esc_attr( $addon_id ); ?>" <?php checked( in_array( (int) $addon_id, $addon_ids, true ) ); ?>>
															<span><?php echo esc_html( $addon_title ); ?></span>
														</label>
													<?php endforeach; ?>
												</div>
											<?php endif; ?>
										</div>
										<div class="rnta-studio__editor-field rnta-studio__editor-field--full">
											<label for="rnta_reservation_notes_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Planning notes', 'rockntiara-reservations' ); ?></label>
											<textarea id="rnta_reservation_notes_<?php echo esc_attr( $reservation['id'] ); ?>" name="reservation_notes" rows="4"><?php echo esc_textarea( $reservation['reservation_notes'] ); ?></textarea>
										</div>
										<div class="rnta-studio__editor-field rnta-studio__editor-field--full">
											<label for="rnta_internal_notes_<?php echo esc_attr( $reservation['id'] ); ?>"><?php esc_html_e( 'Internal notes', 'rockntiara-reservations' ); ?></label>
											<textarea id="rnta_internal_notes_<?php echo esc_attr( $reservation['id'] ); ?>" name="internal_notes" rows="4"><?php echo esc_textarea( $reservation['internal_notes'] ); ?></textarea>
										</div>
									</div>
									<div class="rnta-studio__editor-helper">
										<div class="rnta-studio__editor-helper-item">
											<strong><?php esc_html_e( 'Requested date', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $reservation['requested_party_date'] ? $reservation['requested_party_date'] : '—' ); ?>
										</div>
										<div class="rnta-studio__editor-helper-item">
											<strong><?php esc_html_e( 'Requested start time', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $reservation['requested_start_time'] ? $reservation['requested_start_time'] : '—' ); ?>
										</div>
									</div>
									<div class="rnta-studio__editor-actions">
										<button type="submit" name="rnta_quick_action" value="verify_deposit" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Verify deposit', 'rockntiara-reservations' ); ?></button>
										<button type="submit" name="rnta_quick_action" value="confirm_reservation" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Confirm reservation', 'rockntiara-reservations' ); ?></button>
										<button type="submit" name="rnta_quick_action" value="mark_fully_paid" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Mark fully paid', 'rockntiara-reservations' ); ?></button>
										<button type="submit" name="rnta_copy_requested" value="1" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Use requested date & time', 'rockntiara-reservations' ); ?></button>
										<button type="submit" class="rnta-res-portal__btn rnta-res-portal__btn--primary"><?php esc_html_e( 'Save changes', 'rockntiara-reservations' ); ?></button>
									</div>
								</form>
							</details>
						</div>
					<?php endforeach; ?>
				<?php endif; ?>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}

	public function maybe_export_confirmed_calendar() {
		if ( empty( $_GET['rnta_calendar_export'] ) || 'confirmed' !== sanitize_text_field( wp_unslash( $_GET['rnta_calendar_export'] ) ) ) {
			return;
		}

		if ( ! is_user_logged_in() || ! $this->current_user_can_manage_reservations() ) {
			wp_die( esc_html__( 'Your account does not have permission to export confirmed events.', 'rockntiara-reservations' ), 403 );
		}

		check_admin_referer( 'rnta_export_confirmed_calendar' );

		$reservations = RNTA_Reservations_Repository::instance()->get_all( 1000 );
		$events       = array_values(
			array_filter(
				$reservations,
				function( $reservation ) {
					return $this->reservation_can_export_to_calendar( $reservation );
				}
			)
		);

		$ics = $this->build_confirmed_events_ics( $events );

		nocache_headers();
		header( 'Content-Type: text/calendar; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=rockntiara-confirmed-events.ics' );
		header( 'Content-Length: ' . strlen( $ics ) );
		echo $ics; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		exit;
	}

	private function reservation_can_export_to_calendar( $reservation ) {
		if ( ! in_array( $reservation['reservation_status'], array( 'confirmed', 'rescheduled' ), true ) ) {
			return false;
		}

		return ! empty( $reservation['confirmed_party_date'] ) && ! empty( $reservation['confirmed_start_time'] );
	}

	private function build_google_calendar_url( $reservation ) {
		if ( ! $this->reservation_can_export_to_calendar( $reservation ) ) {
			return '';
		}

		$range = $this->get_calendar_event_range( $reservation );
		if ( empty( $range['start'] ) || empty( $range['end'] ) ) {
			return '';
		}

		$title = sprintf(
			'Rock N Tiara Party - %s',
			! empty( $reservation['child_name'] ) ? $reservation['child_name'] : $reservation['party_name']
		);

		$details = $this->build_calendar_event_description( $reservation );

		return add_query_arg(
			array(
				'action'   => 'TEMPLATE',
				'text'     => $title,
				'dates'    => $range['start']->format( 'Ymd\THis' ) . '/' . $range['end']->format( 'Ymd\THis' ),
				'details'  => $details,
				'location' => RNTA_RESERVATIONS_VENUE_LABEL,
				'ctz'      => $this->get_calendar_timezone_string(),
			),
			'https://calendar.google.com/calendar/render'
		);
	}

	private function build_confirmed_events_ics( $reservations ) {
		$lines = array(
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Rock N Tiara//Reservations//EN',
			'CALSCALE:GREGORIAN',
			'METHOD:PUBLISH',
			'X-WR-CALNAME:Rock N Tiara Confirmed Parties',
			'X-WR-TIMEZONE:' . $this->escape_ics_text( $this->get_calendar_timezone_string() ),
		);

		foreach ( $reservations as $reservation ) {
			$range = $this->get_calendar_event_range( $reservation );
			if ( empty( $range['start'] ) || empty( $range['end'] ) ) {
				continue;
			}

			$summary = sprintf(
				'Rock N Tiara Party - %s',
				! empty( $reservation['child_name'] ) ? $reservation['child_name'] : $reservation['party_name']
			);

			$lines[] = 'BEGIN:VEVENT';
			$lines[] = 'UID:rnta-reservation-' . absint( $reservation['id'] ) . '@rockntiarakidsspa.com';
			$lines[] = 'DTSTAMP:' . gmdate( 'Ymd\THis\Z' );
			$lines[] = 'DTSTART:' . $range['start']->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Ymd\THis\Z' );
			$lines[] = 'DTEND:' . $range['end']->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Ymd\THis\Z' );
			$lines[] = $this->fold_ics_line( 'SUMMARY:' . $this->escape_ics_text( $summary ) );
			$lines[] = $this->fold_ics_line( 'LOCATION:' . $this->escape_ics_text( RNTA_RESERVATIONS_VENUE_LABEL ) );
			$lines[] = $this->fold_ics_line( 'DESCRIPTION:' . $this->escape_ics_text( $this->build_calendar_event_description( $reservation ) ) );
			$lines[] = 'END:VEVENT';
		}

		$lines[] = 'END:VCALENDAR';

		return implode( "\r\n", $lines ) . "\r\n";
	}

	private function get_calendar_event_range( $reservation ) {
		try {
			$timezone = wp_timezone();
			$date     = $reservation['confirmed_party_date'];
			$start    = $reservation['confirmed_start_time'];
			$end      = ! empty( $reservation['confirmed_end_time'] ) ? $reservation['confirmed_end_time'] : '';

			$start_datetime = new DateTimeImmutable( $date . ' ' . $start, $timezone );

			if ( $end ) {
				$end_datetime = new DateTimeImmutable( $date . ' ' . $end, $timezone );
				if ( $end_datetime <= $start_datetime ) {
					$end_datetime = $end_datetime->modify( '+1 day' );
				}
			} else {
				$duration_minutes = ! empty( $reservation['requested_duration_minutes'] ) ? absint( $reservation['requested_duration_minutes'] ) : 120;
				$end_datetime     = $start_datetime->modify( '+' . max( 30, $duration_minutes ) . ' minutes' );
			}

			return array(
				'start' => $start_datetime,
				'end'   => $end_datetime,
			);
		} catch ( Exception $exception ) {
			return array(
				'start' => null,
				'end'   => null,
			);
		}
	}

	private function build_calendar_event_description( $reservation ) {
		$lines = array(
			'Reservation #: ' . $reservation['woo_order_id'],
			'Party: ' . $reservation['party_name'],
			'Birthday child: ' . $reservation['child_name'],
			'Host: ' . trim( $reservation['host_first_name'] . ' ' . $reservation['host_last_name'] ),
			'Host email: ' . $reservation['host_email'],
			'Host phone: ' . $reservation['host_phone'],
			'Guests: ' . $reservation['guest_count'],
		);

		if ( ! empty( $reservation['reservation_notes'] ) ) {
			$lines[] = 'Planning notes: ' . $reservation['reservation_notes'];
		}

		if ( ! empty( $reservation['internal_notes'] ) ) {
			$lines[] = 'Internal notes: ' . $reservation['internal_notes'];
		}

		return implode( "\n", array_filter( $lines ) );
	}

	private function get_calendar_timezone_string() {
		$timezone = wp_timezone_string();
		return $timezone ? $timezone : 'America/New_York';
	}

	private function escape_ics_text( $text ) {
		$text = (string) $text;
		$text = str_replace( '\\', '\\\\', $text );
		$text = str_replace( ';', '\;', $text );
		$text = str_replace( ',', '\,', $text );
		$text = preg_replace( "/\r\n|\r|\n/", '\\n', $text );

		return $text;
	}

	private function fold_ics_line( $line ) {
		$output = '';

		while ( strlen( $line ) > 73 ) {
			$output .= substr( $line, 0, 73 ) . "\r\n ";
			$line    = substr( $line, 73 );
		}

		return $output . $line;
	}

	private function render_reservation_studio_login_prompt() {
		ob_start();
		?>
		<div class="rnta-studio-login">
			<div class="rnta-studio-login__card">
				<span class="rnta-res-portal__eyebrow"><?php esc_html_e( 'Staff access', 'rockntiara-reservations' ); ?></span>
				<h3 class="rnta-res-portal__title"><?php esc_html_e( 'Reservation Studio login', 'rockntiara-reservations' ); ?></h3>
				<p class="rnta-res-portal__copy"><?php esc_html_e( 'Sign in with your administrator account to manage reservations, payment verification, availability, and host follow-up from one place.', 'rockntiara-reservations' ); ?></p>
				<div class="rnta-studio-login__form-wrap">
					<?php
					wp_login_form(
						array(
							'echo'           => true,
							'redirect'       => home_url( '/reservation-studio/' ),
							'remember'       => true,
							'label_username' => __( 'Email or username', 'rockntiara-reservations' ),
							'label_password' => __( 'Password', 'rockntiara-reservations' ),
							'label_remember' => __( 'Keep me signed in', 'rockntiara-reservations' ),
							'label_log_in'   => __( 'Open Reservation Studio', 'rockntiara-reservations' ),
						)
					);
					?>
				</div>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}

	private function render_reservation_studio_forbidden() {
		ob_start();
		?>
		<div class="rnta-studio-login">
			<div class="rnta-studio-login__card">
				<span class="rnta-res-portal__eyebrow"><?php esc_html_e( 'Access restricted', 'rockntiara-reservations' ); ?></span>
				<h3 class="rnta-res-portal__title"><?php esc_html_e( 'Reservation Studio needs store manager access', 'rockntiara-reservations' ); ?></h3>
				<p class="rnta-res-portal__copy"><?php esc_html_e( 'Your account is logged in, but it does not have permission to manage reservation operations. Please use an administrator or WooCommerce manager profile.', 'rockntiara-reservations' ); ?></p>
				<div class="rnta-studio-login__actions">
					<a href="<?php echo esc_url( wp_logout_url( home_url( '/reservation-studio/' ) ) ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--primary"><?php esc_html_e( 'Sign in with another account', 'rockntiara-reservations' ); ?></a>
				</div>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}

	private function render_studio_blackout_manager( $manual_blocks ) {
		ob_start();
		?>
		<details class="rnta-studio__blackouts" open>
			<summary>
				<span>
					<strong><?php esc_html_e( 'Blackout Manager', 'rockntiara-reservations' ); ?></strong>
					<small><?php esc_html_e( 'Block holidays, closures, maintenance, or private unavailable windows from the frontend studio.', 'rockntiara-reservations' ); ?></small>
				</span>
				<em><?php esc_html_e( 'Open / close', 'rockntiara-reservations' ); ?></em>
			</summary>
			<div class="rnta-studio__blackout-grid">
				<form method="post" class="rnta-studio__blackout-form">
					<?php wp_nonce_field( 'rnta_studio_blackout', 'rnta_studio_blackout_nonce' ); ?>
					<input type="hidden" name="rnta_studio_action" value="create_blackout">
					<div class="rnta-studio__editor-field rnta-studio__editor-field--full">
						<label for="rnta_blackout_title"><?php esc_html_e( 'Blackout title', 'rockntiara-reservations' ); ?></label>
						<input type="text" id="rnta_blackout_title" name="blackout_title" placeholder="<?php esc_attr_e( 'Holiday closure / Maintenance / Private event', 'rockntiara-reservations' ); ?>" required>
					</div>
					<div class="rnta-studio__editor-field">
						<label for="rnta_blackout_start"><?php esc_html_e( 'Start date & time', 'rockntiara-reservations' ); ?></label>
						<input type="datetime-local" id="rnta_blackout_start" name="blackout_start" required>
					</div>
					<div class="rnta-studio__editor-field">
						<label for="rnta_blackout_end"><?php esc_html_e( 'End date & time', 'rockntiara-reservations' ); ?></label>
						<input type="datetime-local" id="rnta_blackout_end" name="blackout_end" required>
					</div>
					<div class="rnta-studio__editor-field rnta-studio__editor-field--full">
						<label for="rnta_blackout_notes"><?php esc_html_e( 'Internal notes', 'rockntiara-reservations' ); ?></label>
						<textarea id="rnta_blackout_notes" name="blackout_notes" rows="3" placeholder="<?php esc_attr_e( 'Optional note for the team.', 'rockntiara-reservations' ); ?>"></textarea>
					</div>
					<div class="rnta-studio__blackout-actions">
						<button type="submit" class="rnta-res-portal__btn rnta-res-portal__btn--primary"><?php esc_html_e( 'Create blackout', 'rockntiara-reservations' ); ?></button>
					</div>
				</form>
				<div class="rnta-studio__blackout-list">
					<h4><?php esc_html_e( 'Recent manual blackouts', 'rockntiara-reservations' ); ?></h4>
					<?php if ( empty( $manual_blocks ) ) : ?>
						<p class="rnta-studio__editor-muted"><?php esc_html_e( 'No manual blackouts have been created yet.', 'rockntiara-reservations' ); ?></p>
					<?php else : ?>
						<?php foreach ( $manual_blocks as $block ) : ?>
							<div class="rnta-studio__blackout-item">
								<div>
									<strong><?php echo esc_html( $block['title'] ); ?></strong>
									<span><?php echo esc_html( $this->format_studio_datetime_range( $block['start_datetime'], $block['end_datetime'] ) ); ?></span>
									<?php if ( ! empty( $block['notes'] ) ) : ?>
										<small><?php echo esc_html( $block['notes'] ); ?></small>
									<?php endif; ?>
								</div>
								<form method="post" class="rnta-studio__blackout-delete">
									<?php wp_nonce_field( 'rnta_studio_blackout', 'rnta_studio_blackout_nonce' ); ?>
									<input type="hidden" name="rnta_studio_action" value="delete_blackout">
									<input type="hidden" name="blackout_id" value="<?php echo esc_attr( $block['id'] ); ?>">
									<button type="submit" class="rnta-studio__danger-link" onclick="return confirm('<?php echo esc_js( __( 'Delete this blackout window?', 'rockntiara-reservations' ) ); ?>');"><?php esc_html_e( 'Delete', 'rockntiara-reservations' ); ?></button>
								</form>
							</div>
						<?php endforeach; ?>
					<?php endif; ?>
				</div>
			</div>
		</details>
		<?php
		return ob_get_clean();
	}

	private function format_studio_datetime_range( $start, $end ) {
		try {
			$start_date = new DateTimeImmutable( (string) $start );
			$end_date   = new DateTimeImmutable( (string) $end );
		} catch ( Exception $e ) {
			return trim( (string) $start . ' - ' . (string) $end );
		}

		return $start_date->format( 'M j, Y g:i A' ) . ' - ' . $end_date->format( 'M j, Y g:i A' );
	}

	private function current_user_can_manage_reservations() {
		return current_user_can( 'manage_options' ) || current_user_can( 'manage_woocommerce' );
	}

	private function maybe_handle_host_guest_actions( $reservation, $access_code ) {
		if ( 'POST' !== strtoupper( $_SERVER['REQUEST_METHOD'] ) ) {
			return array();
		}

		$action = isset( $_POST['rnta_host_action'] ) ? sanitize_text_field( wp_unslash( $_POST['rnta_host_action'] ) ) : '';

		if ( ! in_array( $action, array( 'add_guests', 'resend_pending_guests', 'update_guest' ), true ) ) {
			return array();
		}

		if ( empty( $_POST['rnta_host_guest_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rnta_host_guest_nonce'] ) ), 'rnta_host_guest_action_' . absint( $reservation['id'] ) ) ) {
			return array(
				'type'    => 'error',
				'message' => __( 'Security check failed. Please refresh and try again.', 'rockntiara-reservations' ),
			);
		}

		$posted_reservation = isset( $_POST['reservation'] ) ? absint( wp_unslash( $_POST['reservation'] ) ) : 0;
		$posted_pass        = isset( $_POST['pass'] ) ? sanitize_text_field( wp_unslash( $_POST['pass'] ) ) : '';

		if ( absint( $reservation['woo_order_id'] ) !== $posted_reservation || $access_code !== $posted_pass ) {
			return array(
				'type'    => 'error',
				'message' => __( 'Reservation verification failed. Please use your current reservation link.', 'rockntiara-reservations' ),
			);
		}

		$guest_repo = RNTA_Reservations_Guest_Repository::instance();

		if ( 'resend_pending_guests' === $action ) {
			$pending_guests = $guest_repo->get_pending_waiver_by_reservation_id( $reservation['id'] );
			$result         = $this->send_guest_invitation_batch( $reservation, $pending_guests, 'host_bulk_resend' );

			return array(
				'type'    => 'success',
				'message' => sprintf(
					/* translators: 1: sent count, 2: skipped count */
					__( '%1$d pending waiver invitation email(s) were sent. %2$d skipped.', 'rockntiara-reservations' ),
					$result['sent'],
					$result['skipped']
				),
			);
		}

		if ( 'update_guest' === $action ) {
			$guest_id = isset( $_POST['guest_id'] ) ? absint( wp_unslash( $_POST['guest_id'] ) ) : 0;
			$guest    = $guest_repo->get_by_id( $guest_id );

			if ( ! $guest || absint( $guest['reservation_id'] ) !== absint( $reservation['id'] ) ) {
				return array(
					'type'    => 'error',
					'message' => __( 'Guest invitation not found for this reservation.', 'rockntiara-reservations' ),
				);
			}

			if ( 'signed' === $guest['waiver_status'] ) {
				return array(
					'type'    => 'error',
					'message' => __( 'This guest already accepted the invitation consent, so the invitation record is locked.', 'rockntiara-reservations' ),
				);
			}

			$guest_name     = isset( $_POST['guest_name'] ) ? wp_unslash( $_POST['guest_name'] ) : '';
			$guardian_name  = isset( $_POST['guardian_name'] ) ? wp_unslash( $_POST['guardian_name'] ) : '';
			$guardian_email = isset( $_POST['guardian_email'] ) ? wp_unslash( $_POST['guardian_email'] ) : '';
			$updated        = $guest_repo->update_guest( $guest_id, $guest_name, $guardian_email, $guardian_name );

			if ( ! $updated ) {
				return array(
					'type'    => 'error',
					'message' => __( 'Guest invitation could not be updated. Please confirm the child name is filled.', 'rockntiara-reservations' ),
				);
			}

			$updated_guest = $guest_repo->get_by_id( $guest_id );
			$result        = $this->send_guest_invitation_batch( $reservation, array( $updated_guest ), 'host_invitation_updated' );

			return array(
				'type'    => 'success',
				'message' => sprintf(
					/* translators: %d: sent count */
					__( 'Guest invitation updated. %d invitation email(s) sent.', 'rockntiara-reservations' ),
					$result['sent']
				),
			);
		}

		$guest_repo->cleanup_duplicate_pending_by_reservation_id( $reservation['id'] );
		$contracted = max( 1, absint( $reservation['guest_count'] ) );
		$current    = $guest_repo->count_by_reservation_id( $reservation['id'] );
		$remaining  = max( 0, $contracted - $current );

		if ( $remaining <= 0 ) {
			return array(
				'type'    => 'error',
				'message' => __( 'All contracted guest invitation spaces are already filled. Please contact Rock N Tiara if you need to add more guests.', 'rockntiara-reservations' ),
			);
		}

		$guest_rows = isset( $_POST['guest_rows'] ) ? wp_unslash( $_POST['guest_rows'] ) : array();
		$guest_rows = is_array( $guest_rows ) ? array_slice( $guest_rows, 0, $remaining ) : array();
		$result     = $guest_repo->upsert_many_from_rows( $reservation, $guest_rows, $remaining );

		if ( ! empty( $result['guest_ids'] ) ) {
			$send_guests = array();

			foreach ( $result['guest_ids'] as $guest_id ) {
				$guest = $guest_repo->get_by_id( $guest_id );
				if ( $guest ) {
					$send_guests[] = $guest;
				}
			}

			$email_result = $this->send_guest_invitation_batch( $reservation, $send_guests, 'host_initial' );

			return array(
				'type'    => 'success',
				'message' => sprintf(
					/* translators: 1: created count, 2: updated count, 3: sent count */
					__( '%1$d guest invitation record(s) were added, %2$d updated, and %3$d invitation email(s) were sent.', 'rockntiara-reservations' ),
					absint( $result['created'] ),
					absint( $result['updated'] ),
					$email_result['sent']
				),
			);
		}

		return array(
			'type'    => 'error',
			'message' => __( 'No new guest invitations were added. Existing accepted invitations are locked, and duplicate rows are ignored.', 'rockntiara-reservations' ),
		);
	}

	private function send_guest_invitation_batch( $reservation, $guests, $trigger_source = 'host_batch' ) {
		$sent    = 0;
		$skipped = 0;

		foreach ( (array) $guests as $guest ) {
			if ( empty( $guest['guardian_email'] ) || 'signed' === $guest['waiver_status'] ) {
				$skipped++;
				continue;
			}

			if ( RNTA_Reservations_Email_Notifications::instance()->send_guest_invitation_email( $reservation, $guest, $trigger_source ) ) {
				RNTA_Reservations_Guest_Repository::instance()->mark_invited( $guest['id'] );
				$sent++;
			} else {
				$skipped++;
			}
		}

		return array(
			'sent'    => $sent,
			'skipped' => $skipped,
		);
	}

	private function render_reservation_result( $reservation ) {
		$status_label        = $this->get_host_reservation_status_label( $reservation );
		$payment_status_label= $this->get_host_payment_status_label( $reservation );
		$date_label          = ! empty( $reservation['confirmed_party_date'] ) ? $reservation['confirmed_party_date'] : $reservation['requested_party_date'];
		$time_label          = ! empty( $reservation['confirmed_start_time'] ) ? $reservation['confirmed_start_time'] : $reservation['requested_start_time'];
		$final_total         = (float) $reservation['final_negotiated_total'] > 0 ? (float) $reservation['final_negotiated_total'] : (float) $reservation['estimated_total'];
		$addons              = $this->parse_addons( $reservation );
		$home_url            = home_url( '/' );
		$contact_url         = home_url( '/contact/' );
		$next_step_message   = $this->get_host_next_step_message( $reservation );
		$status_summary      = $this->get_host_status_summary( $reservation );
		$access_code         = RNTA_Reservations_Repository::instance()->ensure_access_code( $reservation['id'] );
		$waiver              = RNTA_Reservations_Waiver_Repository::instance()->get_by_reservation_id( $reservation['id'] );
		$guest_repo          = RNTA_Reservations_Guest_Repository::instance();
		$guest_repo->cleanup_duplicate_pending_by_reservation_id( $reservation['id'] );
		$guests              = $guest_repo->get_by_reservation_id( $reservation['id'] );
		$guest_total         = count( $guests );
		$guest_goal          = max( 1, absint( $reservation['guest_count'] ) );
		$guest_remaining     = max( 0, $guest_goal - $guest_total );
		$guest_form_rows     = min( 8, $guest_remaining );
		$signed_guest_count  = $guest_repo->count_signed_by_reservation_id( $reservation['id'] );
		$pending_guests      = $guest_repo->get_pending_waiver_by_reservation_id( $reservation['id'] );
		$guest_percent       = min( 100, (int) round( ( $signed_guest_count / $guest_goal ) * 100 ) );
		$guest_hue           = (int) round( 42 + ( ( 145 - 42 ) * ( $guest_percent / 100 ) ) );
		$waiver_url          = add_query_arg(
			array(
				'reservation' => $reservation['woo_order_id'],
				'pass'        => $access_code,
			),
			home_url( '/waiver/' )
		);

		ob_start();
		?>
		<div class="rnta-res-portal__result">
			<div class="rnta-res-portal__result-top">
				<div>
					<span class="rnta-res-portal__result-label"><?php esc_html_e( 'Current status', 'rockntiara-reservations' ); ?></span>
					<h4 class="rnta-res-portal__result-status"><?php echo esc_html( $status_label ); ?></h4>
					<p class="rnta-res-portal__result-summary"><?php echo esc_html( $status_summary ); ?></p>
				</div>
				<div class="rnta-res-portal__result-badges">
					<div class="rnta-res-portal__pill"><?php echo esc_html( '#' . $reservation['woo_order_id'] ); ?></div>
					<div class="rnta-res-portal__status-badge rnta-res-portal__status-badge--reservation rnta-res-portal__status-badge--<?php echo esc_attr( sanitize_html_class( $reservation['reservation_status'] ) ); ?>">
						<?php echo esc_html( $status_label ); ?>
					</div>
					<div class="rnta-res-portal__status-badge rnta-res-portal__status-badge--payment rnta-res-portal__status-badge--<?php echo esc_attr( sanitize_html_class( $reservation['payment_status'] ) ); ?>">
						<?php echo esc_html( $payment_status_label ); ?>
					</div>
				</div>
			</div>
			<div class="rnta-res-portal__cards">
				<div class="rnta-res-portal__card">
					<h5><?php esc_html_e( 'Your celebration', 'rockntiara-reservations' ); ?></h5>
					<ul>
						<li><strong><?php esc_html_e( 'Party', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $reservation['party_name'] ); ?></li>
						<li><strong><?php esc_html_e( 'Child', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $reservation['child_name'] ); ?></li>
						<li><strong><?php esc_html_e( 'Guests', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $reservation['guest_count'] ); ?></li>
						<li><strong><?php esc_html_e( 'Date', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $date_label ? $date_label : 'Pending review' ); ?></li>
						<li><strong><?php esc_html_e( 'Time', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $time_label ? $time_label : 'Pending review' ); ?></li>
						<li><strong><?php esc_html_e( 'Location', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( RNTA_RESERVATIONS_VENUE_LABEL ); ?></li>
					</ul>
				</div>
				<div class="rnta-res-portal__card">
					<h5><?php esc_html_e( 'Deposit & estimate', 'rockntiara-reservations' ); ?></h5>
					<ul>
						<li><strong><?php esc_html_e( 'Deposit', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( '$' . number_format( (float) $reservation['deposit_amount'], 2 ) ); ?></li>
						<li><strong><?php esc_html_e( 'Payment status', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( $payment_status_label ); ?></li>
						<li><strong><?php esc_html_e( 'Estimated / agreed total', 'rockntiara-reservations' ); ?>:</strong> <?php echo esc_html( '$' . number_format( $final_total, 2 ) ); ?></li>
					</ul>
				</div>
				<div class="rnta-res-portal__card">
					<h5><?php esc_html_e( 'Next steps', 'rockntiara-reservations' ); ?></h5>
					<p class="rnta-res-portal__card-copy"><?php echo esc_html( $next_step_message ); ?></p>
					<div class="rnta-res-portal__note-box">
						<strong><?php esc_html_e( 'Access code', 'rockntiara-reservations' ); ?></strong>
						<p><?php echo esc_html( $access_code ); ?></p>
					</div>
					<?php if ( ! empty( $reservation['reservation_notes'] ) ) : ?>
						<div class="rnta-res-portal__note-box">
							<strong><?php esc_html_e( 'Your planning notes', 'rockntiara-reservations' ); ?></strong>
							<p><?php echo esc_html( $reservation['reservation_notes'] ); ?></p>
						</div>
					<?php endif; ?>
				</div>
			</div>
			<div class="rnta-res-portal__card rnta-res-portal__card--full rnta-res-portal__guest-box">
				<div class="rnta-res-portal__guest-head">
					<div>
						<span class="rnta-res-portal__result-label"><?php esc_html_e( 'Guest invitations', 'rockntiara-reservations' ); ?></span>
						<h5><?php esc_html_e( 'Add your invited children', 'rockntiara-reservations' ); ?></h5>
						<p class="rnta-res-portal__card-copy"><?php esc_html_e( 'Add one row per invited child. Rock N Tiara will use the parent email to send each guest a unique waiver link.', 'rockntiara-reservations' ); ?></p>
					</div>
					<div class="rnta-res-portal__guest-count">
						<strong><?php echo esc_html( $guest_total . ' / ' . $guest_goal ); ?></strong>
						<span><?php esc_html_e( 'guest slots filled', 'rockntiara-reservations' ); ?></span>
					</div>
				</div>
				<div class="rnta-res-portal__guest-progress" style="<?php echo esc_attr( '--rnta-waiver-hue:' . $guest_hue . ';--rnta-waiver-progress:' . $guest_percent . '%;' ); ?>">
					<div class="rnta-res-portal__guest-progress-head">
					<strong><?php esc_html_e( 'Invitations accepted', 'rockntiara-reservations' ); ?></strong>
						<span><?php echo esc_html( $signed_guest_count . ' / ' . $guest_goal . ' - ' . $guest_percent . '%' ); ?></span>
					</div>
					<div class="rnta-res-portal__guest-progress-track" aria-hidden="true"><span></span></div>
				</div>

				<?php if ( $guest_remaining > 0 ) : ?>
					<form method="post" class="rnta-res-portal__guest-form">
						<?php wp_nonce_field( 'rnta_host_guest_action_' . absint( $reservation['id'] ), 'rnta_host_guest_nonce' ); ?>
						<input type="hidden" name="rnta_host_action" value="add_guests">
						<input type="hidden" name="reservation" value="<?php echo esc_attr( $reservation['woo_order_id'] ); ?>">
						<input type="hidden" name="pass" value="<?php echo esc_attr( $access_code ); ?>">
						<div class="rnta-res-portal__guest-form-head">
							<span><?php esc_html_e( 'Child name', 'rockntiara-reservations' ); ?></span>
							<span><?php esc_html_e( 'Parent / guardian name', 'rockntiara-reservations' ); ?></span>
							<span><?php esc_html_e( 'Parent email', 'rockntiara-reservations' ); ?></span>
						</div>
						<?php for ( $i = 0; $i < $guest_form_rows; $i++ ) : ?>
							<div class="rnta-res-portal__guest-row">
								<input type="text" name="guest_rows[<?php echo esc_attr( $i ); ?>][guest_name]" placeholder="<?php esc_attr_e( 'Child name', 'rockntiara-reservations' ); ?>">
								<input type="text" name="guest_rows[<?php echo esc_attr( $i ); ?>][guardian_name]" placeholder="<?php esc_attr_e( 'Parent name', 'rockntiara-reservations' ); ?>">
								<input type="email" name="guest_rows[<?php echo esc_attr( $i ); ?>][guardian_email]" placeholder="<?php esc_attr_e( 'parent@email.com', 'rockntiara-reservations' ); ?>">
							</div>
						<?php endfor; ?>
						<p class="rnta-res-portal__guest-note"><?php echo esc_html( sprintf( __( '%d invitation spot(s) remaining. Empty rows are ignored.', 'rockntiara-reservations' ), $guest_remaining ) ); ?></p>
						<button type="submit" class="rnta-res-portal__btn rnta-res-portal__btn--primary"><?php esc_html_e( 'Save & send guest invitations', 'rockntiara-reservations' ); ?></button>
					</form>
				<?php else : ?>
					<div class="rnta-res-portal__message rnta-res-portal__message--success"><?php esc_html_e( 'All contracted guest invitation spaces are filled. Contact Rock N Tiara if you need to add more.', 'rockntiara-reservations' ); ?></div>
				<?php endif; ?>

				<?php if ( ! empty( $guests ) ) : ?>
					<?php if ( ! empty( $pending_guests ) ) : ?>
						<form method="post" class="rnta-res-portal__guest-resend-form">
							<?php wp_nonce_field( 'rnta_host_guest_action_' . absint( $reservation['id'] ), 'rnta_host_guest_nonce' ); ?>
							<input type="hidden" name="rnta_host_action" value="resend_pending_guests">
							<input type="hidden" name="reservation" value="<?php echo esc_attr( $reservation['woo_order_id'] ); ?>">
							<input type="hidden" name="pass" value="<?php echo esc_attr( $access_code ); ?>">
							<button type="submit" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Resend pending invitation consent links', 'rockntiara-reservations' ); ?></button>
						</form>
					<?php endif; ?>
					<div class="rnta-res-portal__guest-list">
						<?php foreach ( $guests as $guest ) : ?>
							<div class="rnta-res-portal__guest-item">
								<?php if ( 'signed' === $guest['waiver_status'] ) : ?>
									<div>
										<strong><?php echo esc_html( $guest['guest_name'] ); ?></strong>
										<span><?php echo esc_html( ! empty( $guest['guardian_email'] ) ? $guest['guardian_email'] : __( 'Parent email pending', 'rockntiara-reservations' ) ); ?></span>
										<?php if ( ! empty( $guest['guest_birthdate'] ) ) : ?>
											<span><?php echo esc_html( sprintf( __( 'Birthday: %1$s%2$s', 'rockntiara-reservations' ), $guest['guest_birthdate'], ! empty( $guest['guest_age'] ) ? ' - Age ' . absint( $guest['guest_age'] ) : '' ) ); ?></span>
										<?php endif; ?>
									</div>
									<span class="rnta-res-portal__guest-status rnta-res-portal__guest-status--signed"><?php esc_html_e( 'Invitation accepted', 'rockntiara-reservations' ); ?></span>
								<?php else : ?>
									<form method="post" class="rnta-res-portal__guest-edit-form">
										<?php wp_nonce_field( 'rnta_host_guest_action_' . absint( $reservation['id'] ), 'rnta_host_guest_nonce' ); ?>
										<input type="hidden" name="rnta_host_action" value="update_guest">
										<input type="hidden" name="guest_id" value="<?php echo esc_attr( $guest['id'] ); ?>">
										<input type="hidden" name="reservation" value="<?php echo esc_attr( $reservation['woo_order_id'] ); ?>">
										<input type="hidden" name="pass" value="<?php echo esc_attr( $access_code ); ?>">
										<div class="rnta-res-portal__guest-edit-fields">
											<input type="text" name="guest_name" value="<?php echo esc_attr( $guest['guest_name'] ); ?>" placeholder="<?php esc_attr_e( 'Child name', 'rockntiara-reservations' ); ?>">
											<input type="text" name="guardian_name" value="<?php echo esc_attr( $guest['guardian_name'] ); ?>" placeholder="<?php esc_attr_e( 'Parent name', 'rockntiara-reservations' ); ?>">
											<input type="email" name="guardian_email" value="<?php echo esc_attr( $guest['guardian_email'] ); ?>" placeholder="<?php esc_attr_e( 'Parent email', 'rockntiara-reservations' ); ?>">
										</div>
										<div class="rnta-res-portal__guest-edit-actions">
											<span class="rnta-res-portal__guest-status rnta-res-portal__guest-status--pending"><?php esc_html_e( 'Consent pending', 'rockntiara-reservations' ); ?></span>
											<button type="submit" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Save & send', 'rockntiara-reservations' ); ?></button>
										</div>
									</form>
								<?php endif; ?>
							</div>
						<?php endforeach; ?>
					</div>
				<?php endif; ?>
			</div>
			<?php if ( ! empty( $addons ) ) : ?>
				<div class="rnta-res-portal__card rnta-res-portal__card--full">
					<h5><?php esc_html_e( 'Selected addons', 'rockntiara-reservations' ); ?></h5>
					<div class="rnta-res-portal__addon-list">
						<?php foreach ( $addons as $addon ) : ?>
							<div class="rnta-res-portal__addon-item">
								<span><?php echo esc_html( $addon['name'] ); ?></span>
								<?php if ( isset( $addon['row_total'] ) && '' !== $addon['row_total'] && (float) $addon['row_total'] > 0 ) : ?>
									<strong><?php echo esc_html( '$' . number_format( (float) $addon['row_total'], 2 ) ); ?></strong>
								<?php elseif ( ! empty( $addon['display_price'] ) ) : ?>
									<strong><?php echo esc_html( $addon['display_price'] ); ?></strong>
								<?php else : ?>
									<strong><?php esc_html_e( 'Quoted separately', 'rockntiara-reservations' ); ?></strong>
								<?php endif; ?>
							</div>
						<?php endforeach; ?>
					</div>
				</div>
			<?php endif; ?>
			<div class="rnta-res-portal__footer-actions">
				<?php if ( $waiver ) : ?>
					<span class="rnta-res-portal__waiver-received"><?php esc_html_e( 'Waiver Received', 'rockntiara-reservations' ); ?></span>
				<?php else : ?>
					<a href="<?php echo esc_url( $waiver_url ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--primary"><?php esc_html_e( 'Complete Waiver', 'rockntiara-reservations' ); ?></a>
				<?php endif; ?>
				<a href="<?php echo esc_url( $contact_url ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--primary"><?php esc_html_e( 'Contact Rock N Tiara', 'rockntiara-reservations' ); ?></a>
				<a href="<?php echo esc_url( $home_url ); ?>" class="rnta-res-portal__btn rnta-res-portal__btn--secondary"><?php esc_html_e( 'Return Home', 'rockntiara-reservations' ); ?></a>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}

	private function parse_addons( $reservation ) {
		if ( empty( $reservation['addons_json'] ) ) {
			return array();
		}

		$decoded = json_decode( $reservation['addons_json'], true );

		return is_array( $decoded ) ? $decoded : array();
	}

	private function humanize_status( $status ) {
		return ucwords( str_replace( '_', ' ', (string) $status ) );
	}

	private function get_host_reservation_status_label( $reservation ) {
		$status = ! empty( $reservation['reservation_status'] ) ? $reservation['reservation_status'] : 'pending_schedule_review';

		$labels = array(
			'new_request'                 => __( 'Request received', 'rockntiara-reservations' ),
			'pending_schedule_review'     => __( 'Under review', 'rockntiara-reservations' ),
			'payment_pending'             => __( 'Waiting for deposit review', 'rockntiara-reservations' ),
			'payment_verified'            => __( 'Deposit reviewed', 'rockntiara-reservations' ),
			'pending_client_confirmation' => __( 'Waiting for final confirmation', 'rockntiara-reservations' ),
			'confirmed'                   => __( 'Confirmed', 'rockntiara-reservations' ),
			'rescheduled'                 => __( 'Schedule updated', 'rockntiara-reservations' ),
			'completed'                   => __( 'Completed', 'rockntiara-reservations' ),
			'canceled'                    => __( 'Canceled', 'rockntiara-reservations' ),
			'cancelled'                   => __( 'Canceled', 'rockntiara-reservations' ),
			'declined'                    => __( 'Declined', 'rockntiara-reservations' ),
			'expired'                     => __( 'Expired', 'rockntiara-reservations' ),
		);

		return isset( $labels[ $status ] ) ? $labels[ $status ] : $this->humanize_status( $status );
	}

	private function get_host_payment_status_label( $reservation ) {
		$status = ! empty( $reservation['payment_status'] ) ? $reservation['payment_status'] : 'pending_proof';

		$labels = array(
			'pending_proof'     => __( 'Pending payment proof/review', 'rockntiara-reservations' ),
			'deposit_submitted' => __( 'Deposit submitted for review', 'rockntiara-reservations' ),
			'proof_received'    => __( 'Payment proof received', 'rockntiara-reservations' ),
			'payment_verified'  => __( 'Deposit reviewed', 'rockntiara-reservations' ),
			'fully_paid'        => __( 'Paid in full', 'rockntiara-reservations' ),
			'payment_rejected'  => __( 'Payment needs attention', 'rockntiara-reservations' ),
			'refunded'          => __( 'Refunded', 'rockntiara-reservations' ),
		);

		return isset( $labels[ $status ] ) ? $labels[ $status ] : $this->humanize_status( $status );
	}

	private function get_host_status_summary( $reservation ) {
		$reservation_status = ! empty( $reservation['reservation_status'] ) ? $reservation['reservation_status'] : 'pending_schedule_review';
		$payment_status     = ! empty( $reservation['payment_status'] ) ? $reservation['payment_status'] : 'pending_proof';

		if ( 'confirmed' === $reservation_status ) {
			return __( 'Your party date and details have been confirmed by Rock N Tiara.', 'rockntiara-reservations' );
		}

		if ( in_array( $reservation_status, array( 'canceled', 'cancelled', 'declined', 'expired' ), true ) ) {
			return __( 'This reservation request is no longer active. Contact Rock N Tiara if you need help planning a new date.', 'rockntiara-reservations' );
		}

		if ( in_array( $payment_status, array( 'payment_verified', 'fully_paid' ), true ) ) {
			return __( 'Your deposit has been reviewed. The team is now confirming availability and final celebration details.', 'rockntiara-reservations' );
		}

		return __( 'Your request is active. Rock N Tiara is reviewing payment, availability, and celebration details.', 'rockntiara-reservations' );
	}

	private function get_studio_status_options() {
		return array(
			'new_request'             => __( 'New Request', 'rockntiara-reservations' ),
			'pending_schedule_review' => __( 'Pending Schedule Review', 'rockntiara-reservations' ),
			'payment_pending'         => __( 'Payment Pending', 'rockntiara-reservations' ),
			'payment_verified'        => __( 'Payment Verified', 'rockntiara-reservations' ),
			'pending_client_confirmation' => __( 'Pending Client Confirmation', 'rockntiara-reservations' ),
			'confirmed'               => __( 'Confirmed', 'rockntiara-reservations' ),
			'rescheduled'             => __( 'Rescheduled', 'rockntiara-reservations' ),
			'completed'               => __( 'Completed', 'rockntiara-reservations' ),
			'canceled'                => __( 'Canceled', 'rockntiara-reservations' ),
			'declined'                => __( 'Declined', 'rockntiara-reservations' ),
			'expired'                 => __( 'Expired', 'rockntiara-reservations' ),
		);
	}

	private function get_studio_payment_options() {
		return array(
			'pending_proof'    => __( 'Pending Proof', 'rockntiara-reservations' ),
			'deposit_submitted'=> __( 'Deposit Submitted', 'rockntiara-reservations' ),
			'proof_received'   => __( 'Proof Received', 'rockntiara-reservations' ),
			'payment_verified' => __( 'Payment Verified', 'rockntiara-reservations' ),
			'fully_paid'       => __( 'Fully Paid', 'rockntiara-reservations' ),
			'payment_rejected' => __( 'Payment Rejected', 'rockntiara-reservations' ),
			'refunded'         => __( 'Refunded', 'rockntiara-reservations' ),
		);
	}

	private function get_studio_hold_status( $reservation ) {
		$status         = ! empty( $reservation['reservation_status'] ) ? $reservation['reservation_status'] : 'pending_schedule_review';
		$payment_status = ! empty( $reservation['payment_status'] ) ? $reservation['payment_status'] : 'pending_proof';
		$engine         = RNTA_Reservations_Conflict_Engine::instance();
		$window         = $engine->build_window( $reservation );

		if ( in_array( $status, array( 'confirmed', 'rescheduled', 'pending_client_confirmation' ), true ) ) {
			return array(
				'type'    => 'confirmed',
				'label'   => __( 'Schedule block', 'rockntiara-reservations' ),
				'message' => __( 'This reservation is blocking the confirmed event window plus setup and cleanup buffers.', 'rockntiara-reservations' ),
			);
		}

		if ( in_array( $status, array( 'canceled', 'cancelled', 'declined', 'expired', 'completed' ), true ) ) {
			return array(
				'type'    => 'inactive',
				'label'   => __( 'Schedule hold', 'rockntiara-reservations' ),
				'message' => __( 'This reservation is not holding public availability.', 'rockntiara-reservations' ),
			);
		}

		if ( ! $window ) {
			return array(
				'type'    => 'warning',
				'label'   => __( 'Schedule hold', 'rockntiara-reservations' ),
				'message' => __( 'No requested or confirmed time window is available yet, so this reservation cannot block availability.', 'rockntiara-reservations' ),
			);
		}

		if ( in_array( $payment_status, array( 'payment_verified', 'fully_paid' ), true ) ) {
			return array(
				'type'    => 'review',
				'label'   => __( 'Schedule review', 'rockntiara-reservations' ),
				'message' => __( 'Payment has been reviewed. Confirm the reservation date and time to convert this into a confirmed schedule block.', 'rockntiara-reservations' ),
			);
		}

		$expires_at = $engine->get_hold_expiration_datetime( $reservation );

		if ( ! $expires_at ) {
			return array(
				'type'    => 'warning',
				'label'   => __( 'Temporary hold', 'rockntiara-reservations' ),
				'message' => __( 'The hold expiration could not be calculated. Review this reservation manually.', 'rockntiara-reservations' ),
			);
		}

		$expires_label = $expires_at->format( 'M j, Y g:i A' );

		if ( $engine->reservation_hold_is_active( $reservation ) ) {
			return array(
				'type'    => 'active',
				'label'   => __( 'Temporary hold active', 'rockntiara-reservations' ),
				'message' => sprintf(
					/* translators: %s: hold expiration date and time */
					__( 'Requested slot is held until %s unless payment is reviewed first.', 'rockntiara-reservations' ),
					$expires_label
				),
			);
		}

		return array(
			'type'    => 'expired',
			'label'   => __( 'Temporary hold expired', 'rockntiara-reservations' ),
			'message' => sprintf(
				/* translators: %s: hold expiration date and time */
				__( 'The requested slot stopped holding availability after %s because payment was not verified.', 'rockntiara-reservations' ),
				$expires_label
			),
		);
	}

	private function get_studio_experience_options( $type ) {
		if ( ! post_type_exists( 'rnta_experience' ) || ! taxonomy_exists( 'rnta_experience_type' ) ) {
			return array();
		}

		$query = new WP_Query(
			array(
				'post_type'      => 'rnta_experience',
				'post_status'    => 'publish',
				'posts_per_page' => 200,
				'orderby'        => array(
					'menu_order' => 'ASC',
					'title'      => 'ASC',
				),
				'order'          => 'ASC',
				'tax_query'      => array(
					array(
						'taxonomy' => 'rnta_experience_type',
						'field'    => 'slug',
						'terms'    => sanitize_title( $type ),
					),
				),
			)
		);

		$options = array();

		foreach ( $query->posts as $post ) {
			$options[ (int) $post->ID ] = get_the_title( $post );
		}

		wp_reset_postdata();

		return $options;
	}

	private function get_studio_experience_meta( $post_id ) {
		$post_id = absint( $post_id );

		if ( ! $post_id ) {
			return array();
		}

		return array(
			'id'                => $post_id,
			'name'              => get_the_title( $post_id ),
			'slug'              => get_post_field( 'post_name', $post_id ),
			'display_price'     => get_post_meta( $post_id, '_rnta_display_price', true ),
			'base_price'        => (float) get_post_meta( $post_id, '_rnta_base_price', true ),
			'included_guests'   => absint( get_post_meta( $post_id, '_rnta_included_guests', true ) ),
			'max_guests'        => absint( get_post_meta( $post_id, '_rnta_max_guests', true ) ),
			'extra_guest_price' => (float) get_post_meta( $post_id, '_rnta_extra_guest_price', true ),
			'pricing_model'     => get_post_meta( $post_id, '_rnta_pricing_model', true ),
		);
	}

	private function get_selected_addon_ids( $reservation ) {
		$addons = $this->parse_addons( $reservation );
		$ids    = array();

		foreach ( $addons as $addon ) {
			if ( ! empty( $addon['id'] ) ) {
				$ids[] = absint( $addon['id'] );
			}
		}

		return array_values( array_unique( array_filter( $ids ) ) );
	}

	private function build_addons_from_post_ids( $addon_ids ) {
		$addon_ids = array_values( array_unique( array_filter( array_map( 'absint', (array) $addon_ids ) ) ) );
		$addons    = array();

		foreach ( $addon_ids as $addon_id ) {
			$meta         = $this->get_studio_experience_meta( $addon_id );
			$display      = isset( $meta['display_price'] ) ? $meta['display_price'] : '';
			$price_number = 0;

			if ( '' !== $display ) {
				$price_number = (float) preg_replace( '/[^0-9.\-]/', '', (string) $display );
			}

			$addons[] = array(
				'id'            => $addon_id,
				'name'          => isset( $meta['name'] ) ? $meta['name'] : '',
				'display_price' => $display,
				'price_number'  => $price_number,
				'row_total'     => $price_number,
				'pricing_model' => isset( $meta['pricing_model'] ) ? $meta['pricing_model'] : 'fixed',
			);
		}

		return $addons;
	}

	private function build_studio_stats( $reservations ) {
		$total            = count( $reservations );
		$confirmed        = 0;
		$pending_payment  = 0;
		$verified_payment = 0;

		foreach ( $reservations as $reservation ) {
			if ( 'confirmed' === $reservation['reservation_status'] ) {
				$confirmed++;
			}
			if ( in_array( $reservation['payment_status'], array( 'pending_proof', 'deposit_submitted' ), true ) ) {
				$pending_payment++;
			}
			if ( in_array( $reservation['payment_status'], array( 'payment_verified', 'fully_paid' ), true ) ) {
				$verified_payment++;
			}
		}

		return array(
			array(
				'label' => __( 'Total reservations', 'rockntiara-reservations' ),
				'value' => $total,
			),
			array(
				'label' => __( 'Confirmed events', 'rockntiara-reservations' ),
				'value' => $confirmed,
			),
			array(
				'label' => __( 'Pending payment review', 'rockntiara-reservations' ),
				'value' => $pending_payment,
			),
			array(
				'label' => __( 'Verified payments', 'rockntiara-reservations' ),
				'value' => $verified_payment,
			),
		);
	}

	private function filter_studio_reservations( $reservations, $status_filter, $payment_filter, $search_filter ) {
		$search_filter = trim( strtolower( $search_filter ) );

		return array_values(
			array_filter(
				$reservations,
				function( $reservation ) use ( $status_filter, $payment_filter, $search_filter ) {
					if ( $status_filter && $reservation['reservation_status'] !== $status_filter ) {
						return false;
					}

					if ( $payment_filter && $reservation['payment_status'] !== $payment_filter ) {
						return false;
					}

					if ( '' !== $search_filter ) {
						$haystack = strtolower(
							implode(
								' ',
								array(
									$reservation['party_name'],
									$reservation['child_name'],
									$reservation['host_first_name'],
									$reservation['host_last_name'],
									$reservation['host_email'],
									(string) $reservation['woo_order_id'],
									(string) $reservation['id'],
								)
							)
						);

						if ( false === strpos( $haystack, $search_filter ) ) {
							return false;
						}
					}

					return true;
				}
			)
		);
	}

	private function get_host_next_step_message( $reservation ) {
		$reservation_status = ! empty( $reservation['reservation_status'] ) ? $reservation['reservation_status'] : 'pending_schedule_review';
		$payment_status     = ! empty( $reservation['payment_status'] ) ? $reservation['payment_status'] : 'pending_proof';

		if ( in_array( $payment_status, array( 'pending_proof', 'deposit_submitted' ), true ) ) {
			return __( 'We are waiting to review your payment proof. Once it is verified, Rock N Tiara will continue with schedule review and final confirmation.', 'rockntiara-reservations' );
		}

		if ( 'payment_verified' === $payment_status && 'confirmed' !== $reservation_status ) {
			return __( 'Your deposit has been reviewed. Rock N Tiara will now validate the requested date, time, and final celebration details before confirming the event.', 'rockntiara-reservations' );
		}

		if ( 'confirmed' === $reservation_status ) {
			return __( 'Your celebration is confirmed. If you need to update details or ask a question, contact Rock N Tiara directly and keep your reservation number handy.', 'rockntiara-reservations' );
		}

		if ( in_array( $reservation_status, array( 'canceled', 'cancelled', 'declined', 'expired' ), true ) ) {
			return __( 'This reservation is no longer active. If you need help restarting the process, please contact Rock N Tiara.', 'rockntiara-reservations' );
		}

		return __( 'Rock N Tiara is reviewing your reservation details and will contact you with the next update as soon as possible.', 'rockntiara-reservations' );
	}

	private function maybe_handle_studio_actions() {
		if ( 'POST' !== strtoupper( $_SERVER['REQUEST_METHOD'] ) ) {
			return array();
		}

		$studio_action = empty( $_POST['rnta_studio_action'] ) ? '' : sanitize_text_field( wp_unslash( $_POST['rnta_studio_action'] ) );

		if ( ! in_array( $studio_action, array( 'save_quick_edit', 'create_blackout', 'delete_blackout' ), true ) ) {
			return array();
		}

		if ( ! $this->current_user_can_manage_reservations() ) {
			return array(
				'type'    => 'error',
				'message' => __( 'Your account does not have permission to update reservations.', 'rockntiara-reservations' ),
			);
		}

		if ( in_array( $studio_action, array( 'create_blackout', 'delete_blackout' ), true ) ) {
			return $this->handle_studio_blackout_action( $studio_action );
		}

		if ( empty( $_POST['rnta_studio_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rnta_studio_nonce'] ) ), 'rnta_studio_update_reservation' ) ) {
			return array(
				'type'    => 'error',
				'message' => __( 'Security check failed. Please refresh and try again.', 'rockntiara-reservations' ),
			);
		}

		$reservation_id = isset( $_POST['reservation_id'] ) ? absint( wp_unslash( $_POST['reservation_id'] ) ) : 0;
		$reservation    = $reservation_id ? RNTA_Reservations_Repository::instance()->get_by_id( $reservation_id ) : null;

		if ( ! $reservation ) {
			return array(
				'type'    => 'error',
				'message' => __( 'Reservation not found.', 'rockntiara-reservations' ),
			);
		}

		$confirmed_party_date = isset( $_POST['confirmed_party_date'] ) ? sanitize_text_field( wp_unslash( $_POST['confirmed_party_date'] ) ) : '';
		$confirmed_start_time = isset( $_POST['confirmed_start_time'] ) ? sanitize_text_field( wp_unslash( $_POST['confirmed_start_time'] ) ) : '';
		$confirmed_end_time   = isset( $_POST['confirmed_end_time'] ) ? sanitize_text_field( wp_unslash( $_POST['confirmed_end_time'] ) ) : '';

		if ( ! empty( $_POST['rnta_copy_requested'] ) ) {
			$confirmed_party_date = ! empty( $reservation['requested_party_date'] ) ? $reservation['requested_party_date'] : $confirmed_party_date;
			$confirmed_start_time = ! empty( $reservation['requested_start_time'] ) ? $reservation['requested_start_time'] : $confirmed_start_time;
			$confirmed_end_time   = ! empty( $reservation['requested_end_time'] ) ? $reservation['requested_end_time'] : $confirmed_end_time;
		}

		$payment_status      = isset( $_POST['payment_status'] ) ? sanitize_text_field( wp_unslash( $_POST['payment_status'] ) ) : $reservation['payment_status'];
		$reservation_status  = isset( $_POST['reservation_status'] ) ? sanitize_text_field( wp_unslash( $_POST['reservation_status'] ) ) : $reservation['reservation_status'];
		$quick_action        = isset( $_POST['rnta_quick_action'] ) ? sanitize_text_field( wp_unslash( $_POST['rnta_quick_action'] ) ) : '';
		$payment_verified_at = $reservation['payment_verified_at'];
		$payment_verified_by = (int) $reservation['payment_verified_by'];

		if ( 'verify_deposit' === $quick_action ) {
			$payment_status     = 'payment_verified';
			$reservation_status = 'payment_verified';
		} elseif ( 'confirm_reservation' === $quick_action ) {
			$reservation_status = 'confirmed';
			if ( ! in_array( $payment_status, array( 'payment_verified', 'fully_paid' ), true ) ) {
				$payment_status = 'payment_verified';
			}
		} elseif ( 'mark_fully_paid' === $quick_action ) {
			$payment_status     = 'fully_paid';
			$reservation_status = 'completed';
		}

		if ( in_array( $payment_status, array( 'payment_verified', 'fully_paid' ), true ) && empty( $payment_verified_at ) ) {
			$payment_verified_at = current_time( 'mysql' );
			$payment_verified_by = get_current_user_id();
		}

		$party_post_id = isset( $_POST['party_post_id'] ) ? absint( wp_unslash( $_POST['party_post_id'] ) ) : absint( $reservation['party_post_id'] );
		$party_meta    = $party_post_id ? $this->get_studio_experience_meta( $party_post_id ) : array();
		$party_name    = ! empty( $party_meta['name'] ) ? $party_meta['name'] : $reservation['party_name'];
		$party_slug    = ! empty( $party_meta['slug'] ) ? $party_meta['slug'] : $reservation['party_slug'];
		$guest_count   = isset( $_POST['guest_count'] ) ? absint( wp_unslash( $_POST['guest_count'] ) ) : (int) $reservation['guest_count'];
		$included      = ! empty( $party_meta['included_guests'] ) ? absint( $party_meta['included_guests'] ) : absint( $reservation['included_guests'] );
		$extra_guests  = max( 0, $guest_count - $included );
		$addon_ids     = isset( $_POST['selected_addons'] ) ? array_map( 'absint', (array) wp_unslash( $_POST['selected_addons'] ) ) : array();
		$addons_json   = $this->build_addons_from_post_ids( $addon_ids );
		$estimated     = (float) $reservation['estimated_total'];

		if ( ! empty( $party_meta['base_price'] ) ) {
			$estimated = (float) $party_meta['base_price'];
			if ( ! empty( $party_meta['extra_guest_price'] ) && $extra_guests > 0 ) {
				$estimated += $extra_guests * (float) $party_meta['extra_guest_price'];
			}

			foreach ( $addons_json as $addon ) {
				if ( isset( $addon['row_total'] ) ) {
					$estimated += (float) $addon['row_total'];
				}
			}
		}

		$updated = RNTA_Reservations_Repository::instance()->update_operational_fields(
			$reservation_id,
			array(
				'party_post_id'          => $party_post_id,
				'party_name'             => $party_name,
				'party_slug'             => $party_slug,
				'reservation_status'     => $reservation_status,
				'payment_status'         => $payment_status,
				'payment_verified_at'    => $payment_verified_at,
				'payment_verified_by'    => $payment_verified_by,
				'confirmed_party_date'   => $confirmed_party_date,
				'confirmed_start_time'   => $confirmed_start_time,
				'confirmed_end_time'     => $confirmed_end_time,
				'final_negotiated_total' => isset( $_POST['final_negotiated_total'] ) ? (float) wp_unslash( $_POST['final_negotiated_total'] ) : (float) $reservation['final_negotiated_total'],
				'guest_count'            => $guest_count,
				'included_guests'        => $included,
				'extra_guest_count'      => $extra_guests,
				'estimated_total'        => $estimated,
				'addons_json'            => $addons_json,
				'child_name'             => isset( $_POST['child_name'] ) ? sanitize_text_field( wp_unslash( $_POST['child_name'] ) ) : $reservation['child_name'],
				'child_age'              => isset( $_POST['child_age'] ) ? sanitize_text_field( wp_unslash( $_POST['child_age'] ) ) : $reservation['child_age'],
				'reservation_notes'      => isset( $_POST['reservation_notes'] ) ? sanitize_textarea_field( wp_unslash( $_POST['reservation_notes'] ) ) : $reservation['reservation_notes'],
				'internal_notes'         => isset( $_POST['internal_notes'] ) ? sanitize_textarea_field( wp_unslash( $_POST['internal_notes'] ) ) : $reservation['internal_notes'],
			)
		);

		if ( $updated ) {
			RNTA_Reservations_Conflict_Engine::instance()->sync_reservation( $reservation_id );
			RNTA_Reservations_WooCommerce_Sync::instance()->sync_order_status_from_reservation( $reservation_id );
		}

		return array(
			'type'    => $updated ? 'success' : 'error',
			'message' => $updated ? __( 'Reservation updated successfully.', 'rockntiara-reservations' ) : __( 'No changes were saved. Please review the data and try again.', 'rockntiara-reservations' ),
		);
	}

	private function handle_studio_blackout_action( $studio_action ) {
		if ( empty( $_POST['rnta_studio_blackout_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rnta_studio_blackout_nonce'] ) ), 'rnta_studio_blackout' ) ) {
			return array(
				'type'    => 'error',
				'message' => __( 'Security check failed. Please refresh and try again.', 'rockntiara-reservations' ),
			);
		}

		if ( 'delete_blackout' === $studio_action ) {
			$blackout_id = isset( $_POST['blackout_id'] ) ? absint( wp_unslash( $_POST['blackout_id'] ) ) : 0;

			if ( ! $blackout_id ) {
				return array(
					'type'    => 'error',
					'message' => __( 'Blackout window not found.', 'rockntiara-reservations' ),
				);
			}

			$blackout = RNTA_Reservations_Block_Repository::instance()->get_by_id( $blackout_id );

			if ( ! $blackout || 'manual' !== $blackout['block_type'] ) {
				return array(
					'type'    => 'error',
					'message' => __( 'Only manual blackout windows can be deleted from Reservation Studio.', 'rockntiara-reservations' ),
				);
			}

			$deleted = RNTA_Reservations_Block_Repository::instance()->delete_by_id( $blackout_id );

			return array(
				'type'    => $deleted ? 'success' : 'error',
				'message' => $deleted ? __( 'Blackout window deleted.', 'rockntiara-reservations' ) : __( 'The blackout window could not be deleted.', 'rockntiara-reservations' ),
			);
		}

		$title = isset( $_POST['blackout_title'] ) ? sanitize_text_field( wp_unslash( $_POST['blackout_title'] ) ) : '';
		$start = isset( $_POST['blackout_start'] ) ? sanitize_text_field( wp_unslash( $_POST['blackout_start'] ) ) : '';
		$end   = isset( $_POST['blackout_end'] ) ? sanitize_text_field( wp_unslash( $_POST['blackout_end'] ) ) : '';
		$notes = isset( $_POST['blackout_notes'] ) ? sanitize_textarea_field( wp_unslash( $_POST['blackout_notes'] ) ) : '';

		if ( '' === $title || '' === $start || '' === $end ) {
			return array(
				'type'    => 'error',
				'message' => __( 'Title, start, and end are required to create a blackout window.', 'rockntiara-reservations' ),
			);
		}

		try {
			$start_datetime = new DateTimeImmutable( str_replace( 'T', ' ', $start ) );
			$end_datetime   = new DateTimeImmutable( str_replace( 'T', ' ', $end ) );
		} catch ( Exception $e ) {
			return array(
				'type'    => 'error',
				'message' => __( 'Please enter a valid blackout start and end time.', 'rockntiara-reservations' ),
			);
		}

		if ( $end_datetime <= $start_datetime ) {
			return array(
				'type'    => 'error',
				'message' => __( 'The blackout end time must be after the start time.', 'rockntiara-reservations' ),
			);
		}

		$start_mysql = $start_datetime->format( 'Y-m-d H:i:s' );
		$end_mysql   = $end_datetime->format( 'Y-m-d H:i:s' );
		$overlaps    = RNTA_Reservations_Block_Repository::instance()->get_overlaps( $start_mysql, $end_mysql );

		RNTA_Reservations_Block_Repository::instance()->create_manual_block( $title, $start_mysql, $end_mysql, $notes );

		return array(
			'type'    => empty( $overlaps ) ? 'success' : 'warning',
			'message' => empty( $overlaps )
				? __( 'Blackout window created.', 'rockntiara-reservations' )
				: __( 'Blackout window created, but it overlaps an existing blocked window. Please review availability.', 'rockntiara-reservations' ),
		);
	}

	public function print_assets() {
		static $printed = false;

		if ( $printed ) {
			return;
		}

		$printed = true;
		?>
		<style>
			.rnta-res-portal,
			.rnta-order-next{
				width:min(calc(100% - 32px),1200px);
				margin:0 auto;
				display:grid;
				gap:22px;
				padding:32px 0;
			}
			.rnta-res-portal__intro,
			.rnta-order-next{
				text-align:center;
			}
			.rnta-res-portal__eyebrow,
			.rnta-order-next__eyebrow{
				display:inline-flex;justify-self:center;align-items:center;min-height:40px;padding:0 18px;border-radius:999px;
				border:1px solid rgba(237,79,143,.22);background:rgba(255,255,255,.78);color:#ed4f8f;
				font:700 12px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;
			}
			.rnta-res-portal__title,
			.rnta-order-next__title{
				margin:0;color:#ed4f8f;font:400 clamp(42px,5vw,72px)/.92 "Great Vibes",cursive;
			}
			.rnta-res-portal__copy,
			.rnta-order-next__copy,
			.rnta-res-portal__field label,
			.rnta-res-portal__card li,
			.rnta-order-next__facts{
				color:#856b76;font:500 15px/1.7 "Quicksand",sans-serif;
			}
			.rnta-res-portal__form,
			.rnta-res-portal__result,
			.rnta-order-next{
				background:linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,248,251,.95));
				border:1px solid rgba(237,79,143,.16);
				border-radius:30px;
				padding:28px;
				box-shadow:0 18px 40px rgba(69,44,53,.06);
			}
			.rnta-res-portal__form{
				display:grid;
				grid-template-columns:repeat(2,minmax(0,1fr));
				gap:18px;
				align-items:end;
			}
			.rnta-res-portal__field{display:grid;gap:8px;}
			.rnta-res-portal__field input{
				width:100%;min-height:54px;border-radius:999px;border:1px solid rgba(237,79,143,.18);background:#fff;padding:0 18px;
				color:#452c35;font:600 15px/1 "Quicksand",sans-serif;
			}
			.rnta-res-portal__actions,
			.rnta-order-next__actions{display:flex;justify-content:center;align-items:center;}
			.rnta-res-portal__actions{grid-column:1/-1;}
			.rnta-res-portal__btn,
			.rnta-order-next__btn{
				display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:0 26px;border-radius:999px;border:1px solid #ed4f8f;
				font:800 14px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;
			}
			.rnta-res-portal__btn--primary,
			.rnta-order-next__btn--primary{
				background:#ed4f8f;color:#fff;
			}
			.rnta-res-portal__message--error{
				background:#fff1f3;border:1px solid #f8c7d4;border-radius:22px;padding:16px 18px;color:#b42318;
				font:700 14px/1.5 "Quicksand",sans-serif;
			}
			.rnta-res-portal__message--success{
				background:#ecfdf3;border:1px solid #abefc6;border-radius:22px;padding:16px 18px;color:#027a48;
				font:700 14px/1.5 "Quicksand",sans-serif;
			}
			.rnta-res-portal__result-top{
				display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px;
			}
			.rnta-res-portal__result-badges{
				display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end;
			}
			.rnta-res-portal__result-label{
				display:block;color:#a4838f;font:700 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px;
			}
			.rnta-res-portal__result-status{
				margin:0;color:#452c35;font:700 34px/1.02 "Quicksand",sans-serif;letter-spacing:-.04em;
			}
			.rnta-res-portal__result-summary{
				max-width:620px;margin:10px 0 0;color:#856b76;font:500 15px/1.65 "Quicksand",sans-serif;
			}
			.rnta-res-portal__pill{
				display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 16px;border-radius:999px;background:#fff3f8;color:#ed4f8f;
				font:800 13px/1 "Quicksand",sans-serif;
			}
			.rnta-res-portal__status-badge{
				display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 16px;border-radius:999px;
				font:800 12px/1 "Quicksand",sans-serif;letter-spacing:.04em;text-transform:uppercase;border:1px solid transparent;
			}
			.rnta-res-portal__status-badge--pending_schedule_review,
			.rnta-res-portal__status-badge--new_request,
			.rnta-res-portal__status-badge--deposit_submitted,
			.rnta-res-portal__status-badge--pending_proof{
				background:#fff6df;color:#9a6700;border-color:#f5d58b;
			}
			.rnta-res-portal__status-badge--payment_verified,
			.rnta-res-portal__status-badge--confirmed,
			.rnta-res-portal__status-badge--pending_client_confirmation,
			.rnta-res-portal__status-badge--rescheduled{
				background:#eef8ff;color:#175cd3;border-color:#b2ddff;
			}
			.rnta-res-portal__status-badge--fully_paid,
			.rnta-res-portal__status-badge--completed{
				background:#ecfdf3;color:#027a48;border-color:#abefc6;
			}
			.rnta-res-portal__status-badge--canceled,
			.rnta-res-portal__status-badge--cancelled,
			.rnta-res-portal__status-badge--declined,
			.rnta-res-portal__status-badge--payment_rejected,
			.rnta-res-portal__status-badge--expired{
				background:#fff1f3;color:#b42318;border-color:#f8c7d4;
			}
			.rnta-res-portal__cards{
				display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;
			}
			.rnta-res-portal__card{
				border:1px solid rgba(237,79,143,.12);border-radius:24px;padding:22px;background:#fff;
			}
			.rnta-res-portal__card--full{
				margin-top:18px;
			}
			.rnta-res-portal__card h5{
				margin:0 0 14px;color:#452c35;font:700 24px/1.08 "Quicksand",sans-serif;letter-spacing:-.03em;
			}
			.rnta-res-portal__card ul{margin:0;padding-left:18px;display:grid;gap:8px;}
			.rnta-res-portal__card-copy,
			.rnta-res-portal__note-box p,
			.rnta-res-portal__addon-item{
				color:#856b76;font:500 15px/1.7 "Quicksand",sans-serif;
			}
			.rnta-res-portal__note-box{
				margin-top:14px;padding-top:14px;border-top:1px solid rgba(237,79,143,.12);
			}
			.rnta-res-portal__note-box strong{
				display:block;margin-bottom:6px;color:#452c35;font:700 14px/1.2 "Quicksand",sans-serif;
			}
			.rnta-res-portal__note-box p{margin:0;}
			.rnta-res-portal__addon-list{
				display:grid;gap:10px;
			}
			.rnta-res-portal__addon-item{
				display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding-bottom:10px;border-bottom:1px solid rgba(237,79,143,.10);
			}
			.rnta-res-portal__addon-item:last-child{border-bottom:none;padding-bottom:0;}
			.rnta-res-portal__guest-box{
				display:grid;
				gap:18px;
			}
			.rnta-res-portal__guest-head{
				display:flex;
				justify-content:space-between;
				gap:18px;
				align-items:flex-start;
			}
			.rnta-res-portal__guest-count{
				min-width:150px;
				padding:16px 18px;
				border:1px solid rgba(237,79,143,.14);
				border-radius:22px;
				background:linear-gradient(180deg,rgba(255,243,248,.9),rgba(255,255,255,.96));
				text-align:center;
			}
			.rnta-res-portal__guest-count strong{
				display:block;
				color:#ed4f8f;
				font:800 30px/1 "Quicksand",sans-serif;
			}
			.rnta-res-portal__guest-count span{
				display:block;
				margin-top:8px;
				color:#856b76;
				font:700 11px/1.3 "Quicksand",sans-serif;
				letter-spacing:.08em;
				text-transform:uppercase;
			}
			.rnta-res-portal__guest-progress{
				display:grid;
				gap:10px;
				padding:16px;
				border:1px solid hsla(var(--rnta-waiver-hue),70%,46%,.24);
				border-radius:22px;
				background:linear-gradient(180deg,hsla(var(--rnta-waiver-hue),86%,96%,.88),rgba(255,255,255,.96));
			}
			.rnta-res-portal__guest-progress-head{
				display:flex;
				justify-content:space-between;
				gap:12px;
				color:#452c35;
				font:700 14px/1.35 "Quicksand",sans-serif;
			}
			.rnta-res-portal__guest-progress-head span{
				color:hsl(var(--rnta-waiver-hue),70%,34%);
				font-weight:800;
			}
			.rnta-res-portal__guest-progress-track{
				height:12px;
				overflow:hidden;
				border-radius:999px;
				background:rgba(69,44,53,.08);
			}
			.rnta-res-portal__guest-progress-track span{
				display:block;
				width:var(--rnta-waiver-progress);
				height:100%;
				border-radius:inherit;
				background:linear-gradient(90deg,#fbbf24,hsl(var(--rnta-waiver-hue),70%,46%));
				box-shadow:0 8px 18px hsla(var(--rnta-waiver-hue),70%,46%,.24);
			}
			.rnta-res-portal__guest-form{
				display:grid;
				gap:10px;
				padding:18px;
				border:1px solid rgba(237,79,143,.12);
				border-radius:24px;
				background:rgba(255,255,255,.62);
			}
			.rnta-res-portal__guest-form-head,
			.rnta-res-portal__guest-row{
				display:grid;
				grid-template-columns:1.05fr 1.05fr 1.35fr;
				gap:10px;
			}
			.rnta-res-portal__guest-form-head{
				color:#a4838f;
				font:800 11px/1 "Quicksand",sans-serif;
				letter-spacing:.08em;
				text-transform:uppercase;
			}
			.rnta-res-portal__guest-row input{
				width:100%;
				min-height:50px;
				padding:0 16px;
				border:1px solid rgba(237,79,143,.18);
				border-radius:18px;
				background:#fff;
				color:#452c35;
				font:600 14px/1 "Quicksand",sans-serif;
			}
			.rnta-res-portal__guest-note{
				margin:6px 0 0;
				color:#856b76;
				font:600 13px/1.5 "Quicksand",sans-serif;
			}
			.rnta-res-portal__guest-resend-form{
				display:flex;
				justify-content:flex-end;
			}
			.rnta-res-portal__guest-list{
				display:grid;
				gap:10px;
			}
			.rnta-res-portal__guest-item{
				display:flex;
				justify-content:space-between;
				gap:14px;
				align-items:center;
				padding:14px 16px;
				border:1px solid rgba(237,79,143,.12);
				border-radius:18px;
				background:#fff;
			}
			.rnta-res-portal__guest-item strong{
				display:block;
				color:#452c35;
				font:800 15px/1.3 "Quicksand",sans-serif;
			}
			.rnta-res-portal__guest-item span{
				display:block;
				margin-top:4px;
				color:#856b76;
				font:600 13px/1.4 "Quicksand",sans-serif;
				overflow-wrap:anywhere;
			}
			.rnta-res-portal__guest-edit-form{
				width:100%;
				display:grid;
				gap:12px;
			}
			.rnta-res-portal__guest-edit-fields{
				display:grid;
				grid-template-columns:1fr 1fr 1.25fr;
				gap:10px;
			}
			.rnta-res-portal__guest-edit-fields input{
				width:100%;
				min-height:46px;
				padding:0 14px;
				border:1px solid rgba(237,79,143,.16);
				border-radius:16px;
				background:rgba(255,255,255,.96);
				color:#452c35;
				font:600 13px/1 "Quicksand",sans-serif;
			}
			.rnta-res-portal__guest-edit-fields input:focus{
				border-color:#ed4f8f;
				outline:0;
				box-shadow:0 0 0 3px rgba(237,79,143,.12);
			}
			.rnta-res-portal__guest-edit-actions{
				display:flex;
				justify-content:space-between;
				gap:12px;
				align-items:center;
			}
			.rnta-res-portal__guest-status{
				display:inline-flex;
				align-items:center;
				justify-content:center;
				min-height:34px;
				padding:0 12px;
				border-radius:999px;
				font:800 11px/1 "Quicksand",sans-serif;
				letter-spacing:.05em;
				text-transform:uppercase;
				white-space:nowrap;
			}
			.rnta-res-portal__guest-status--pending{
				background:#fff6df;
				color:#9a6700;
				border:1px solid #f5d58b;
			}
			.rnta-res-portal__guest-status--signed{
				background:#ecfdf3;
				color:#027a48;
				border:1px solid #abefc6;
			}
			.rnta-res-portal__footer-actions{
				display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:18px;
			}
			.rnta-res-portal__btn--secondary{
				background:#fff;color:#ed4f8f;
			}
			.rnta-res-portal__waiver-received{
				display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:0 24px;border-radius:999px;
				background:#ecfdf3;border:1px solid #abefc6;color:#027a48;font:800 14px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;
			}
			.rnta-order-next__facts{
				display:flex;gap:18px;justify-content:center;flex-wrap:wrap;
			}
			.rnta-studio{
				width:min(calc(100% - 32px), 1200px);
				margin:0 auto;
				display:grid;
				gap:22px;
				padding:28px 0 40px;
			}
			.rnta-studio-login{
				width:min(calc(100% - 32px), 920px);
				margin:0 auto;
				padding:32px 0 48px;
			}
			.rnta-studio-login__card{
				background:linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,248,251,.95));
				border:1px solid rgba(237,79,143,.16);
				border-radius:34px;
				padding:32px;
				box-shadow:0 18px 40px rgba(69,44,53,.06);
				display:grid;
				gap:18px;
				text-align:center;
			}
			.rnta-studio-login__form-wrap{
				width:min(100%, 520px);
				margin:0 auto;
			}
			.rnta-studio-login__form-wrap form{
				display:grid;
				gap:14px;
				text-align:left;
			}
			.rnta-studio-login__form-wrap label{
				color:#a4838f;font:700 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;
			}
			.rnta-studio-login__form-wrap input[type="text"],
			.rnta-studio-login__form-wrap input[type="password"]{
				width:100%;min-height:56px;border-radius:999px;border:1px solid rgba(237,79,143,.18);background:#fff;padding:0 18px;
				color:#452c35;font:600 15px/1 "Quicksand",sans-serif;
			}
			.rnta-studio-login__form-wrap .login-remember{
				display:flex;align-items:center;gap:10px;color:#856b76;font:600 14px/1.4 "Quicksand",sans-serif;
			}
			.rnta-studio-login__form-wrap .login-submit,
			.rnta-studio-login__actions{
				display:flex;justify-content:center;
			}
			.rnta-studio-login__form-wrap .button-primary{
				display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:0 26px;border-radius:999px;border:1px solid #ed4f8f;background:#ed4f8f;color:#fff;
				font:800 14px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;box-shadow:none;
			}
			.rnta-studio__hero,
			.rnta-studio__filters,
			.rnta-studio__reservation-card,
			.rnta-studio__stat-card{
				background:linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,248,251,.95));
				border:1px solid rgba(237,79,143,.16);
				border-radius:30px;
				box-shadow:0 18px 40px rgba(69,44,53,.06);
			}
			.rnta-studio__hero{
				padding:28px;
				display:flex;
				justify-content:space-between;
				gap:18px;
				align-items:flex-end;
			}
			.rnta-studio__notice{
				border-radius:22px;
				padding:16px 18px;
				font:700 14px/1.5 "Quicksand",sans-serif;
			}
			.rnta-studio__notice--success{
				background:#ecfdf3;border:1px solid #abefc6;color:#027a48;
			}
			.rnta-studio__notice--error{
				background:#fff1f3;border:1px solid #f8c7d4;color:#b42318;
			}
			.rnta-studio__notice--warning{
				background:#fffaeb;border:1px solid #fedf89;color:#93370d;
			}
			.rnta-studio__hero-actions{
				display:flex;
				flex-wrap:wrap;
				gap:12px;
			}
			.rnta-studio__stats{
				display:grid;
				grid-template-columns:repeat(4, minmax(0, 1fr));
				gap:18px;
			}
			.rnta-studio__stat-card{
				padding:22px;
				display:grid;
				gap:10px;
			}
			.rnta-studio__stat-label{
				color:#a4838f;font:700 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;
			}
			.rnta-studio__stat-value{
				color:#452c35;font:700 clamp(28px, 3vw, 40px)/1 "Quicksand",sans-serif;letter-spacing:-.04em;
			}
			.rnta-studio__filters{
				padding:22px;
				display:grid;
				grid-template-columns:repeat(4, minmax(0, 1fr));
				gap:16px;
				align-items:end;
			}
			.rnta-studio__filter{
				display:grid;
				gap:8px;
			}
			.rnta-studio__filter label{
				color:#a4838f;font:700 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;
			}
			.rnta-studio__filter select,
			.rnta-studio__filter input{
				width:100%;min-height:52px;padding:0 16px;border-radius:18px;border:1px solid rgba(237,79,143,.18);background:#fff;color:#452c35;
				font:600 14px/1 "Quicksand",sans-serif;
			}
			.rnta-studio__filter--search{
				grid-column:span 2;
			}
			.rnta-studio__filter-actions{
				grid-column:1/-1;
				display:flex;
				flex-wrap:wrap;
				gap:12px;
			}
			.rnta-studio__list{
				display:grid;
				gap:18px;
			}
			.rnta-studio__reservation-card{
				padding:24px;
				display:grid;
				gap:18px;
			}
			.rnta-studio__reservation-top{
				display:flex;
				justify-content:space-between;
				gap:18px;
				align-items:flex-start;
			}
			.rnta-studio__reservation-kicker{
				display:block;color:#a4838f;font:700 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px;
			}
			.rnta-studio__reservation-title{
				margin:0;color:#452c35;font:700 30px/1.02 "Quicksand",sans-serif;letter-spacing:-.04em;
			}
			.rnta-studio__reservation-copy{
				margin:8px 0 0;color:#856b76;font:500 15px/1.6 "Quicksand",sans-serif;
			}
			.rnta-studio__reservation-badges,
			.rnta-studio__reservation-actions{
				display:flex;
				flex-wrap:wrap;
				gap:10px;
			}
			.rnta-studio__waiver-badge{
				display:inline-flex;
				align-items:center;
				justify-content:center;
				min-height:40px;
				padding:0 16px;
				border-radius:999px;
				font:800 12px/1 "Quicksand",sans-serif;
				letter-spacing:.06em;
				text-transform:uppercase;
			}
			.rnta-studio__waiver-badge--pending{
				background:#fffbeb;
				border:1px solid #fbbf24;
				color:#92400e;
			}
			.rnta-studio__waiver-badge--received{
				background:#ecfdf3;
				border:1px solid #abefc6;
				color:#027a48;
			}
			.rnta-studio__waiver-progress{
				display:grid;
				gap:10px;
				padding:16px;
				border:1px solid hsla(var(--rnta-waiver-hue),70%,46%,.24);
				border-radius:22px;
				background:linear-gradient(180deg,hsla(var(--rnta-waiver-hue),86%,96%,.88),rgba(255,255,255,.96));
			}
			.rnta-studio__waiver-progress-head{
				display:flex;
				align-items:center;
				justify-content:space-between;
				gap:12px;
				color:#452c35;
				font:700 14px/1.35 "Quicksand",sans-serif;
			}
			.rnta-studio__waiver-progress-head span{
				color:hsl(var(--rnta-waiver-hue),70%,34%);
				font-weight:800;
			}
			.rnta-studio__waiver-progress-track{
				height:12px;
				overflow:hidden;
				border-radius:999px;
				background:rgba(69,44,53,.08);
			}
			.rnta-studio__waiver-progress-track span{
				display:block;
				width:var(--rnta-waiver-progress);
				height:100%;
				border-radius:inherit;
				background:linear-gradient(90deg,#fbbf24,hsl(var(--rnta-waiver-hue),70%,46%));
				box-shadow:0 8px 18px hsla(var(--rnta-waiver-hue),70%,46%,.24);
			}
			.rnta-studio__waiver-progress p{
				margin:0;
				color:#856b76;
				font:500 12px/1.5 "Quicksand",sans-serif;
			}
			.rnta-studio__editor{
				border-top:1px solid rgba(237,79,143,.12);
				padding-top:18px;
			}
			.rnta-studio__editor summary{
				cursor:pointer;
				color:#ed4f8f;
				font:800 14px/1.2 "Quicksand",sans-serif;
				letter-spacing:.06em;
				text-transform:uppercase;
				list-style:none;
			}
			.rnta-studio__editor summary::-webkit-details-marker{display:none;}
			.rnta-studio__editor-form{
				display:grid;
				gap:18px;
				margin-top:18px;
			}
			.rnta-studio__editor-grid{
				display:grid;
				grid-template-columns:repeat(3,minmax(0,1fr));
				gap:14px 16px;
			}
			.rnta-studio__editor-field{
				display:grid;
				gap:8px;
			}
			.rnta-studio__editor-field--full{
				grid-column:1/-1;
			}
			.rnta-studio__editor-field label{
				color:#a4838f;font:700 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;
			}
			.rnta-studio__editor-field input,
			.rnta-studio__editor-field select,
			.rnta-studio__editor-field textarea{
				width:100%;
				border:1px solid rgba(237,79,143,.18);
				background:#fff;
				color:#452c35;
				font:600 14px/1.4 "Quicksand",sans-serif;
			}
			.rnta-studio__editor-field input,
			.rnta-studio__editor-field select{
				min-height:50px;
				padding:0 16px;
				border-radius:18px;
			}
			.rnta-studio__editor-field textarea{
				min-height:120px;
				padding:14px 16px;
				border-radius:22px;
				resize:vertical;
			}
			.rnta-studio__editor-muted{
				margin:0;
				color:#856b76;
				font:600 14px/1.5 "Quicksand",sans-serif;
			}
			.rnta-studio__addon-checks{
				display:grid;
				grid-template-columns:repeat(3,minmax(0,1fr));
				gap:10px;
			}
			.rnta-studio__addon-check{
				display:flex;
				gap:10px;
				align-items:flex-start;
				min-height:48px;
				padding:12px 14px;
				border:1px solid rgba(237,79,143,.16);
				border-radius:18px;
				background:#fff;
				color:#452c35;
				font:700 13px/1.35 "Quicksand",sans-serif;
			}
			.rnta-studio__addon-check input{
				width:18px;
				height:18px;
				margin:0;
				accent-color:#ed4f8f;
			}
			.rnta-studio__editor-helper{
				display:flex;
				flex-wrap:wrap;
				gap:12px 18px;
				color:#856b76;
				font:500 14px/1.6 "Quicksand",sans-serif;
			}
			.rnta-studio__editor-helper-item strong{
				color:#452c35;
			}
			.rnta-studio__editor-actions{
				display:flex;
				flex-wrap:wrap;
				gap:12px;
				align-items:center;
			}
			.rnta-studio__blackouts{
				border:1px solid rgba(237,79,143,.16);
				border-radius:28px;
				background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,248,251,.95));
				padding:20px;
				box-shadow:0 18px 40px rgba(69,44,53,.05);
			}
			.rnta-studio__blackouts summary{
				display:flex;
				align-items:center;
				justify-content:space-between;
				gap:18px;
				cursor:pointer;
				list-style:none;
				color:#452c35;
			}
			.rnta-studio__blackouts summary::-webkit-details-marker{display:none;}
			.rnta-studio__blackouts summary span{
				display:grid;
				gap:5px;
			}
			.rnta-studio__blackouts summary strong{
				color:#ed4f8f;
				font:400 42px/.95 "Great Vibes",cursive;
			}
			.rnta-studio__blackouts summary small{
				color:#856b76;
				font:600 14px/1.55 "Quicksand",sans-serif;
			}
			.rnta-studio__blackouts summary em{
				display:inline-flex;
				align-items:center;
				justify-content:center;
				min-height:38px;
				padding:0 14px;
				border-radius:999px;
				border:1px solid rgba(237,79,143,.20);
				background:#fff;
				color:#ed4f8f;
				font:800 11px/1 "Quicksand",sans-serif;
				font-style:normal;
				letter-spacing:.08em;
				text-transform:uppercase;
				white-space:nowrap;
			}
			.rnta-studio__blackout-grid{
				display:grid;
				grid-template-columns:minmax(0,1fr) minmax(320px,.8fr);
				gap:20px;
				margin-top:18px;
				align-items:start;
			}
			.rnta-studio__blackout-form{
				display:grid;
				grid-template-columns:repeat(2,minmax(0,1fr));
				gap:14px 16px;
			}
			.rnta-studio__blackout-actions{
				grid-column:1/-1;
			}
			.rnta-studio__blackout-list{
				display:grid;
				gap:12px;
				padding:16px;
				border:1px solid rgba(237,79,143,.12);
				border-radius:22px;
				background:#fff;
			}
			.rnta-studio__blackout-list h4{
				margin:0;
				color:#452c35;
				font:800 15px/1.2 "Quicksand",sans-serif;
				letter-spacing:.06em;
				text-transform:uppercase;
			}
			.rnta-studio__blackout-item{
				display:flex;
				justify-content:space-between;
				gap:14px;
				padding:13px 0;
				border-top:1px solid rgba(237,79,143,.10);
			}
			.rnta-studio__blackout-item:first-of-type{
				border-top:0;
			}
			.rnta-studio__blackout-item div{
				display:grid;
				gap:4px;
			}
			.rnta-studio__blackout-item strong{
				color:#452c35;
				font:800 14px/1.25 "Quicksand",sans-serif;
			}
			.rnta-studio__blackout-item span,
			.rnta-studio__blackout-item small{
				color:#856b76;
				font:600 12px/1.45 "Quicksand",sans-serif;
			}
			.rnta-studio__danger-link{
				border:0;
				background:transparent;
				color:#b42318;
				font:800 12px/1 "Quicksand",sans-serif;
				text-transform:uppercase;
				letter-spacing:.06em;
				cursor:pointer;
			}
			.rnta-studio__reservation-grid{
				display:grid;
				grid-template-columns:repeat(4, minmax(0, 1fr));
				gap:12px 18px;
				color:#856b76;font:500 14px/1.6 "Quicksand",sans-serif;
			}
			.rnta-studio__reservation-grid strong{
				color:#452c35;
			}
			.rnta-studio__hold-note{
				display:grid;
				gap:5px;
				padding:14px 16px;
				border-radius:20px;
				border:1px solid rgba(237,79,143,.14);
				background:#fff;
			}
			.rnta-studio__hold-note strong{
				color:#452c35;
				font:800 12px/1.2 "Quicksand",sans-serif;
				letter-spacing:.08em;
				text-transform:uppercase;
			}
			.rnta-studio__hold-note span{
				color:#856b76;
				font:600 13px/1.55 "Quicksand",sans-serif;
			}
			.rnta-studio__hold-note--active{
				border-color:rgba(245,158,11,.26);
				background:linear-gradient(135deg,#fff8e6,#fff);
			}
			.rnta-studio__hold-note--confirmed,
			.rnta-studio__hold-note--review{
				border-color:rgba(34,197,94,.22);
				background:linear-gradient(135deg,#ecfdf3,#fff);
			}
			.rnta-studio__hold-note--expired,
			.rnta-studio__hold-note--warning{
				border-color:rgba(244,63,94,.22);
				background:linear-gradient(135deg,#fff1f3,#fff);
			}
			.rnta-studio__hold-note--inactive{
				border-color:rgba(69,44,53,.10);
				background:rgba(69,44,53,.03);
			}
			@media (max-width:767px){
				.rnta-res-portal,
				.rnta-order-next,
				.rnta-studio,
				.rnta-studio-login{width:min(calc(100% - 20px),1200px);gap:16px;padding:22px 0;}
				.rnta-studio-login{width:min(calc(100% - 20px),920px);}
				.rnta-studio-login__card,
				.rnta-studio__hero,
				.rnta-studio__filters,
				.rnta-studio__reservation-card,
				.rnta-studio__stat-card{padding:16px;border-radius:24px;}
				.rnta-res-portal__form,
				.rnta-res-portal__cards{grid-template-columns:1fr;}
				.rnta-res-portal__result-top{flex-direction:column;align-items:flex-start;}
				.rnta-res-portal__result-badges{justify-content:flex-start;}
				.rnta-res-portal__addon-item,
				.rnta-res-portal__guest-head,
				.rnta-res-portal__guest-item,
				.rnta-res-portal__footer-actions{flex-direction:column;align-items:stretch;}
				.rnta-res-portal__guest-form-head{display:none;}
				.rnta-res-portal__guest-row,
				.rnta-res-portal__guest-edit-fields{grid-template-columns:1fr;}
				.rnta-res-portal__guest-resend-form,
				.rnta-res-portal__guest-edit-actions{justify-content:stretch;align-items:stretch;flex-direction:column;}
				.rnta-order-next__facts{flex-direction:column;gap:8px;}
				.rnta-studio__hero,
				.rnta-studio__reservation-top{flex-direction:column;align-items:flex-start;}
				.rnta-studio__stats,
				.rnta-studio__filters,
				.rnta-studio__reservation-grid,
				.rnta-studio__editor-grid,
				.rnta-studio__addon-checks,
				.rnta-studio__blackout-grid,
				.rnta-studio__blackout-form{grid-template-columns:1fr;}
				.rnta-studio__filter--search{grid-column:auto;}
				.rnta-studio__filter-actions,
				.rnta-studio__reservation-actions,
				.rnta-studio__editor-actions,
				.rnta-studio__blackout-item{flex-direction:column;align-items:stretch;}
				.rnta-studio__blackouts summary{flex-direction:column;align-items:flex-start;}
			}
		</style>
		<?php
	}
}

