<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Admin_Menu {
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
	}

	public function register_menu() {
		add_menu_page(
			__( 'RT - Reservations', 'rockntiara-reservations' ),
			__( 'RT - Reservations', 'rockntiara-reservations' ),
			'manage_woocommerce',
			'rnta-reservations',
			array( $this, 'render_reservations_page' ),
			'dashicons-calendar-alt',
			64
		);

		add_submenu_page(
			'rnta-reservations',
			__( 'Blackout Windows', 'rockntiara-reservations' ),
			__( 'Blackout Windows', 'rockntiara-reservations' ),
			'manage_woocommerce',
			'rnta-reservation-blocks',
			array( $this, 'render_blocks_page' )
		);

		add_submenu_page(
			'rnta-reservations',
			__( 'Availability Calendar', 'rockntiara-reservations' ),
			__( 'Availability Calendar', 'rockntiara-reservations' ),
			'manage_woocommerce',
			'rnta-reservation-calendar',
			array( $this, 'render_calendar_page' )
		);

		add_submenu_page(
			'rnta-reservations',
			__( 'Email Log', 'rockntiara-reservations' ),
			__( 'Email Log', 'rockntiara-reservations' ),
			'manage_woocommerce',
			'rnta-email-log',
			array( $this, 'render_email_log_page' )
		);

		add_submenu_page(
			'rnta-reservations',
			__( 'Signed Waivers', 'rockntiara-reservations' ),
			__( 'Signed Waivers', 'rockntiara-reservations' ),
			'manage_woocommerce',
			'rnta-waivers',
			array( $this, 'render_waivers_page' )
		);
	}

	public function render_reservations_page() {
		if ( isset( $_POST['rnta_create_manual_reservation'] ) ) {
			$this->handle_create_manual_reservation();
		}
		if ( isset( $_GET['rnta_action'] ) && 'sync_orders' === $_GET['rnta_action'] ) {
			$this->handle_sync_action();
		}

		if ( isset( $_GET['rnta_action'] ) && 'delete_reservation' === $_GET['rnta_action'] ) {
			$this->handle_delete_action();
		}

		if ( isset( $_POST['rnta_save_reservation'] ) ) {
			$this->handle_save_reservation();
		}

		if ( isset( $_POST['rnta_add_reservation_guests'] ) ) {
			$this->handle_add_reservation_guests();
		}

		if ( isset( $_POST['rnta_send_guest_invitation'] ) ) {
			$this->handle_send_guest_invitation();
		}

		if ( isset( $_POST['rnta_resend_pending_guest_invitations'] ) ) {
			$this->handle_resend_pending_guest_invitations();
		}

		if ( isset( $_POST['rnta_update_guest_invitation'] ) ) {
			$this->handle_update_guest_invitation();
		}

		if ( isset( $_GET['rnta_action'] ) && 'delete_guest' === $_GET['rnta_action'] ) {
			$this->handle_delete_guest();
		}

		if ( isset( $_POST['rnta_bulk_delete'] ) ) {
			$this->handle_bulk_delete();
		}

		if ( isset( $_GET['reservation_id'] ) ) {
			$this->render_reservation_detail_page( absint( $_GET['reservation_id'] ) );
			return;
		}

		$rows            = RNTA_Reservations_Repository::instance()->get_all();
		$reservation_ids = wp_list_pluck( $rows, 'id' );
		$guest_progress  = RNTA_Reservations_Guest_Repository::instance()->get_waiver_progress_by_reservation_ids( $reservation_ids );
		$manual_party_args = array( 'post_type' => 'rnta_experience', 'posts_per_page' => 200, 'orderby' => 'title', 'order' => 'ASC' );
		if ( taxonomy_exists( 'rnta_experience_type' ) ) {
			$manual_party_args['tax_query'] = array( array( 'taxonomy' => 'rnta_experience_type', 'field' => 'slug', 'terms' => 'party' ) );
		}
		$manual_parties = post_type_exists( 'rnta_experience' ) ? get_posts( $manual_party_args ) : array();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Rock N Tiara Reservations', 'rockntiara-reservations' ); ?></h1>
			<p><?php esc_html_e( 'This screen reads reservation requests created from WooCommerce deposit orders and lets the team manage schedule review manually.', 'rockntiara-reservations' ); ?></p>
			<p>
				<a href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin.php?page=rnta-reservations&rnta_action=sync_orders' ), 'rnta_sync_orders' ) ); ?>" class="button button-primary">
					<?php esc_html_e( 'Sync Existing Woo Orders', 'rockntiara-reservations' ); ?>
				</a>
			</p>
			<details style="max-width:1480px;background:#fff;border:1px solid #ccd0d4;border-radius:8px;padding:16px 20px;margin:18px 0;">
				<summary style="cursor:pointer;font-size:16px;font-weight:700;color:#1d2327;"><?php esc_html_e( 'Manual Reservation', 'rockntiara-reservations' ); ?></summary>
				<p class="description"><?php esc_html_e( 'Staff-only workflow. This bypasses the public 12-day, weekend, and fixed-time rules. The reservation is created as confirmed and its guest invitation tools become available immediately.', 'rockntiara-reservations' ); ?></p>
				<form method="post" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:end;">
					<?php wp_nonce_field( 'rnta_create_manual_reservation' ); ?><input type="hidden" name="rnta_create_manual_reservation" value="1">
					<label>Party<br><select name="party_post_id" id="rnta-manual-party-select" style="width:100%;"><option value="0">Manual / custom party</option><?php foreach ( $manual_parties as $party ) : $party_meta = get_post_meta( $party->ID ); ?><option value="<?php echo esc_attr( $party->ID ); ?>" data-party-name="<?php echo esc_attr( $party->post_title ); ?>" data-base-price="<?php echo esc_attr( isset( $party_meta['_rnta_base_price'][0] ) ? $party_meta['_rnta_base_price'][0] : '' ); ?>" data-included-guests="<?php echo esc_attr( isset( $party_meta['_rnta_included_guests'][0] ) ? $party_meta['_rnta_included_guests'][0] : '' ); ?>"><?php echo esc_html( $party->post_title ); ?></option><?php endforeach; ?></select></label>
					<label id="rnta-manual-party-name-wrap">Party name (manual/custom only)<br><input type="text" name="party_name" id="rnta-manual-party-name" style="width:100%;"></label>
					<label>Host first name<br><input type="text" name="host_first_name" required style="width:100%;"></label>
					<label>Host last name<br><input type="text" name="host_last_name" style="width:100%;"></label>
					<label>Host email<br><input type="email" name="host_email" style="width:100%;"></label>
					<label>Host phone<br><input type="text" name="host_phone" style="width:100%;"></label>
					<label>Child name<br><input type="text" name="child_name" style="width:100%;"></label>
					<label>Child age<br><input type="number" name="child_age" min="0" style="width:100%;"></label>
					<label>Event date<br><input type="date" name="party_date" required style="width:100%;"></label>
					<label>Start time<br><input type="time" name="party_time" step="60" required style="width:100%;"></label>
					<label>Guests<br><input type="number" name="guest_count" min="1" value="10" required style="width:100%;"></label>
					<label>Included guests<br><input type="number" name="included_guests" min="0" value="10" required style="width:100%;"></label>
					<label>Final negotiated total<br><input type="number" name="final_negotiated_total" min="0" step="0.01" value="0" style="width:100%;"></label>
					<label>Deposit paid<br><input type="number" name="deposit_amount" min="0" step="0.01" value="0" style="width:100%;"></label>
					<label style="grid-column:span 3;">Notes<br><textarea name="reservation_notes" rows="2" style="width:100%;"></textarea></label>
					<button type="submit" class="button button-primary" style="height:40px;"><?php esc_html_e( 'Create manual reservation', 'rockntiara-reservations' ); ?></button>
				</form>
				<script>
				(function(){
					const select=document.getElementById('rnta-manual-party-select'); if(!select){return;}
					const name=document.getElementById('rnta-manual-party-name'), nameWrap=document.getElementById('rnta-manual-party-name-wrap');
					const guests=document.querySelector('input[name="guest_count"]'), included=document.querySelector('input[name="included_guests"]'), total=document.querySelector('input[name="final_negotiated_total"]');
					function sync(){const option=select.options[select.selectedIndex], custom=select.value==='0'; nameWrap.hidden=!custom; name.required=custom; if(!custom){name.value=option.dataset.partyName||option.textContent.trim(); if(option.dataset.includedGuests){included.value=option.dataset.includedGuests;guests.value=option.dataset.includedGuests;} if(option.dataset.basePrice){total.value=option.dataset.basePrice;}} else {name.value='';}}
					select.addEventListener('change',sync); sync();
				})();
				</script>
			</details>

			<?php if ( empty( $rows ) ) : ?>
				<div class="notice notice-info inline">
					<p><?php esc_html_e( 'No reservation records found yet. Run the sync button above after a deposit order exists.', 'rockntiara-reservations' ); ?></p>
				</div>
			<?php else : ?>
				<form method="post">
					<?php wp_nonce_field( 'rnta_bulk_delete_reservations' ); ?>
					<p>
						<select name="bulk_action">
							<option value=""><?php esc_html_e( 'Bulk actions', 'rockntiara-reservations' ); ?></option>
							<option value="delete"><?php esc_html_e( 'Delete selected reservations', 'rockntiara-reservations' ); ?></option>
						</select>
						<button type="submit" name="rnta_bulk_delete" value="1" class="button"><?php esc_html_e( 'Apply', 'rockntiara-reservations' ); ?></button>
					</p>

					<table class="widefat striped" style="max-width:1480px;">
						<thead>
							<tr>
								<td style="width:36px;"><input type="checkbox" onclick="jQuery('.rnta-reservation-checkbox').prop('checked', this.checked);"></td>
								<th><?php esc_html_e( 'Reservation ID', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Woo Order', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Host', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Party', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Requested Date', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Requested Time', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Guests', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Reservation', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Payment', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Host waiver', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Guest waivers', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Conflict', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Final Total', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Deposit', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Created', 'rockntiara-reservations' ); ?></th>
								<th><?php esc_html_e( 'Actions', 'rockntiara-reservations' ); ?></th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $rows as $row ) : ?>
								<?php
								$waiver   = RNTA_Reservations_Waiver_Repository::instance()->get_by_reservation_id( $row['id'] );
								$progress = isset( $guest_progress[ $row['id'] ] ) ? $guest_progress[ $row['id'] ] : array(
									'total'   => 0,
									'signed'  => 0,
									'pending' => 0,
								);
								?>
								<tr>
									<td><input type="checkbox" class="rnta-reservation-checkbox" name="reservation_ids[]" value="<?php echo esc_attr( $row['id'] ); ?>"></td>
									<td><a href="<?php echo esc_url( admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $row['id'] ) ) ); ?>">#<?php echo esc_html( $row['id'] ); ?></a></td>
									<td>
										<?php if ( (int) $row['woo_order_id'] >= 990000 || 'manual_waiver' === $row['order_status_snapshot'] ) : ?>
											<span style="display:inline-block;padding:3px 8px;border-radius:12px;background:#f0f9ff;color:#0284c7;font-weight:700;font-size:12px;">Manual (#<?php echo esc_html( $row['woo_order_id'] ); ?>)</span>
										<?php else : ?>
											<a href="<?php echo esc_url( admin_url( 'post.php?post=' . absint( $row['woo_order_id'] ) . '&action=edit' ) ); ?>">#<?php echo esc_html( $row['woo_order_id'] ); ?></a>
										<?php endif; ?>
									</td>
									<td><strong><?php echo esc_html( trim( $row['host_first_name'] . ' ' . $row['host_last_name'] ) ); ?></strong><br><span><?php echo esc_html( $row['host_email'] ); ?></span></td>
									<td><?php echo esc_html( $row['party_name'] ); ?></td>
									<td><?php echo esc_html( ! empty( $row['requested_party_date'] ) ? $row['requested_party_date'] : '—' ); ?></td>
									<td><?php echo esc_html( ! empty( $row['requested_start_time'] ) ? $row['requested_start_time'] : '—' ); ?></td>
									<td><?php echo esc_html( $row['guest_count'] ); ?></td>
									<td><?php echo $this->render_status_badge( $row['reservation_status'], 'reservation' ); ?></td>
									<td><?php echo $this->render_status_badge( ! empty( $row['payment_status'] ) ? $row['payment_status'] : 'pending_proof', 'payment' ); ?></td>
									<td><?php echo $waiver ? $this->render_status_badge( 'received', 'waiver' ) : $this->render_status_badge( 'pending', 'waiver' ); ?></td>
									<td><?php echo $this->render_guest_waiver_progress( $progress ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></td>
									<td>
										<?php if ( ! empty( $row['conflict_flag'] ) ) : ?>
											<span style="color:#b42318;font-weight:700;"><?php esc_html_e( 'Conflict', 'rockntiara-reservations' ); ?></span>
										<?php else : ?>
											<span style="color:#027a48;font-weight:700;"><?php esc_html_e( 'Clear', 'rockntiara-reservations' ); ?></span>
										<?php endif; ?>
									</td>
									<td><?php echo esc_html( '$' . number_format( (float) $row['final_negotiated_total'], 2 ) ); ?></td>
									<td><?php echo esc_html( '$' . number_format( (float) $row['deposit_amount'], 2 ) ); ?></td>
									<td><?php echo esc_html( $row['created_at'] ); ?></td>
									<td>
										<a href="<?php echo esc_url( admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $row['id'] ) ) ); ?>"><?php esc_html_e( 'Open', 'rockntiara-reservations' ); ?></a>
										|
										<a href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin.php?page=rnta-reservations&rnta_action=delete_reservation&reservation_id=' . absint( $row['id'] ) ), 'rnta_delete_reservation_' . absint( $row['id'] ) ) ); ?>" onclick="return confirm('<?php echo esc_js( __( 'Delete this reservation record only? The Woo order will remain intact.', 'rockntiara-reservations' ) ); ?>');" style="color:#b42318;"><?php esc_html_e( 'Delete', 'rockntiara-reservations' ); ?></a>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				</form>
			<?php endif; ?>
		</div>
		<?php
	}

	private function handle_create_manual_reservation() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) { wp_die( esc_html__( 'You are not allowed to create reservations.', 'rockntiara-reservations' ) ); }
		check_admin_referer( 'rnta_create_manual_reservation' );
		$party_id = absint( $_POST['party_post_id'] ?? 0 );
		$party_name = sanitize_text_field( wp_unslash( $_POST['party_name'] ?? '' ) );
		if ( $party_id && post_type_exists( 'rnta_experience' ) ) { $party_name = get_the_title( $party_id ) ?: $party_name; }
		$reservation = RNTA_Reservations_Repository::instance()->create_manual_reservation( array(
			'party_post_id' => $party_id,
			'party_name' => $party_name,
			'host_first_name' => sanitize_text_field( wp_unslash( $_POST['host_first_name'] ?? '' ) ),
			'host_last_name' => sanitize_text_field( wp_unslash( $_POST['host_last_name'] ?? '' ) ),
			'host_email' => sanitize_email( wp_unslash( $_POST['host_email'] ?? '' ) ),
			'host_phone' => sanitize_text_field( wp_unslash( $_POST['host_phone'] ?? '' ) ),
			'child_name' => sanitize_text_field( wp_unslash( $_POST['child_name'] ?? '' ) ),
			'child_age' => absint( $_POST['child_age'] ?? 0 ),
			'party_date' => sanitize_text_field( wp_unslash( $_POST['party_date'] ?? '' ) ),
			'party_time' => sanitize_text_field( wp_unslash( $_POST['party_time'] ?? '' ) ),
			'guest_count' => absint( $_POST['guest_count'] ?? 10 ),
			'included_guests' => absint( $_POST['included_guests'] ?? 10 ),
			'estimated_total' => (float) ( $_POST['final_negotiated_total'] ?? 0 ),
			'final_negotiated_total' => (float) ( $_POST['final_negotiated_total'] ?? 0 ),
			'deposit_amount' => (float) ( $_POST['deposit_amount'] ?? 0 ),
			'reservation_notes' => sanitize_textarea_field( wp_unslash( $_POST['reservation_notes'] ?? '' ) ),
		) );
		if ( $reservation && ! empty( $reservation['id'] ) ) {
			wp_safe_redirect( admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $reservation['id'] ) . '&manual_created=1' ) ); exit;
		}
		wp_die( esc_html__( 'The manual reservation could not be created.', 'rockntiara-reservations' ) );
	}

	public function render_blocks_page() {
		if ( isset( $_POST['rnta_create_manual_block'] ) ) {
			$this->handle_create_manual_block();
		}

		if ( isset( $_GET['rnta_action'] ) && 'delete_block' === $_GET['rnta_action'] ) {
			$this->handle_delete_block();
		}

		$blocks = RNTA_Reservations_Block_Repository::instance()->get_all_blocks();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Blackout Windows', 'rockntiara-reservations' ); ?></h1>
			<p><?php esc_html_e( 'Create manual blackout windows for dates and times that must stay unavailable. Confirmed reservations will also appear here as automatic operational blocks.', 'rockntiara-reservations' ); ?></p>

			<div style="max-width:900px;background:#fff;padding:24px;margin:24px 0;border:1px solid #dcdcde;border-radius:8px;">
				<h2 style="margin-top:0;"><?php esc_html_e( 'Create manual blackout window', 'rockntiara-reservations' ); ?></h2>
				<form method="post">
					<?php wp_nonce_field( 'rnta_create_manual_block' ); ?>
					<input type="hidden" name="rnta_create_manual_block" value="1">

					<table class="form-table" role="presentation">
						<tbody>
							<tr>
								<th scope="row"><label for="block_title"><?php esc_html_e( 'Title', 'rockntiara-reservations' ); ?></label></th>
								<td><input type="text" name="block_title" id="block_title" class="regular-text" placeholder="Private event / maintenance / holiday"></td>
							</tr>
							<tr>
								<th scope="row"><label for="block_start"><?php esc_html_e( 'Start date & time', 'rockntiara-reservations' ); ?></label></th>
								<td><input type="datetime-local" name="block_start" id="block_start" required></td>
							</tr>
							<tr>
								<th scope="row"><label for="block_end"><?php esc_html_e( 'End date & time', 'rockntiara-reservations' ); ?></label></th>
								<td><input type="datetime-local" name="block_end" id="block_end" required></td>
							</tr>
							<tr>
								<th scope="row"><label for="block_notes"><?php esc_html_e( 'Notes', 'rockntiara-reservations' ); ?></label></th>
								<td><textarea name="block_notes" id="block_notes" rows="4" class="large-text"></textarea></td>
							</tr>
						</tbody>
					</table>

					<p><button type="submit" class="button button-primary"><?php esc_html_e( 'Save blackout window', 'rockntiara-reservations' ); ?></button></p>
				</form>
			</div>

			<?php if ( empty( $blocks ) ) : ?>
				<div class="notice notice-info inline"><p><?php esc_html_e( 'No blackout windows or automatic reservation blocks found yet.', 'rockntiara-reservations' ); ?></p></div>
			<?php else : ?>
				<table class="widefat striped" style="max-width:1480px;">
					<thead>
						<tr>
							<th><?php esc_html_e( 'ID', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Type', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Title', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Date', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Start', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'End', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Source', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Notes', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Actions', 'rockntiara-reservations' ); ?></th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $blocks as $block ) : ?>
							<tr>
								<td>#<?php echo esc_html( $block['id'] ); ?></td>
								<td><?php echo esc_html( $block['block_type'] ); ?></td>
								<td>
									<?php echo esc_html( $block['title'] ); ?>
									<?php if ( ! empty( $block['reservation_id'] ) ) : ?>
										<br><a href="<?php echo esc_url( admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $block['reservation_id'] ) ) ); ?>"><?php echo esc_html( 'Reservation #' . absint( $block['reservation_id'] ) ); ?></a>
									<?php endif; ?>
								</td>
								<td><?php echo esc_html( ! empty( $block['block_date'] ) ? $block['block_date'] : '—' ); ?></td>
								<td><?php echo esc_html( $block['start_datetime'] ); ?></td>
								<td><?php echo esc_html( $block['end_datetime'] ); ?></td>
								<td><?php echo esc_html( $block['source_status'] ); ?></td>
								<td><?php echo esc_html( ! empty( $block['notes'] ) ? $block['notes'] : '—' ); ?></td>
								<td>
									<?php if ( 'manual' === $block['block_type'] ) : ?>
										<a href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin.php?page=rnta-reservation-blocks&rnta_action=delete_block&block_id=' . absint( $block['id'] ) ), 'rnta_delete_block_' . absint( $block['id'] ) ) ); ?>" onclick="return confirm('<?php echo esc_js( __( 'Delete this blackout window?', 'rockntiara-reservations' ) ); ?>');" style="color:#b42318;">
											<?php esc_html_e( 'Delete', 'rockntiara-reservations' ); ?>
										</a>
									<?php else : ?>
										<span style="color:#646970;"><?php esc_html_e( 'Auto block', 'rockntiara-reservations' ); ?></span>
									<?php endif; ?>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			<?php endif; ?>
		</div>
		<?php
	}

	public function render_calendar_page() {
		RNTA_Reservations_Availability_Calendar::instance()->render_admin_calendar_page();
	}

	public function render_email_log_page() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$search  = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : '';
		$entries = RNTA_Reservations_Email_Log_Repository::instance()->get_entries( $search, 200 );
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Rock N Tiara Email Log', 'rockntiara-reservations' ); ?></h1>
			<p><?php esc_html_e( 'This log records whether WordPress accepted each send attempt. It does not confirm inbox delivery, opens, or clicks.', 'rockntiara-reservations' ); ?></p>

			<form method="get" style="margin:18px 0;display:flex;gap:8px;align-items:center;">
				<input type="hidden" name="page" value="rnta-email-log">
				<label class="screen-reader-text" for="rnta-email-log-search"><?php esc_html_e( 'Search email log', 'rockntiara-reservations' ); ?></label>
				<input type="search" id="rnta-email-log-search" name="s" value="<?php echo esc_attr( $search ); ?>" placeholder="<?php esc_attr_e( 'Recipient, subject, or email type', 'rockntiara-reservations' ); ?>" style="min-width:340px;">
				<button type="submit" class="button button-primary"><?php esc_html_e( 'Search', 'rockntiara-reservations' ); ?></button>
				<?php if ( '' !== $search ) : ?>
					<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=rnta-email-log' ) ); ?>"><?php esc_html_e( 'Clear', 'rockntiara-reservations' ); ?></a>
				<?php endif; ?>
			</form>

			<?php if ( empty( $entries ) ) : ?>
				<div class="notice notice-info inline"><p><?php esc_html_e( 'No email attempts match this search.', 'rockntiara-reservations' ); ?></p></div>
			<?php else : ?>
				<table class="widefat striped" style="max-width:1600px;">
					<thead>
						<tr>
							<th><?php esc_html_e( 'Date', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Result', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Recipient', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Email type', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Source', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Attempt', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Reservation', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Subject / error', 'rockntiara-reservations' ); ?></th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $entries as $entry ) : ?>
							<?php $accepted = 'accepted' === $entry['delivery_status']; ?>
							<tr>
								<td><?php echo esc_html( $entry['created_at'] ); ?></td>
								<td><span style="display:inline-block;padding:4px 8px;border-radius:999px;font-weight:700;background:<?php echo $accepted ? '#ecfdf3' : '#fff1f3'; ?>;color:<?php echo $accepted ? '#027a48' : '#b42318'; ?>;"><?php echo esc_html( $accepted ? __( 'Accepted', 'rockntiara-reservations' ) : __( 'Failed', 'rockntiara-reservations' ) ); ?></span></td>
								<td><strong><?php echo esc_html( $entry['recipient_email'] ); ?></strong></td>
								<td><?php echo esc_html( ucwords( str_replace( '_', ' ', $entry['email_type'] ) ) ); ?></td>
								<td><?php echo esc_html( ucwords( str_replace( '_', ' ', $entry['trigger_source'] ) ) ); ?></td>
								<td>#<?php echo esc_html( $entry['attempt_number'] ); ?></td>
								<td>
									<?php if ( ! empty( $entry['reservation_id'] ) ) : ?>
										<a href="<?php echo esc_url( admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $entry['reservation_id'] ) ) ); ?>">#<?php echo esc_html( $entry['reservation_id'] ); ?></a>
										<?php if ( ! empty( $entry['guest_id'] ) ) : ?><br><small><?php echo esc_html( 'Guest #' . $entry['guest_id'] ); ?></small><?php endif; ?>
									<?php else : ?>
										&mdash;
									<?php endif; ?>
								</td>
								<td>
									<?php echo esc_html( $entry['subject'] ); ?>
									<?php if ( ! empty( $entry['error_message'] ) ) : ?><br><small style="color:#b42318;"><?php echo esc_html( $entry['error_message'] ); ?></small><?php endif; ?>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			<?php endif; ?>
		</div>
		<?php
	}

	private function handle_create_manual_block() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		check_admin_referer( 'rnta_create_manual_block' );

		$title = isset( $_POST['block_title'] ) ? sanitize_text_field( wp_unslash( $_POST['block_title'] ) ) : '';
		$start = isset( $_POST['block_start'] ) ? sanitize_text_field( wp_unslash( $_POST['block_start'] ) ) : '';
		$end   = isset( $_POST['block_end'] ) ? sanitize_text_field( wp_unslash( $_POST['block_end'] ) ) : '';
		$notes = isset( $_POST['block_notes'] ) ? sanitize_textarea_field( wp_unslash( $_POST['block_notes'] ) ) : '';

		if ( empty( $title ) || empty( $start ) || empty( $end ) ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'Title, start, and end are required to create a blackout window.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		$start_mysql = str_replace( 'T', ' ', $start ) . ':00';
		$end_mysql   = str_replace( 'T', ' ', $end ) . ':00';

		if ( strtotime( $end_mysql ) <= strtotime( $start_mysql ) ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'End date/time must be later than start date/time.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		$overlaps = RNTA_Reservations_Block_Repository::instance()->get_overlaps( $start_mysql, $end_mysql );

		RNTA_Reservations_Block_Repository::instance()->create_manual_block( $title, $start_mysql, $end_mysql, $notes );

		echo '<div class="notice notice-success inline"><p>' . esc_html__( 'Blackout window saved successfully.', 'rockntiara-reservations' ) . '</p></div>';

		if ( ! empty( $overlaps ) ) {
			echo '<div class="notice notice-warning inline"><p>' . esc_html__( 'This blackout overlaps an existing reservation block or another blackout window. Review the list below.', 'rockntiara-reservations' ) . '</p></div>';
		}
	}

	private function handle_delete_block() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$block_id = isset( $_GET['block_id'] ) ? absint( $_GET['block_id'] ) : 0;

		if ( ! $block_id ) {
			return;
		}

		check_admin_referer( 'rnta_delete_block_' . $block_id );

		RNTA_Reservations_Block_Repository::instance()->delete_by_id( $block_id );

		echo '<div class="notice notice-success inline"><p>' . esc_html__( 'Blackout window deleted successfully.', 'rockntiara-reservations' ) . '</p></div>';
	}

	private function handle_sync_action() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		check_admin_referer( 'rnta_sync_orders' );
		$count = RNTA_Reservations_WooCommerce_Sync::instance()->sync_all_existing_orders();

		echo '<div class="notice notice-success inline"><p>' .
			esc_html( sprintf( __( 'WooCommerce reservation sync completed. %d order(s) processed.', 'rockntiara-reservations' ), $count ) ) .
		'</p></div>';
	}

	private function handle_delete_action() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$reservation_id = isset( $_GET['reservation_id'] ) ? absint( $_GET['reservation_id'] ) : 0;
		if ( ! $reservation_id ) {
			return;
		}

		check_admin_referer( 'rnta_delete_reservation_' . $reservation_id );

		RNTA_Reservations_Block_Repository::instance()->delete_by_reservation_id( $reservation_id );
		RNTA_Reservations_Waiver_Repository::instance()->delete_by_reservation_id( $reservation_id );
		RNTA_Reservations_Guest_Repository::instance()->delete_by_reservation_id( $reservation_id );
		RNTA_Reservations_Repository::instance()->delete_by_id( $reservation_id );

		echo '<div class="notice notice-success inline"><p>' . esc_html__( 'Reservation deleted successfully. WooCommerce order was not removed.', 'rockntiara-reservations' ) . '</p></div>';
	}

	private function handle_bulk_delete() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		check_admin_referer( 'rnta_bulk_delete_reservations' );

		$action          = isset( $_POST['bulk_action'] ) ? sanitize_text_field( wp_unslash( $_POST['bulk_action'] ) ) : '';
		$reservation_ids = isset( $_POST['reservation_ids'] ) ? array_map( 'absint', (array) wp_unslash( $_POST['reservation_ids'] ) ) : array();

		if ( 'delete' !== $action || empty( $reservation_ids ) ) {
			echo '<div class="notice notice-warning inline"><p>' . esc_html__( 'Choose at least one reservation and the delete bulk action.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		foreach ( $reservation_ids as $reservation_id ) {
			RNTA_Reservations_Block_Repository::instance()->delete_by_reservation_id( $reservation_id );
		}

		RNTA_Reservations_Waiver_Repository::instance()->delete_many_by_reservation_ids( $reservation_ids );
		RNTA_Reservations_Guest_Repository::instance()->delete_many_by_reservation_ids( $reservation_ids );

		$deleted = RNTA_Reservations_Repository::instance()->delete_many( $reservation_ids );

		echo '<div class="notice notice-success inline"><p>' .
			esc_html( sprintf( __( '%d reservation record(s) deleted. WooCommerce orders were kept.', 'rockntiara-reservations' ), $deleted ) ) .
		'</p></div>';
	}

	private function handle_add_reservation_guests() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		check_admin_referer( 'rnta_add_reservation_guests' );

		$reservation_id = isset( $_POST['reservation_id'] ) ? absint( $_POST['reservation_id'] ) : 0;
		$reservation    = RNTA_Reservations_Repository::instance()->get_by_id( $reservation_id );
		$guest_rows     = isset( $_POST['guest_rows'] ) ? wp_unslash( $_POST['guest_rows'] ) : array();
		$guest_lines    = isset( $_POST['guest_lines'] ) ? wp_unslash( $_POST['guest_lines'] ) : '';

		if ( ! $reservation ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'Reservation not found.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		$guest_repo  = RNTA_Reservations_Guest_Repository::instance();
		$before_ids  = array_map( 'absint', wp_list_pluck( $guest_repo->get_by_reservation_id( $reservation['id'] ), 'id' ) );
		$created     = $guest_repo->create_many_from_rows( $reservation, $guest_rows );

		if ( 0 === $created && ! empty( $guest_lines ) ) {
			$created = $guest_repo->create_many_from_lines( $reservation, $guest_lines );
		}

		if ( $created > 0 ) {
			$after_guests = $guest_repo->get_by_reservation_id( $reservation['id'] );
			$new_guests   = array_filter(
				$after_guests,
				function ( $guest ) use ( $before_ids ) {
					return ! in_array( absint( $guest['id'] ), $before_ids, true );
				}
			);
			$email_result = $this->send_guest_invitation_batch( $reservation, $new_guests, 'initial' );

			echo '<div class="notice notice-success inline"><p>' . esc_html( sprintf( __( '%1$d guest invitation record(s) added. %2$d invitation email(s) sent.', 'rockntiara-reservations' ), $created, $email_result['sent'] ) ) . '</p></div>';

			if ( $email_result['skipped'] > 0 ) {
				echo '<div class="notice notice-warning inline"><p>' . esc_html( sprintf( __( '%d guest invitation(s) were saved without email because the parent email is missing or the email could not be sent.', 'rockntiara-reservations' ), $email_result['skipped'] ) ) . '</p></div>';
			}
		} else {
			echo '<div class="notice notice-warning inline"><p>' . esc_html__( 'No guests were added. Add at least a child name in one of the guest rows.', 'rockntiara-reservations' ) . '</p></div>';
		}
	}

	private function handle_send_guest_invitation() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		check_admin_referer( 'rnta_send_guest_invitation' );

		$guest_id = isset( $_POST['guest_id'] ) ? absint( $_POST['guest_id'] ) : 0;
		$guest    = RNTA_Reservations_Guest_Repository::instance()->get_by_id( $guest_id );

		if ( ! $guest ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'Guest invitation not found.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		$reservation = RNTA_Reservations_Repository::instance()->get_by_id( $guest['reservation_id'] );

		if ( ! $reservation ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'Reservation not found for this guest.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		if ( empty( $guest['guardian_email'] ) ) {
			echo '<div class="notice notice-warning inline"><p>' . esc_html__( 'This guest does not have a parent email yet. Add an email before sending.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		$sent = RNTA_Reservations_Email_Notifications::instance()->send_guest_invitation_email( $reservation, $guest, 'manual_resend' );

		if ( $sent ) {
			RNTA_Reservations_Guest_Repository::instance()->mark_invited( $guest_id );
			echo '<div class="notice notice-success inline"><p>' . esc_html__( 'Guest invitation email sent.', 'rockntiara-reservations' ) . '</p></div>';
		} else {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'Guest invitation email could not be sent.', 'rockntiara-reservations' ) . '</p></div>';
		}
	}

	private function handle_resend_pending_guest_invitations() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		check_admin_referer( 'rnta_resend_pending_guest_invitations' );

		$reservation_id = isset( $_POST['reservation_id'] ) ? absint( $_POST['reservation_id'] ) : 0;
		$reservation    = RNTA_Reservations_Repository::instance()->get_by_id( $reservation_id );

		if ( ! $reservation ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'Reservation not found.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		$guests = RNTA_Reservations_Guest_Repository::instance()->get_pending_waiver_by_reservation_id( $reservation_id );
		$result = $this->send_guest_invitation_batch( $reservation, $guests, 'bulk_resend' );

		echo '<div class="notice notice-success inline"><p>' . esc_html( sprintf( __( '%1$d pending waiver invitation email(s) sent. %2$d skipped.', 'rockntiara-reservations' ), $result['sent'], $result['skipped'] ) ) . '</p></div>';
	}

	private function handle_update_guest_invitation() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		check_admin_referer( 'rnta_update_guest_invitation' );

		$guest_id = isset( $_POST['guest_id'] ) ? absint( $_POST['guest_id'] ) : 0;
		$guest    = RNTA_Reservations_Guest_Repository::instance()->get_by_id( $guest_id );

		if ( ! $guest ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'Guest invitation not found.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		if ( 'signed' === $guest['waiver_status'] ) {
			echo '<div class="notice notice-warning inline"><p>' . esc_html__( 'This guest already accepted the invitation consent, so the invitation record is locked.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		$reservation = RNTA_Reservations_Repository::instance()->get_by_id( $guest['reservation_id'] );

		if ( ! $reservation ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'Reservation not found for this guest.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		$guest_name     = isset( $_POST['guest_name'] ) ? wp_unslash( $_POST['guest_name'] ) : '';
		$guardian_name  = isset( $_POST['guardian_name'] ) ? wp_unslash( $_POST['guardian_name'] ) : '';
		$guardian_email = isset( $_POST['guardian_email'] ) ? wp_unslash( $_POST['guardian_email'] ) : '';
		$updated        = RNTA_Reservations_Guest_Repository::instance()->update_guest( $guest_id, $guest_name, $guardian_email, $guardian_name );

		if ( ! $updated ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'Guest invitation could not be updated. Confirm that the child name is filled and the invitation consent has not been accepted.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		$updated_guest = RNTA_Reservations_Guest_Repository::instance()->get_by_id( $guest_id );
		$result        = $this->send_guest_invitation_batch( $reservation, array( $updated_guest ), 'invitation_updated' );

		echo '<div class="notice notice-success inline"><p>' . esc_html( sprintf( __( 'Guest invitation updated. %d invitation email(s) sent.', 'rockntiara-reservations' ), $result['sent'] ) ) . '</p></div>';
	}

	private function send_guest_invitation_batch( $reservation, $guests, $trigger_source = 'batch' ) {
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

	private function handle_delete_guest() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$guest_id = isset( $_GET['guest_id'] ) ? absint( $_GET['guest_id'] ) : 0;

		if ( ! $guest_id ) {
			return;
		}

		check_admin_referer( 'rnta_delete_guest_' . $guest_id );

		RNTA_Reservations_Guest_Repository::instance()->delete_by_id( $guest_id );

		echo '<div class="notice notice-success inline"><p>' . esc_html__( 'Guest invitation deleted.', 'rockntiara-reservations' ) . '</p></div>';
	}

	private function handle_save_reservation() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		check_admin_referer( 'rnta_save_reservation_detail' );

		$reservation_id         = isset( $_POST['reservation_id'] ) ? absint( $_POST['reservation_id'] ) : 0;
		$status                 = isset( $_POST['reservation_status'] ) ? sanitize_text_field( wp_unslash( $_POST['reservation_status'] ) ) : 'pending_schedule_review';
		$notes                  = isset( $_POST['internal_notes'] ) ? sanitize_textarea_field( wp_unslash( $_POST['internal_notes'] ) ) : '';
		$confirmed_party_date   = isset( $_POST['confirmed_party_date'] ) ? sanitize_text_field( wp_unslash( $_POST['confirmed_party_date'] ) ) : '';
		$confirmed_start_time   = isset( $_POST['confirmed_start_time'] ) ? sanitize_text_field( wp_unslash( $_POST['confirmed_start_time'] ) ) : '';
		$confirmed_end_time     = isset( $_POST['confirmed_end_time'] ) ? sanitize_text_field( wp_unslash( $_POST['confirmed_end_time'] ) ) : '';
		$payment_status         = isset( $_POST['payment_status'] ) ? sanitize_text_field( wp_unslash( $_POST['payment_status'] ) ) : 'pending_proof';
		$payment_review_notes   = isset( $_POST['payment_review_notes'] ) ? sanitize_textarea_field( wp_unslash( $_POST['payment_review_notes'] ) ) : '';
		$final_negotiated_total = isset( $_POST['final_negotiated_total'] ) ? (float) wp_unslash( $_POST['final_negotiated_total'] ) : 0;
		$party_post_id          = isset( $_POST['party_post_id'] ) ? absint( $_POST['party_post_id'] ) : 0;
		$party_name             = isset( $_POST['party_name'] ) ? sanitize_text_field( wp_unslash( $_POST['party_name'] ) ) : '';
		$party_slug             = sanitize_title( $party_name );
		$child_name             = isset( $_POST['child_name'] ) ? sanitize_text_field( wp_unslash( $_POST['child_name'] ) ) : '';
		$child_age              = isset( $_POST['child_age'] ) ? sanitize_text_field( wp_unslash( $_POST['child_age'] ) ) : '';
		$guest_count            = isset( $_POST['guest_count'] ) ? absint( $_POST['guest_count'] ) : 0;
		$included_guests        = isset( $_POST['included_guests'] ) ? absint( $_POST['included_guests'] ) : 0;
		$extra_guest_count      = max( 0, $guest_count - $included_guests );
		$estimated_total        = isset( $_POST['estimated_total'] ) ? (float) wp_unslash( $_POST['estimated_total'] ) : 0;
		$reservation_notes      = isset( $_POST['reservation_notes'] ) ? sanitize_textarea_field( wp_unslash( $_POST['reservation_notes'] ) ) : '';
		$addons_json            = $this->parse_addons_lines( isset( $_POST['addons_lines'] ) ? wp_unslash( $_POST['addons_lines'] ) : '' );

		if ( ! $reservation_id ) {
			return;
		}

		$current             = RNTA_Reservations_Repository::instance()->get_by_id( $reservation_id );
		$payment_verified_at = $current && ! empty( $current['payment_verified_at'] ) ? $current['payment_verified_at'] : '';
		$payment_verified_by = $current ? absint( $current['payment_verified_by'] ) : 0;
		$blocking_statuses   = array( 'confirmed', 'rescheduled', 'pending_client_confirmation' );

		if ( in_array( $payment_status, array( 'payment_verified', 'fully_paid' ), true ) && ( ! $current || ! in_array( $current['payment_status'], array( 'payment_verified', 'fully_paid' ), true ) ) ) {
			$payment_verified_at = current_time( 'mysql' );
			$payment_verified_by = get_current_user_id();
		}

		if ( in_array( $status, $blocking_statuses, true ) && ! in_array( $payment_status, array( 'payment_verified', 'fully_paid' ), true ) ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'You cannot move this reservation into a confirmed scheduling status until the deposit payment is marked as Payment verified or Fully paid.', 'rockntiara-reservations' ) . '</p></div>';
			return;
		}

		RNTA_Reservations_Repository::instance()->update_operational_fields(
			$reservation_id,
			array(
				'party_post_id'          => $party_post_id,
				'party_name'             => $party_name,
				'party_slug'             => $party_slug,
				'child_name'             => $child_name,
				'child_age'              => $child_age,
				'guest_count'            => $guest_count,
				'included_guests'        => $included_guests,
				'extra_guest_count'      => $extra_guest_count,
				'estimated_total'        => $estimated_total,
				'addons_json'            => $addons_json,
				'reservation_notes'      => $reservation_notes,
				'reservation_status'     => $status,
				'internal_notes'         => $notes,
				'confirmed_party_date'   => $confirmed_party_date,
				'confirmed_start_time'   => $confirmed_start_time,
				'confirmed_end_time'     => $confirmed_end_time,
				'payment_status'         => $payment_status,
				'payment_verified_at'    => $payment_verified_at,
				'payment_verified_by'    => $payment_verified_by,
				'payment_review_notes'   => $payment_review_notes,
				'final_negotiated_total' => $final_negotiated_total,
			)
		);

		$result = RNTA_Reservations_Conflict_Engine::instance()->sync_reservation( $reservation_id );
		RNTA_Reservations_WooCommerce_Sync::instance()->sync_order_status_from_reservation( $reservation_id );

		echo '<div class="notice notice-success inline"><p>' . esc_html__( 'Reservation updated successfully.', 'rockntiara-reservations' ) . '</p></div>';

		if ( ! empty( $result['conflicts'] ) ) {
			echo '<div class="notice notice-warning inline"><p>' . esc_html__( 'Warning: this reservation overlaps an existing blocked window. Review before confirming with the client.', 'rockntiara-reservations' ) . '</p></div>';
		}
	}

	private function render_reservation_detail_page( $reservation_id ) {
		$reservation = RNTA_Reservations_Repository::instance()->get_by_id( $reservation_id );

		if ( ! $reservation ) {
			?>
			<div class="wrap">
				<h1><?php esc_html_e( 'Reservation not found', 'rockntiara-reservations' ); ?></h1>
				<p><a href="<?php echo esc_url( admin_url( 'admin.php?page=rnta-reservations' ) ); ?>" class="button"><?php esc_html_e( 'Back to Reservations', 'rockntiara-reservations' ); ?></a></p>
			</div>
			<?php
			return;
		}

		$addons = array();
		if ( ! empty( $reservation['addons_json'] ) ) {
			$decoded = json_decode( $reservation['addons_json'], true );
			if ( is_array( $decoded ) ) {
				$addons = $decoded;
			}
		}

		$waiver = RNTA_Reservations_Waiver_Repository::instance()->get_by_reservation_id( $reservation['id'] );

		$status_options = array(
			'new_request'                 => 'New request',
			'awaiting_payment_review'     => 'Awaiting payment review',
			'pending_schedule_review'     => 'Pending schedule review',
			'pending_client_confirmation' => 'Pending client confirmation',
			'confirmed'                   => 'Confirmed',
			'reschedule_requested'        => 'Reschedule requested',
			'rescheduled'                 => 'Rescheduled',
			'declined'                    => 'Declined',
			'cancelled'                   => 'Cancelled',
			'completed'                   => 'Completed',
		);

		$payment_status_options = array(
			'pending_proof'    => 'Pending proof',
			'proof_received'   => 'Proof received',
			'payment_verified' => 'Payment verified',
			'fully_paid'       => 'Fully paid',
			'payment_rejected' => 'Payment rejected',
			'refunded'         => 'Refunded',
		);

		$conflict_result  = RNTA_Reservations_Conflict_Engine::instance()->sync_reservation( $reservation_id );
		$reservation      = RNTA_Reservations_Repository::instance()->get_by_id( $reservation_id );
		$verified_by_name = '—';
		$addon_lines      = $this->build_addons_lines( $addons );
		$invitation_ready = in_array( $reservation['reservation_status'], array( 'confirmed', 'pending_client_confirmation', 'rescheduled' ), true );
		$hold_expires_at  = RNTA_Reservations_Conflict_Engine::instance()->get_hold_expiration_datetime( $reservation );
		$hold_is_active   = RNTA_Reservations_Conflict_Engine::instance()->reservation_hold_is_active( $reservation );

		if ( ! empty( $reservation['payment_verified_by'] ) ) {
			$user = get_user_by( 'id', absint( $reservation['payment_verified_by'] ) );
			if ( $user ) {
				$verified_by_name = $user->display_name;
			}
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( 'Reservation #' . $reservation['id'] ); ?></h1>
			<p>
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=rnta-reservations' ) ); ?>" class="button"><?php esc_html_e( 'Back to Reservations', 'rockntiara-reservations' ); ?></a>
				<a href="<?php echo esc_url( admin_url( 'post.php?post=' . absint( $reservation['woo_order_id'] ) . '&action=edit' ) ); ?>" class="button"><?php esc_html_e( 'Open Woo Order', 'rockntiara-reservations' ); ?></a>
				<a href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin.php?page=rnta-reservations&rnta_action=delete_reservation&reservation_id=' . absint( $reservation['id'] ) ), 'rnta_delete_reservation_' . absint( $reservation['id'] ) ) ); ?>" class="button" style="color:#b42318;" onclick="return confirm('<?php echo esc_js( __( 'Delete this reservation record only? The Woo order will remain intact.', 'rockntiara-reservations' ) ); ?>');"><?php esc_html_e( 'Delete reservation', 'rockntiara-reservations' ); ?></a>
			</p>

			<?php if ( ! empty( $reservation['conflict_flag'] ) ) : ?>
				<div class="notice notice-warning inline"><p><?php esc_html_e( 'This reservation currently overlaps another blocked time window.', 'rockntiara-reservations' ); ?></p></div>
			<?php endif; ?>

			<div style="display:grid;grid-template-columns:1.2fr .8fr;gap:20px;max-width:1480px;align-items:start;">
				<div style="display:grid;gap:20px;">
					<div class="postbox" style="padding:20px;">
						<h2 style="margin-top:0;"><?php esc_html_e( 'Reservation details', 'rockntiara-reservations' ); ?></h2>
						<table class="widefat striped">
							<tbody>
								<tr><td><strong><?php esc_html_e( 'Party', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( $reservation['party_name'] ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Host', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( trim( $reservation['host_first_name'] . ' ' . $reservation['host_last_name'] ) ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Email', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( $reservation['host_email'] ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Phone', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( ! empty( $reservation['host_phone'] ) ? $reservation['host_phone'] : '—' ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Child name', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( ! empty( $reservation['child_name'] ) ? $reservation['child_name'] : '—' ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Child age', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( ! empty( $reservation['child_age'] ) ? $reservation['child_age'] : '—' ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Requested date', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( ! empty( $reservation['requested_party_date'] ) ? $reservation['requested_party_date'] : '—' ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Requested time', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( ! empty( $reservation['requested_start_time'] ) ? $reservation['requested_start_time'] : '—' ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Guest count', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( $reservation['guest_count'] ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Included guests', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( $reservation['included_guests'] ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Additional guests', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( $reservation['extra_guest_count'] ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Estimated total', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( '$' . number_format( (float) $reservation['estimated_total'], 2 ) ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Deposit', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( '$' . number_format( (float) $reservation['deposit_amount'], 2 ) ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Payment status', 'rockntiara-reservations' ); ?></strong></td><td><?php echo $this->render_status_badge( ! empty( $reservation['payment_status'] ) ? $reservation['payment_status'] : 'pending_proof', 'payment' ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Waiver status', 'rockntiara-reservations' ); ?></strong></td><td><?php echo $waiver ? $this->render_status_badge( 'received', 'waiver' ) : $this->render_status_badge( 'pending', 'waiver' ); ?></td></tr>
								<?php if ( $waiver ) : ?>
									<tr><td><strong><?php esc_html_e( 'Waiver signer', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( $waiver['signer_name'] . ' - ' . $waiver['signer_relationship'] ); ?></td></tr>
									<tr><td><strong><?php esc_html_e( 'Waiver submitted', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( $waiver['created_at'] ); ?></td></tr>
									<?php if ( ! empty( $waiver['waiver_pdf_path'] ) ) : ?>
										<tr>
											<td><strong><?php esc_html_e( 'Waiver PDF', 'rockntiara-reservations' ); ?></strong></td>
											<td><a class="button button-small" href="<?php echo esc_url( RNTA_Reservations_Waiver_PDF_Download::instance()->get_download_url( 'host', $reservation['id'] ) ); ?>"><?php esc_html_e( 'Download PDF', 'rockntiara-reservations' ); ?></a></td>
										</tr>
									<?php endif; ?>
								<?php endif; ?>
								<tr><td><strong><?php esc_html_e( 'Final negotiated total', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( '$' . number_format( (float) $reservation['final_negotiated_total'], 2 ) ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Access code', 'rockntiara-reservations' ); ?></strong></td><td><?php echo esc_html( ! empty( $reservation['access_code'] ) ? $reservation['access_code'] : '—' ); ?></td></tr>
								<tr><td><strong><?php esc_html_e( 'Woo order', 'rockntiara-reservations' ); ?></strong></td><td>#<?php echo esc_html( $reservation['woo_order_id'] ); ?></td></tr>
							</tbody>
						</table>
					</div>

					<div class="postbox" style="padding:20px;">
						<h2 style="margin-top:0;"><?php esc_html_e( 'Requested notes & addons', 'rockntiara-reservations' ); ?></h2>
						<p><strong><?php esc_html_e( 'Reservation notes:', 'rockntiara-reservations' ); ?></strong><br><?php echo nl2br( esc_html( ! empty( $reservation['reservation_notes'] ) ? $reservation['reservation_notes'] : '—' ) ); ?></p>
						<p><strong><?php esc_html_e( 'Selected addons:', 'rockntiara-reservations' ); ?></strong></p>
						<?php if ( ! empty( $addons ) ) : ?>
							<ul style="list-style:disc;padding-left:20px;">
								<?php foreach ( $addons as $addon ) : ?>
									<li>
										<?php echo esc_html( isset( $addon['name'] ) ? $addon['name'] : '' ); ?>
										<?php if ( ! empty( $addon['display_price'] ) ) : ?>
											— <?php echo esc_html( $addon['display_price'] ); ?>
										<?php endif; ?>
									</li>
								<?php endforeach; ?>
							</ul>
						<?php else : ?>
							<p>—</p>
						<?php endif; ?>
					</div>

					<div class="postbox" style="padding:20px;">
						<?php echo RNTA_Reservations_Availability_Calendar::instance()->render_reservation_context_calendar( $reservation ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</div>

					<?php echo $this->render_guest_invitations_box( $reservation ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</div>

				<div class="postbox" style="padding:20px;">
					<h2 style="margin-top:0;"><?php esc_html_e( 'Status control', 'rockntiara-reservations' ); ?></h2>
					<form method="post">
						<?php wp_nonce_field( 'rnta_save_reservation_detail' ); ?>
						<input type="hidden" name="reservation_id" value="<?php echo esc_attr( $reservation['id'] ); ?>">
						<input type="hidden" name="rnta_save_reservation" value="1">

						<p>
							<label for="reservation_status"><strong><?php esc_html_e( 'Reservation status', 'rockntiara-reservations' ); ?></strong></label><br>
							<select name="reservation_status" id="reservation_status" style="min-width:280px;">
								<?php foreach ( $status_options as $value => $label ) : ?>
									<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $reservation['reservation_status'], $value ); ?>><?php echo esc_html( $label ); ?></option>
								<?php endforeach; ?>
							</select>
						</p>

						<hr>
						<h3><?php esc_html_e( 'Editable reservation data', 'rockntiara-reservations' ); ?></h3>

						<p>
							<label for="party_name"><strong><?php esc_html_e( 'Party selected', 'rockntiara-reservations' ); ?></strong></label><br>
							<input type="hidden" name="party_post_id" value="<?php echo esc_attr( $reservation['party_post_id'] ); ?>">
							<input type="text" name="party_name" id="party_name" value="<?php echo esc_attr( $reservation['party_name'] ); ?>" style="min-width:320px;">
						</p>

						<p>
							<label for="child_name"><strong><?php esc_html_e( 'Child name', 'rockntiara-reservations' ); ?></strong></label><br>
							<input type="text" name="child_name" id="child_name" value="<?php echo esc_attr( $reservation['child_name'] ); ?>" style="min-width:320px;">
						</p>

						<p>
							<label for="child_age"><strong><?php esc_html_e( 'Child age', 'rockntiara-reservations' ); ?></strong></label><br>
							<input type="text" name="child_age" id="child_age" value="<?php echo esc_attr( $reservation['child_age'] ); ?>" style="min-width:140px;">
						</p>

						<p>
							<label for="guest_count"><strong><?php esc_html_e( 'Guest count', 'rockntiara-reservations' ); ?></strong></label><br>
							<input type="number" min="1" name="guest_count" id="guest_count" value="<?php echo esc_attr( $reservation['guest_count'] ); ?>" style="min-width:140px;">
						</p>

						<p>
							<label for="included_guests"><strong><?php esc_html_e( 'Included guests', 'rockntiara-reservations' ); ?></strong></label><br>
							<input type="number" min="0" name="included_guests" id="included_guests" value="<?php echo esc_attr( $reservation['included_guests'] ); ?>" style="min-width:140px;">
							<br><small><?php esc_html_e( 'Additional guests will be recalculated automatically when you save.', 'rockntiara-reservations' ); ?></small>
						</p>

						<p>
							<label for="estimated_total"><strong><?php esc_html_e( 'Estimated total', 'rockntiara-reservations' ); ?></strong></label><br>
							<input type="number" step="0.01" min="0" name="estimated_total" id="estimated_total" value="<?php echo esc_attr( number_format( (float) $reservation['estimated_total'], 2, '.', '' ) ); ?>" style="min-width:180px;">
							<br><button type="button" class="button button-secondary" id="rnta-copy-estimated-total"><?php esc_html_e( 'Use this as final negotiated total', 'rockntiara-reservations' ); ?></button>
						</p>

						<p>
							<label for="reservation_notes"><strong><?php esc_html_e( 'Reservation notes', 'rockntiara-reservations' ); ?></strong></label><br>
							<textarea name="reservation_notes" id="reservation_notes" rows="4" style="width:100%;"><?php echo esc_textarea( $reservation['reservation_notes'] ); ?></textarea>
						</p>

						<p>
							<label for="addons_lines"><strong><?php esc_html_e( 'Selected addons', 'rockntiara-reservations' ); ?></strong></label><br>
							<textarea name="addons_lines" id="addons_lines" rows="8" style="width:100%;"><?php echo esc_textarea( $addon_lines ); ?></textarea>
							<br><small><?php esc_html_e( 'Use one addon per line. Format: Addon name | 200.00', 'rockntiara-reservations' ); ?></small>
						</p>

						<p>
							<label for="confirmed_party_date"><strong><?php esc_html_e( 'Confirmed party date', 'rockntiara-reservations' ); ?></strong></label><br>
							<input type="date" name="confirmed_party_date" id="confirmed_party_date" value="<?php echo esc_attr( $reservation['confirmed_party_date'] ); ?>">
						</p>

						<p>
							<label for="confirmed_start_time"><strong><?php esc_html_e( 'Confirmed start time', 'rockntiara-reservations' ); ?></strong></label><br>
							<input type="time" name="confirmed_start_time" id="confirmed_start_time" value="<?php echo esc_attr( $reservation['confirmed_start_time'] ); ?>">
						</p>

						<p>
							<label for="confirmed_end_time"><strong><?php esc_html_e( 'Confirmed end time', 'rockntiara-reservations' ); ?></strong></label><br>
							<input type="time" name="confirmed_end_time" id="confirmed_end_time" value="<?php echo esc_attr( $reservation['confirmed_end_time'] ); ?>">
							<br><button type="button" class="button button-secondary" id="rnta-copy-requested-slot"><?php esc_html_e( 'Use requested date & time', 'rockntiara-reservations' ); ?></button>
						</p>

						<p>
							<label for="internal_notes"><strong><?php esc_html_e( 'Internal notes', 'rockntiara-reservations' ); ?></strong></label><br>
							<textarea name="internal_notes" id="internal_notes" rows="8" style="width:100%;"><?php echo esc_textarea( $reservation['internal_notes'] ); ?></textarea>
						</p>

						<hr>
						<h3><?php esc_html_e( 'Payment confirmation', 'rockntiara-reservations' ); ?></h3>

						<p>
							<label for="payment_status"><strong><?php esc_html_e( 'Payment status', 'rockntiara-reservations' ); ?></strong></label><br>
							<select name="payment_status" id="payment_status" style="min-width:280px;">
								<?php foreach ( $payment_status_options as $value => $label ) : ?>
									<option value="<?php echo esc_attr( $value ); ?>" <?php selected( ! empty( $reservation['payment_status'] ) ? $reservation['payment_status'] : 'pending_proof', $value ); ?>><?php echo esc_html( $label ); ?></option>
								<?php endforeach; ?>
							</select>
						</p>

						<p>
							<label for="payment_review_notes"><strong><?php esc_html_e( 'Payment review notes', 'rockntiara-reservations' ); ?></strong></label><br>
							<textarea name="payment_review_notes" id="payment_review_notes" rows="6" style="width:100%;"><?php echo esc_textarea( ! empty( $reservation['payment_review_notes'] ) ? $reservation['payment_review_notes'] : '' ); ?></textarea>
						</p>

						<p>
							<label for="final_negotiated_total"><strong><?php esc_html_e( 'Final negotiated total', 'rockntiara-reservations' ); ?></strong></label><br>
							<input type="number" step="0.01" min="0" name="final_negotiated_total" id="final_negotiated_total" value="<?php echo esc_attr( number_format( (float) $reservation['final_negotiated_total'], 2, '.', '' ) ); ?>" style="min-width:180px;">
						</p>

						<p><button type="submit" class="button button-primary"><?php esc_html_e( 'Save reservation', 'rockntiara-reservations' ); ?></button></p>
					</form>

					<hr>
					<p><strong><?php esc_html_e( 'Future invitation flow', 'rockntiara-reservations' ); ?></strong></p>
					<?php if ( $invitation_ready ) : ?>
						<p>
							<span class="button disabled"><?php esc_html_e( 'Invitation portal unlocks here in next phase', 'rockntiara-reservations' ); ?></span>
							<br><small><?php esc_html_e( 'This reservation is already in a confirmation-ready status, so the host invitation link will live here once the invitations module is implemented.', 'rockntiara-reservations' ); ?></small>
						</p>
					<?php else : ?>
						<p><small><?php esc_html_e( 'Invitation sending will be enabled only after the reservation is confirmed, so the host receives the final date, time, and negotiated invite count.', 'rockntiara-reservations' ); ?></small></p>
					<?php endif; ?>

					<hr>
					<p><strong><?php esc_html_e( 'Operational summary', 'rockntiara-reservations' ); ?></strong></p>
					<ul style="list-style:disc;padding-left:20px;">
						<li><?php echo esc_html( 'Payment review: ' . ( ! empty( $reservation['payment_review_status'] ) ? $reservation['payment_review_status'] : '—' ) ); ?></li>
						<li><?php echo esc_html( 'Payment status: ' . ( ! empty( $reservation['payment_status'] ) ? $reservation['payment_status'] : 'pending_proof' ) ); ?></li>
						<li><?php echo esc_html( 'Payment verified at: ' . ( ! empty( $reservation['payment_verified_at'] ) ? $reservation['payment_verified_at'] : '—' ) ); ?></li>
						<li><?php echo esc_html( 'Payment verified by: ' . $verified_by_name ); ?></li>
						<li><?php echo esc_html( 'Final negotiated total: $' . number_format( (float) $reservation['final_negotiated_total'], 2 ) ); ?></li>
						<li><?php echo esc_html( 'Woo status snapshot: ' . ( ! empty( $reservation['order_status_snapshot'] ) ? $reservation['order_status_snapshot'] : '—' ) ); ?></li>
						<li><?php echo esc_html( 'Requested duration: ' . ( ! empty( $reservation['requested_duration_minutes'] ) ? $reservation['requested_duration_minutes'] . ' min' : '—' ) ); ?></li>
						<li><?php echo esc_html( 'Setup buffer: ' . absint( $reservation['setup_buffer_minutes'] ) . ' min' ); ?></li>
						<li><?php echo esc_html( 'Cleanup buffer: ' . absint( $reservation['cleanup_buffer_minutes'] ) . ' min' ); ?></li>
						<li><?php echo esc_html( 'Temporary 48-hour hold active: ' . ( $hold_is_active ? 'Yes' : 'No' ) ); ?></li>
						<li><?php echo esc_html( 'Hold expires at: ' . ( $hold_expires_at ? $hold_expires_at->format( 'Y-m-d H:i:s' ) : '—' ) ); ?></li>
						<li><?php echo esc_html( 'Conflict flag: ' . ( ! empty( $reservation['conflict_flag'] ) ? 'Yes' : 'No' ) ); ?></li>
						<?php if ( ! empty( $conflict_result['window'] ) ) : ?>
							<li><?php echo esc_html( 'Operational block: ' . $conflict_result['window']['start_datetime'] . ' → ' . $conflict_result['window']['end_datetime'] ); ?></li>
						<?php endif; ?>
					</ul>
				</div>
			</div>
		</div>
		<script>
			document.addEventListener('DOMContentLoaded', function () {
				const copyRequestedButton = document.getElementById('rnta-copy-requested-slot');
				const copyEstimateButton = document.getElementById('rnta-copy-estimated-total');
				const requestedDate = <?php echo wp_json_encode( ! empty( $reservation['requested_party_date'] ) ? $reservation['requested_party_date'] : '' ); ?>;
				const requestedStart = <?php echo wp_json_encode( ! empty( $reservation['requested_start_time'] ) ? $reservation['requested_start_time'] : '' ); ?>;
				const requestedEnd = <?php echo wp_json_encode( ! empty( $reservation['requested_end_time'] ) ? $reservation['requested_end_time'] : '' ); ?>;

				if (copyRequestedButton) {
					copyRequestedButton.addEventListener('click', function () {
						const dateField = document.getElementById('confirmed_party_date');
						const startField = document.getElementById('confirmed_start_time');
						const endField = document.getElementById('confirmed_end_time');
						if (dateField && requestedDate) dateField.value = requestedDate;
						if (startField && requestedStart) startField.value = requestedStart;
						if (endField && requestedEnd) endField.value = requestedEnd;
					});
				}

				if (copyEstimateButton) {
					copyEstimateButton.addEventListener('click', function () {
						const estimateField = document.getElementById('estimated_total');
						const finalField = document.getElementById('final_negotiated_total');
						if (estimateField && finalField) finalField.value = estimateField.value;
					});
				}
			});
		</script>
		<?php
	}

	private function render_guest_invitations_box( $reservation ) {
		$guest_repo    = RNTA_Reservations_Guest_Repository::instance();
		$guests        = $guest_repo->get_by_reservation_id( $reservation['id'] );
		$total_guests  = count( $guests );
		$signed_guests = $guest_repo->count_signed_by_reservation_id( $reservation['id'] );
		$pending_guests= $guest_repo->get_pending_waiver_by_reservation_id( $reservation['id'] );
		$goal          = max( 1, $total_guests > 0 ? $total_guests : absint( $reservation['guest_count'] ) );
		$contracted    = max( 1, absint( $reservation['guest_count'] ) );
		$remaining     = max( 0, $contracted - $total_guests );
		$row_count     = max( 3, min( 12, $remaining > 0 ? $remaining : 3 ) );
		$percent       = min( 100, (int) round( ( $signed_guests / $goal ) * 100 ) );
		$hue           = (int) round( 42 + ( ( 145 - 42 ) * ( $percent / 100 ) ) );

		ob_start();
		?>
		<div class="postbox" style="padding:20px;">
			<h2 style="margin-top:0;"><?php esc_html_e( 'Guest invitations & waivers', 'rockntiara-reservations' ); ?></h2>
			<p><?php esc_html_e( 'Add invited children and parent emails. Each guest gets a unique invitation consent link. This feeds the acceptance progress shown in Reservation Studio.', 'rockntiara-reservations' ); ?></p>

			<div style="margin:16px 0;padding:16px;border:1px solid hsla(<?php echo esc_attr( $hue ); ?>,70%,46%,.24);border-radius:14px;background:linear-gradient(180deg,hsla(<?php echo esc_attr( $hue ); ?>,86%,96%,.9),#fff);">
				<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
					<strong><?php esc_html_e( 'Invitation acceptance progress', 'rockntiara-reservations' ); ?></strong>
					<span style="font-weight:700;color:hsl(<?php echo esc_attr( $hue ); ?>,70%,34%);"><?php echo esc_html( $signed_guests . ' / ' . $goal . ' - ' . $percent . '%' ); ?></span>
				</div>
				<div style="height:12px;border-radius:999px;background:rgba(69,44,53,.08);overflow:hidden;margin-top:10px;">
					<span style="display:block;height:100%;width:<?php echo esc_attr( $percent ); ?>%;border-radius:999px;background:linear-gradient(90deg,#fbbf24,hsl(<?php echo esc_attr( $hue ); ?>,70%,46%));"></span>
				</div>
			</div>

			<form method="post" style="margin:18px 0 24px;">
				<?php wp_nonce_field( 'rnta_add_reservation_guests' ); ?>
				<input type="hidden" name="reservation_id" value="<?php echo esc_attr( $reservation['id'] ); ?>">
				<input type="hidden" name="rnta_add_reservation_guests" value="1">
				<p style="margin:0 0 10px;"><strong><?php esc_html_e( 'Add guests', 'rockntiara-reservations' ); ?></strong></p>
				<p class="description" style="margin-top:0;"><?php echo esc_html( sprintf( __( 'Contracted guest count: %1$d. Current guest invitations: %2$d. Empty rows are ignored.', 'rockntiara-reservations' ), $contracted, $total_guests ) ); ?></p>
				<div style="display:grid;gap:10px;">
					<div style="display:grid;grid-template-columns:1.1fr 1.1fr 1.4fr;gap:10px;color:#646970;font-weight:700;">
						<span><?php esc_html_e( 'Child name', 'rockntiara-reservations' ); ?></span>
						<span><?php esc_html_e( 'Parent / guardian name', 'rockntiara-reservations' ); ?></span>
						<span><?php esc_html_e( 'Parent email', 'rockntiara-reservations' ); ?></span>
					</div>
					<?php for ( $i = 0; $i < $row_count; $i++ ) : ?>
						<div style="display:grid;grid-template-columns:1.1fr 1.1fr 1.4fr;gap:10px;">
							<input type="text" name="guest_rows[<?php echo esc_attr( $i ); ?>][guest_name]" placeholder="<?php esc_attr_e( 'Emma Smith', 'rockntiara-reservations' ); ?>">
							<input type="text" name="guest_rows[<?php echo esc_attr( $i ); ?>][guardian_name]" placeholder="<?php esc_attr_e( 'Parent name', 'rockntiara-reservations' ); ?>">
							<input type="email" name="guest_rows[<?php echo esc_attr( $i ); ?>][guardian_email]" placeholder="<?php esc_attr_e( 'parent@email.com', 'rockntiara-reservations' ); ?>">
						</div>
					<?php endfor; ?>
				</div>
				<p><button type="submit" class="button button-primary"><?php esc_html_e( 'Save & send guest invitations', 'rockntiara-reservations' ); ?></button></p>
			</form>

			<?php if ( empty( $guests ) ) : ?>
				<div class="notice notice-info inline"><p><?php esc_html_e( 'No guest invitations added yet.', 'rockntiara-reservations' ); ?></p></div>
			<?php else : ?>
				<?php if ( ! empty( $pending_guests ) ) : ?>
					<form method="post" style="margin:0 0 14px;">
						<?php wp_nonce_field( 'rnta_resend_pending_guest_invitations' ); ?>
						<input type="hidden" name="rnta_resend_pending_guest_invitations" value="1">
						<input type="hidden" name="reservation_id" value="<?php echo esc_attr( $reservation['id'] ); ?>">
						<button type="submit" class="button"><?php esc_html_e( 'Resend pending invitation consent links', 'rockntiara-reservations' ); ?></button>
					</form>
				<?php endif; ?>
				<table class="widefat striped">
					<thead>
						<tr>
							<th><?php esc_html_e( 'Guest', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Birthday / age', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Parent email', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Invitation', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Consent', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Link / actions', 'rockntiara-reservations' ); ?></th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $guests as $guest ) : ?>
							<?php
							$waiver_url = $guest_repo->get_guest_waiver_url( $guest );
							$is_signed  = 'signed' === $guest['waiver_status'];
							?>
							<tr>
								<td><strong><?php echo esc_html( $guest['guest_name'] ); ?></strong><br><small><?php echo esc_html( $guest['guardian_name'] ); ?></small></td>
								<td>
									<?php if ( ! empty( $guest['guest_birthdate'] ) ) : ?>
										<?php echo esc_html( $guest['guest_birthdate'] ); ?>
										<?php if ( ! empty( $guest['guest_age'] ) ) : ?>
											<br><small><?php echo esc_html( 'Age ' . absint( $guest['guest_age'] ) ); ?></small>
										<?php endif; ?>
									<?php else : ?>
										<?php echo esc_html( '-' ); ?>
									<?php endif; ?>
								</td>
								<td><?php echo esc_html( ! empty( $guest['guardian_email'] ) ? $guest['guardian_email'] : '—' ); ?></td>
								<td><?php echo $this->render_status_badge( $guest['invitation_status'], 'guest_invitation' ); ?></td>
								<td><?php echo $this->render_status_badge( $guest['waiver_status'], 'guest_waiver' ); ?></td>
								<td>
									<a href="<?php echo esc_url( $waiver_url ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Open consent link', 'rockntiara-reservations' ); ?></a>
									<?php if ( $is_signed && ! empty( $guest['waiver_pdf_path'] ) ) : ?>
										<a class="button button-small" style="margin-left:8px;" href="<?php echo esc_url( RNTA_Reservations_Waiver_PDF_Download::instance()->get_download_url( 'guest', $guest['id'] ) ); ?>"><?php esc_html_e( 'Download PDF', 'rockntiara-reservations' ); ?></a>
									<?php endif; ?>
									<?php if ( ! $is_signed && ! empty( $guest['guardian_email'] ) ) : ?>
										<form method="post" style="display:inline;margin-left:8px;">
											<?php wp_nonce_field( 'rnta_send_guest_invitation' ); ?>
											<input type="hidden" name="rnta_send_guest_invitation" value="1">
											<input type="hidden" name="guest_id" value="<?php echo esc_attr( $guest['id'] ); ?>">
											<button type="submit" class="button button-small"><?php esc_html_e( 'Resend email', 'rockntiara-reservations' ); ?></button>
										</form>
									<?php endif; ?>
									<?php if ( ! $is_signed ) : ?>
										<details style="margin-top:10px;">
											<summary style="cursor:pointer;color:#2271b1;"><?php esc_html_e( 'Edit pending invitation', 'rockntiara-reservations' ); ?></summary>
											<form method="post" style="display:grid;gap:8px;max-width:360px;margin-top:10px;">
												<?php wp_nonce_field( 'rnta_update_guest_invitation' ); ?>
												<input type="hidden" name="rnta_update_guest_invitation" value="1">
												<input type="hidden" name="guest_id" value="<?php echo esc_attr( $guest['id'] ); ?>">
												<input type="text" name="guest_name" value="<?php echo esc_attr( $guest['guest_name'] ); ?>" placeholder="<?php esc_attr_e( 'Child name', 'rockntiara-reservations' ); ?>" style="width:100%;">
												<input type="text" name="guardian_name" value="<?php echo esc_attr( $guest['guardian_name'] ); ?>" placeholder="<?php esc_attr_e( 'Parent name', 'rockntiara-reservations' ); ?>" style="width:100%;">
												<input type="email" name="guardian_email" value="<?php echo esc_attr( $guest['guardian_email'] ); ?>" placeholder="<?php esc_attr_e( 'Parent email', 'rockntiara-reservations' ); ?>" style="width:100%;">
												<button type="submit" class="button button-primary"><?php esc_html_e( 'Save & send', 'rockntiara-reservations' ); ?></button>
											</form>
										</details>
										<a href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin.php?page=rnta-reservations&rnta_action=delete_guest&reservation_id=' . absint( $reservation['id'] ) . '&guest_id=' . absint( $guest['id'] ) ), 'rnta_delete_guest_' . absint( $guest['id'] ) ) ); ?>" onclick="return confirm('<?php echo esc_js( __( 'Delete this guest invitation?', 'rockntiara-reservations' ) ); ?>');" style="color:#b42318;margin-left:8px;"><?php esc_html_e( 'Delete', 'rockntiara-reservations' ); ?></a>
									<?php else : ?>
										<p class="description" style="margin:8px 0 0;"><?php esc_html_e( 'Locked after invitation consent acceptance.', 'rockntiara-reservations' ); ?></p>
									<?php endif; ?>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			<?php endif; ?>
		</div>
		<?php
		return ob_get_clean();
	}

	private function build_addons_lines( $addons ) {
		if ( empty( $addons ) || ! is_array( $addons ) ) {
			return '';
		}

		$lines = array();

		foreach ( $addons as $addon ) {
			if ( empty( $addon['name'] ) ) {
				continue;
			}

			$line = sanitize_text_field( $addon['name'] );

			if ( isset( $addon['row_total'] ) && '' !== $addon['row_total'] && null !== $addon['row_total'] ) {
				$line .= ' | ' . number_format( (float) $addon['row_total'], 2, '.', '' );
			} elseif ( ! empty( $addon['display_price'] ) ) {
				$line .= ' | ' . sanitize_text_field( $addon['display_price'] );
			}

			$lines[] = $line;
		}

		return implode( "\n", $lines );
	}

	private function parse_addons_lines( $raw_lines ) {
		$raw_lines = trim( (string) $raw_lines );

		if ( '' === $raw_lines ) {
			return array();
		}

		$rows   = preg_split( '/\r\n|\r|\n/', $raw_lines );
		$addons = array();

		foreach ( $rows as $row ) {
			$row = trim( $row );
			if ( '' === $row ) {
				continue;
			}

			$parts = array_map( 'trim', explode( '|', $row ) );
			$name  = sanitize_text_field( $parts[0] );

			if ( '' === $name ) {
				continue;
			}

			$addon = array(
				'name' => $name,
			);

			if ( isset( $parts[1] ) && '' !== $parts[1] ) {
				$price_text = sanitize_text_field( $parts[1] );
				$numeric    = preg_replace( '/[^0-9.\-]/', '', $price_text );

				if ( '' !== $numeric && is_numeric( $numeric ) ) {
					$addon['row_total']     = (float) $numeric;
					$addon['display_price'] = '$' . number_format( (float) $numeric, 2 );
				} else {
					$addon['display_price'] = $price_text;
				}
			}

			$addons[] = $addon;
		}

		return $addons;
	}

	private function render_guest_waiver_progress( $progress ) {
		$total   = isset( $progress['total'] ) ? absint( $progress['total'] ) : 0;
		$signed  = isset( $progress['signed'] ) ? absint( $progress['signed'] ) : 0;
		$pending = isset( $progress['pending'] ) ? absint( $progress['pending'] ) : max( 0, $total - $signed );

		if ( 0 === $total ) {
			return '<span style="color:#667085;font-weight:600;">' . esc_html__( 'No invitations', 'rockntiara-reservations' ) . '</span>';
		}

		if ( 0 === $pending ) {
			$status = '<span style="color:#027a48;font-weight:700;">' . esc_html__( 'Complete', 'rockntiara-reservations' ) . '</span>';
		} else {
			$status = '<span style="color:#b54708;font-weight:700;">' . esc_html( sprintf( _n( '%d pending', '%d pending', $pending, 'rockntiara-reservations' ), $pending ) ) . '</span>';
		}

		return '<strong>' . esc_html( $signed . ' / ' . $total ) . '</strong> ' . esc_html__( 'accepted', 'rockntiara-reservations' ) . '<br><small>' . $status . '</small>';
	}

	private function render_status_badge( $status, $type = 'reservation' ) {
		$label = ucwords( str_replace( '_', ' ', (string) $status ) );
		$style = 'background:#f3f4f6;color:#344054;border:1px solid #d0d5dd;';

		if ( 'waiver' === $type ) {
			$map = array(
				'pending'  => 'background:#fff4e5;color:#b54708;border:1px solid #fedf89;',
				'received' => 'background:#ecfdf3;color:#027a48;border:1px solid #abefc6;',
			);
			if ( isset( $map[ $status ] ) ) {
				$style = $map[ $status ];
			}
		} elseif ( 'guest_invitation' === $type ) {
			$map = array(
				'not_sent' => 'background:#f2f4f7;color:#667085;border:1px solid #d0d5dd;',
				'sent'     => 'background:#eff8ff;color:#175cd3;border:1px solid #b2ddff;',
			);
			if ( isset( $map[ $status ] ) ) {
				$style = $map[ $status ];
			}
		} elseif ( 'guest_waiver' === $type ) {
			$label = 'signed' === $status ? __( 'Accepted', 'rockntiara-reservations' ) : __( 'Consent pending', 'rockntiara-reservations' );
			$map = array(
				'pending' => 'background:#fff4e5;color:#b54708;border:1px solid #fedf89;',
				'signed'  => 'background:#ecfdf3;color:#027a48;border:1px solid #abefc6;',
			);
			if ( isset( $map[ $status ] ) ) {
				$style = $map[ $status ];
			}
		} elseif ( 'payment' === $type ) {
			$map = array(
				'pending_proof'    => 'background:#fff4e5;color:#b54708;border:1px solid #fedf89;',
				'proof_received'   => 'background:#f5f3ff;color:#6941c6;border:1px solid #d9d6fe;',
				'payment_verified' => 'background:#ecfdf3;color:#027a48;border:1px solid #abefc6;',
				'fully_paid'       => 'background:#eff8ff;color:#175cd3;border:1px solid #b2ddff;',
				'payment_rejected' => 'background:#fef3f2;color:#b42318;border:1px solid #fecdca;',
				'refunded'         => 'background:#f2f4f7;color:#667085;border:1px solid #d0d5dd;',
			);
			if ( isset( $map[ $status ] ) ) {
				$style = $map[ $status ];
			}
		} else {
			$map = array(
				'new_request'                 => 'background:#fff4e5;color:#b54708;border:1px solid #fedf89;',
				'awaiting_payment_review'     => 'background:#fff4e5;color:#b54708;border:1px solid #fedf89;',
				'pending_schedule_review'     => 'background:#f5f3ff;color:#6941c6;border:1px solid #d9d6fe;',
				'pending_client_confirmation' => 'background:#eff8ff;color:#175cd3;border:1px solid #b2ddff;',
				'confirmed'                   => 'background:#ecfdf3;color:#027a48;border:1px solid #abefc6;',
				'reschedule_requested'        => 'background:#fff6ed;color:#c4320a;border:1px solid #f9dbaf;',
				'rescheduled'                 => 'background:#eff8ff;color:#175cd3;border:1px solid #b2ddff;',
				'declined'                    => 'background:#f2f4f7;color:#667085;border:1px solid #d0d5dd;',
				'cancelled'                   => 'background:#fef3f2;color:#b42318;border:1px solid #fecdca;',
				'completed'                   => 'background:#eff8ff;color:#175cd3;border:1px solid #b2ddff;',
			);
			if ( isset( $map[ $status ] ) ) {
				$style = $map[ $status ];
			}
		}

		return '<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;' . esc_attr( $style ) . '"></span>';
	}

	public function render_waivers_page( $is_shortcode = false ) {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$search_query = isset( $_GET['waiver_search'] ) ? sanitize_text_field( wp_unslash( $_GET['waiver_search'] ) ) : ( isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : '' );
		$party_date   = isset( $_GET['party_date'] ) ? sanitize_text_field( wp_unslash( $_GET['party_date'] ) ) : '';
		$waiver_type  = isset( $_GET['waiver_type'] ) ? sanitize_key( wp_unslash( $_GET['waiver_type'] ) ) : 'all';

		$reservations = RNTA_Reservations_Repository::instance()->get_all( 500 );
		$waiver_repo  = RNTA_Reservations_Waiver_Repository::instance();
		$guest_repo   = RNTA_Reservations_Guest_Repository::instance();
		$downloader   = RNTA_Reservations_Waiver_PDF_Download::instance();

		$signed_list = array();

		foreach ( $reservations as $res ) {
			$res_date       = ! empty( $res['confirmed_party_date'] ) ? $res['confirmed_party_date'] : $res['requested_party_date'];
			$res_date_clean = ! empty( $res_date ) ? date( 'Y-m-d', strtotime( $res_date ) ) : '';

			if ( $party_date && $res_date_clean !== $party_date ) {
				continue;
			}

			$host_name  = trim( $res['host_first_name'] . ' ' . $res['host_last_name'] );
			$child_name = $res['child_name'];
			$party_name = $res['party_name'];

			$host_waiver = $waiver_repo->get_by_reservation_id( $res['id'] );
			if ( $host_waiver && in_array( $waiver_type, array( 'all', 'host' ), true ) ) {
				$match = true;
				if ( $search_query ) {
					$haystack = strtolower( implode( ' ', array(
						$host_name,
						$child_name,
						$res['host_email'],
						$res['host_phone'],
						$res['woo_order_id'],
						$res['id'],
						$host_waiver['signer_name'],
						$host_waiver['signer_relationship'],
						$host_waiver['child_name'],
						$party_name,
					) ) );
					$match = false !== strpos( $haystack, strtolower( trim( $search_query ) ) );
				}

				if ( $match ) {
					$signed_list[] = array(
						'reservation_id' => $res['id'],
						'woo_order_id'   => $res['woo_order_id'],
						'type'           => 'host',
						'type_label'     => __( 'Host Waiver (Anfitrión)', 'rockntiara-reservations' ),
						'host_name'      => $host_name,
						'host_email'     => $res['host_email'],
						'child_name'     => $child_name,
						'participant'    => $child_name,
						'signer_name'    => $host_waiver['signer_name'],
						'relationship'   => $host_waiver['signer_relationship'],
						'party_name'     => $party_name,
						'party_date'     => $res_date_clean,
						'signed_date'    => $host_waiver['created_at'],
						'download_url'   => $downloader->get_download_url( 'host', $res['id'] ),
						'party_zip_url'  => $downloader->get_download_url( 'party', $res['id'] ),
					);
				}
			}

			if ( in_array( $waiver_type, array( 'all', 'guest' ), true ) ) {
				$guests = $guest_repo->get_by_reservation_id( $res['id'] );
				foreach ( $guests as $guest ) {
					if ( 'signed' !== $guest['waiver_status'] || empty( $guest['waiver_pdf_path'] ) ) {
						continue;
					}

					$match = true;
					if ( $search_query ) {
						$haystack = strtolower( implode( ' ', array(
							$host_name,
							$child_name,
							$guest['guest_name'],
							$guest['guardian_name'],
							$guest['guardian_email'],
							$guest['signer_name'],
							$guest['signer_relationship'],
							$res['woo_order_id'],
							$res['id'],
							$party_name,
						) ) );
						$match = false !== strpos( $haystack, strtolower( trim( $search_query ) ) );
					}

					if ( $match ) {
						$signed_list[] = array(
							'reservation_id' => $res['id'],
							'woo_order_id'   => $res['woo_order_id'],
							'type'           => 'guest',
							'type_label'     => __( 'Guest Waiver (Invitado)', 'rockntiara-reservations' ),
							'host_name'      => $host_name,
							'host_email'     => $res['host_email'],
							'child_name'     => $child_name,
							'participant'    => $guest['guest_name'],
							'signer_name'    => $guest['signer_name'] ? $guest['signer_name'] : $guest['guardian_name'],
							'relationship'   => $guest['signer_relationship'] ? $guest['signer_relationship'] : 'Guardian',
							'party_name'     => $party_name,
							'party_date'     => $res_date_clean,
							'signed_date'    => $guest['signed_at'] ? $guest['signed_at'] : $guest['created_at'],
							'download_url'   => $downloader->get_download_url( 'guest', $guest['id'] ),
							'party_zip_url'  => $downloader->get_download_url( 'party', $res['id'] ),
						);
					}
				}
			}
		}

		$pdf_icon_svg    = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
		$zip_icon_svg    = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-2px;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>';
		$search_icon_svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-2px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

		if ( $is_shortcode ) :
			$form_url = get_permalink();
			?>
			<div class="rnta-waiver rnta-waiver--dashboard">
				<div class="rnta-waiver__intro">
					<span class="rnta-waiver__eyebrow"><?php esc_html_e( 'Panel de Control / Staff', 'rockntiara-reservations' ); ?></span>
					<h3 class="rnta-waiver__title"><?php esc_html_e( 'Exenciones Firmadas', 'rockntiara-reservations' ); ?></h3>
					<p class="rnta-waiver__copy"><?php esc_html_e( 'Consulte, filtre y descargue las exenciones de responsabilidad individuales o el paquete completo de la fiesta (ZIP).', 'rockntiara-reservations' ); ?></p>
				</div>

				<form method="get" action="<?php echo esc_url( $form_url ? $form_url : '' ); ?>" class="rnta-waiver__card rnta-waiver__filter-bar">
					<div class="rnta-waiver__filter-group">
						<label for="rnta-search-waivers"><?php esc_html_e( 'Búsqueda (Nombre / Email / Orden #)', 'rockntiara-reservations' ); ?></label>
						<input type="search" name="waiver_search" id="rnta-search-waivers" value="<?php echo esc_attr( $search_query ); ?>" placeholder="Buscar por nombre, email o # orden">
					</div>

					<div class="rnta-waiver__filter-group">
						<label for="rnta-filter-date"><?php esc_html_e( 'Fecha de la Fiesta', 'rockntiara-reservations' ); ?></label>
						<input type="date" name="party_date" id="rnta-filter-date" value="<?php echo esc_attr( $party_date ); ?>">
					</div>

					<div class="rnta-waiver__filter-group">
						<label for="rnta-filter-type"><?php esc_html_e( 'Tipo de Exención', 'rockntiara-reservations' ); ?></label>
						<select name="waiver_type" id="rnta-filter-type">
							<option value="all" <?php selected( $waiver_type, 'all' ); ?>><?php esc_html_e( 'Todas las Exenciones', 'rockntiara-reservations' ); ?></option>
							<option value="host" <?php selected( $waiver_type, 'host' ); ?>><?php esc_html_e( 'Solo Anfitriones', 'rockntiara-reservations' ); ?></option>
							<option value="guest" <?php selected( $waiver_type, 'guest' ); ?>><?php esc_html_e( 'Solo Invitados', 'rockntiara-reservations' ); ?></option>
						</select>
					</div>

					<div style="display:flex;gap:8px;align-items:center;">
						<button type="submit" class="rnta-waiver__btn-sm rnta-waiver__btn-sm--primary">
							<?php echo $search_icon_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							<?php esc_html_e( 'Filtrar', 'rockntiara-reservations' ); ?>
						</button>
						<a href="<?php echo esc_url( $form_url ? $form_url : '' ); ?>" class="rnta-waiver__btn-sm" style="background:#f2f4f7;color:#475467;border:1px solid #d0d5dd;">
							<?php esc_html_e( 'Limpiar', 'rockntiara-reservations' ); ?>
						</a>
					</div>
				</form>

				<?php if ( empty( $signed_list ) ) : ?>
					<div class="rnta-waiver__message rnta-waiver__message--error">
						<?php esc_html_e( 'No se encontraron exenciones firmadas con los filtros seleccionados.', 'rockntiara-reservations' ); ?>
					</div>
				<?php else : ?>
					<div class="rnta-waiver__card rnta-waiver__table-wrap">
						<table class="rnta-waiver__table">
							<thead>
								<tr>
									<th><?php esc_html_e( 'Orden / Ref', 'rockntiara-reservations' ); ?></th>
									<th><?php esc_html_e( 'Tipo', 'rockntiara-reservations' ); ?></th>
									<th><?php esc_html_e( 'Participante', 'rockntiara-reservations' ); ?></th>
									<th><?php esc_html_e( 'Firmante / Tutor', 'rockntiara-reservations' ); ?></th>
									<th><?php esc_html_e( 'Anfitrión', 'rockntiara-reservations' ); ?></th>
									<th><?php esc_html_e( 'Experiencia', 'rockntiara-reservations' ); ?></th>
									<th><?php esc_html_e( 'Fecha Fiesta', 'rockntiara-reservations' ); ?></th>
									<th><?php esc_html_e( 'Fecha Firma', 'rockntiara-reservations' ); ?></th>
									<th><?php esc_html_e( 'Descargas', 'rockntiara-reservations' ); ?></th>
								</tr>
							</thead>
							<tbody>
								<?php foreach ( $signed_list as $item ) : ?>
									<tr>
										<td>#<?php echo esc_html( $item['woo_order_id'] ); ?></td>
										<td>
											<span class="rnta-waiver__badge <?php echo 'host' === $item['type'] ? 'rnta-waiver__badge--host' : 'rnta-waiver__badge--guest'; ?>">
												<?php echo esc_html( $item['type_label'] ); ?>
											</span>
										</td>
										<td><strong><?php echo esc_html( $item['participant'] ); ?></strong></td>
										<td><?php echo esc_html( $item['signer_name'] . ' (' . $item['relationship'] . ')' ); ?></td>
										<td><?php echo esc_html( $item['host_name'] ); ?><br><small style="color:#856b76;"><?php echo esc_html( $item['host_email'] ); ?></small></td>
										<td><?php echo esc_html( $item['party_name'] ); ?></td>
										<td><?php echo esc_html( ! empty( $item['party_date'] ) ? $item['party_date'] : '—' ); ?></td>
										<td><?php echo esc_html( $item['signed_date'] ); ?></td>
										<td>
											<a href="<?php echo esc_url( $item['download_url'] ); ?>" class="rnta-waiver__btn-sm rnta-waiver__btn-sm--primary">
												<?php echo $pdf_icon_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
												<?php esc_html_e( 'PDF', 'rockntiara-reservations' ); ?>
											</a>
											<a href="<?php echo esc_url( $item['party_zip_url'] ); ?>" class="rnta-waiver__btn-sm rnta-waiver__btn-sm--zip">
												<?php echo $zip_icon_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
												<?php esc_html_e( 'Party ZIP', 'rockntiara-reservations' ); ?>
											</a>
										</td>
									</tr>
								<?php endforeach; ?>
							</tbody>
						</table>
					</div>
				<?php endif; ?>
			</div>
			<?php
			return;
		endif;

		// Standard WP Admin Page View
		?>
		<div class="wrap">
			<h1 style="color:#ed4f8f;font-family:'Great Vibes',cursive;font-size:48px;font-weight:400;margin-bottom:0;"><?php esc_html_e( 'Signed Waivers & Downloads', 'rockntiara-reservations' ); ?></h1>
			<p><?php esc_html_e( 'View, filter, and download individual signed waivers or complete party waiver ZIP packages.', 'rockntiara-reservations' ); ?></p>

			<form method="get" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>" style="background:#fff;padding:16px 20px;border:1px solid #c3c4c7;border-radius:8px;margin:18px 0;display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
				<input type="hidden" name="page" value="rnta-waivers">

				<div>
					<label for="rnta-search-waivers" style="display:block;font-weight:600;margin-bottom:4px;"><?php esc_html_e( 'Search (Name / Email / Order #)', 'rockntiara-reservations' ); ?></label>
					<input type="search" name="waiver_search" id="rnta-search-waivers" value="<?php echo esc_attr( $search_query ); ?>" placeholder="Search name or order #" style="min-width:240px;">
				</div>

				<div>
					<label for="rnta-filter-date" style="display:block;font-weight:600;margin-bottom:4px;"><?php esc_html_e( 'Party Date', 'rockntiara-reservations' ); ?></label>
					<input type="date" name="party_date" id="rnta-filter-date" value="<?php echo esc_attr( $party_date ); ?>">
				</div>

				<div>
					<label for="rnta-filter-type" style="display:block;font-weight:600;margin-bottom:4px;"><?php esc_html_e( 'Waiver Type', 'rockntiara-reservations' ); ?></label>
					<select name="waiver_type" id="rnta-filter-type">
						<option value="all" <?php selected( $waiver_type, 'all' ); ?>><?php esc_html_e( 'All Waivers', 'rockntiara-reservations' ); ?></option>
						<option value="host" <?php selected( $waiver_type, 'host' ); ?>><?php esc_html_e( 'Host Waivers Only', 'rockntiara-reservations' ); ?></option>
						<option value="guest" <?php selected( $waiver_type, 'guest' ); ?>><?php esc_html_e( 'Guest Waivers Only', 'rockntiara-reservations' ); ?></option>
					</select>
				</div>

				<div>
					<button type="submit" class="button button-primary">
						<?php echo $search_icon_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						<?php esc_html_e( 'Filter Waivers', 'rockntiara-reservations' ); ?>
					</button>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=rnta-waivers' ) ); ?>" class="button"><?php esc_html_e( 'Reset', 'rockntiara-reservations' ); ?></a>
				</div>
			</form>

			<?php if ( empty( $signed_list ) ) : ?>
				<div class="notice notice-info inline">
					<p><?php esc_html_e( 'No signed waiver records match your filters.', 'rockntiara-reservations' ); ?></p>
				</div>
			<?php else : ?>
				<p style="font-weight:600;"><?php printf( esc_html__( 'Found %d signed waiver record(s)', 'rockntiara-reservations' ), count( $signed_list ) ); ?></p>
				<table class="widefat striped" style="max-width:1480px;">
					<thead>
						<tr>
							<th><?php esc_html_e( 'Order / Ref', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Type', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Participant Child', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Signer / Guardian', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Host', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Party Experience', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Party Date', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Signed Date', 'rockntiara-reservations' ); ?></th>
							<th><?php esc_html_e( 'Downloads', 'rockntiara-reservations' ); ?></th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $signed_list as $item ) : ?>
							<tr>
								<td>
									<a href="<?php echo esc_url( admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $item['reservation_id'] ) ) ); ?>">
										#<?php echo esc_html( $item['woo_order_id'] ); ?>
									</a>
								</td>
								<td>
									<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;<?php echo 'host' === $item['type'] ? 'background:#ecfdf3;color:#027a48;' : 'background:#eff8ff;color:#175cd3;'; ?>">
										<?php echo esc_html( $item['type_label'] ); ?>
									</span>
								</td>
								<td><strong><?php echo esc_html( $item['participant'] ); ?></strong></td>
								<td><?php echo esc_html( $item['signer_name'] . ' (' . $item['relationship'] . ')' ); ?></td>
								<td><?php echo esc_html( $item['host_name'] ); ?><br><small style="color:#667085;"><?php echo esc_html( $item['host_email'] ); ?></small></td>
								<td><?php echo esc_html( $item['party_name'] ); ?></td>
								<td><?php echo esc_html( ! empty( $item['party_date'] ) ? $item['party_date'] : '—' ); ?></td>
								<td><?php echo esc_html( $item['signed_date'] ); ?></td>
								<td>
									<a href="<?php echo esc_url( $item['download_url'] ); ?>" class="button button-small button-primary" style="margin-right:4px;">
										<?php echo $pdf_icon_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
										<?php esc_html_e( 'PDF', 'rockntiara-reservations' ); ?>
									</a>
									<a href="<?php echo esc_url( $item['party_zip_url'] ); ?>" class="button button-small" style="background:#fdf2f8;border-color:#f472b6;color:#be185d;">
										<?php echo $zip_icon_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
										<?php esc_html_e( 'Party ZIP', 'rockntiara-reservations' ); ?>
									</a>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			<?php endif; ?>
		</div>
		<?php
	}
}
