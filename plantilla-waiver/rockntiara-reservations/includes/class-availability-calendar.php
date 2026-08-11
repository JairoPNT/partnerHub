<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Availability_Calendar {
	private const MINIMUM_LEAD_DAYS = 12;

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		add_shortcode( 'rnta_availability_calendar', array( $this, 'render_public_shortcode' ) );
		add_action( 'wp_footer', array( $this, 'print_public_assets' ), 99 );
	}

	public function render_public_shortcode( $atts = array() ) {
		$atts = shortcode_atts(
			array(
				'months'       => 2,
				'title'        => 'See available dates before you request your party',
				'single_month' => 'no',
			),
			$atts,
			'rnta_availability_calendar'
		);

		$months       = max( 1, min( 12, absint( $atts['months'] ) ) );
		$single_month = in_array( strtolower( (string) $atts['single_month'] ), array( '1', 'true', 'yes' ), true );
		$data         = $this->get_months_payload( $months );
		$uid          = 'rnta-availability-' . wp_generate_uuid4();

		ob_start();
		$this->print_public_assets();
		?>
		<div class="rnta-availability<?php echo $single_month ? ' rnta-availability--single' : ''; ?>" id="<?php echo esc_attr( $uid ); ?>" data-rnta-availability="<?php echo esc_attr( wp_json_encode( $data ) ); ?>">
			<div class="rnta-availability__header">
				<span class="rnta-availability__eyebrow"><?php esc_html_e( 'Availability', 'rockntiara-reservations' ); ?></span>
				<h3 class="rnta-availability__title"><?php echo esc_html( $atts['title'] ); ?></h3>
				<p class="rnta-availability__copy"><?php echo esc_html( sprintf( __( 'Parties require at least %d days notice and are available Friday, Saturday, and Sunday only. Fixed start times are 10:00 AM, 1:00 PM, 4:00 PM, and 7:00 PM. Blocked dates come from confirmed reservations, active 48-hour payment holds, and manual blackout windows. Click an available date to populate Book Now automatically.', 'rockntiara-reservations' ), self::MINIMUM_LEAD_DAYS ) ); ?></p>
			</div>
			<div class="rnta-availability__legend">
				<span><i class="rnta-availability__dot rnta-availability__dot--available"></i><?php esc_html_e( 'Available', 'rockntiara-reservations' ); ?></span>
				<span><i class="rnta-availability__dot rnta-availability__dot--leadtime"></i><?php echo esc_html( sprintf( __( '%d-day notice', 'rockntiara-reservations' ), self::MINIMUM_LEAD_DAYS ) ); ?></span>
				<span><i class="rnta-availability__dot rnta-availability__dot--limited"></i><?php esc_html_e( 'Limited', 'rockntiara-reservations' ); ?></span>
				<span><i class="rnta-availability__dot rnta-availability__dot--blocked"></i><?php esc_html_e( 'Unavailable', 'rockntiara-reservations' ); ?></span>
				<span><i class="rnta-availability__dot rnta-availability__dot--weekday-blocked"></i><?php esc_html_e( 'Mon-Thu closed', 'rockntiara-reservations' ); ?></span>
				<span><i class="rnta-availability__dot rnta-availability__dot--past"></i><?php esc_html_e( 'Past', 'rockntiara-reservations' ); ?></span>
			</div>
			<?php if ( $single_month && count( $data['months'] ) > 1 ) : ?>
				<div class="rnta-availability__toolbar">
					<label class="rnta-availability__toolbar-label" for="<?php echo esc_attr( $uid ); ?>-month-selector"><?php esc_html_e( 'Month', 'rockntiara-reservations' ); ?></label>
					<select class="rnta-availability__month-selector" id="<?php echo esc_attr( $uid ); ?>-month-selector" data-rnta-month-selector>
						<?php foreach ( $data['months'] as $index => $month ) : ?>
							<option value="<?php echo esc_attr( $index ); ?>"><?php echo esc_html( $month['label'] ); ?></option>
						<?php endforeach; ?>
					</select>
				</div>
			<?php endif; ?>
			<div class="rnta-availability__months">
				<?php foreach ( $data['months'] as $index => $month ) : ?>
					<div class="rnta-availability__month-frame<?php echo ( ! $single_month || 0 === $index ) ? ' is-active' : ''; ?>" data-rnta-month-frame="<?php echo esc_attr( $index ); ?>">
						<?php echo $this->render_month_grid( $month, true ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}

	public function render_admin_calendar_page() {
		$requested_month = isset( $_GET['rnta_calendar_month'] ) ? sanitize_text_field( wp_unslash( $_GET['rnta_calendar_month'] ) ) : current_time( 'Y-m' );
		$month_start     = preg_match( '/^\d{4}-(0[1-9]|1[0-2])$/', $requested_month ) ? $requested_month . '-01' : current_time( 'Y-m-01' );
		$requested_date  = isset( $_GET['rnta_calendar_date'] ) ? sanitize_text_field( wp_unslash( $_GET['rnta_calendar_date'] ) ) : current_time( 'Y-m-d' );
		$requested_date  = preg_match( '/^\d{4}-\d{2}-\d{2}$/', $requested_date ) ? $requested_date : substr( $month_start, 0, 7 ) . '-01';
		$initial_view    = isset( $_GET['rnta_calendar_view'] ) ? sanitize_key( wp_unslash( $_GET['rnta_calendar_view'] ) ) : 'month';
		$initial_view    = in_array( $initial_view, array( 'month', 'agenda', 'week', 'day' ), true ) ? $initial_view : 'month';
		$data            = $this->get_admin_month_payload( $month_start );
		$all_blocks      = RNTA_Reservations_Block_Repository::instance()->get_all_blocks( 1000 );
		$uid  = 'rnta-admin-calendar-' . wp_generate_uuid4();
		$this->print_public_assets();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Availability Calendar', 'rockntiara-reservations' ); ?></h1>
			<p><?php esc_html_e( 'This view gives the team a quick visual map of blocked dates generated by confirmed reservations and manual blackout windows.', 'rockntiara-reservations' ); ?></p>
			<div class="rnta-availability rnta-availability--admin" id="<?php echo esc_attr( $uid ); ?>">
				<form class="rnta-admin-calendar-toolbar" method="get">
					<input type="hidden" name="page" value="rnta-reservation-calendar">
					<input type="hidden" name="rnta_calendar_view" data-rnta-admin-view-input value="<?php echo esc_attr( $initial_view ); ?>">
					<label for="<?php echo esc_attr( $uid ); ?>-month"><?php esc_html_e( 'Month', 'rockntiara-reservations' ); ?></label>
					<select id="<?php echo esc_attr( $uid ); ?>-month" name="rnta_calendar_month" data-rnta-admin-month>
						<?php for ( $month_number = 1; $month_number <= 12; $month_number++ ) : $month_value = gmdate( 'Y', strtotime( $month_start ) ) . '-' . str_pad( (string) $month_number, 2, '0', STR_PAD_LEFT ); ?>
							<option value="<?php echo esc_attr( $month_value ); ?>" <?php selected( $month_value, substr( $month_start, 0, 7 ) ); ?>><?php echo esc_html( gmdate( 'F', strtotime( $month_value . '-01' ) ) ); ?></option>
						<?php endfor; ?>
					</select>
					<label for="<?php echo esc_attr( $uid ); ?>-year"><?php esc_html_e( 'Year', 'rockntiara-reservations' ); ?></label>
					<select id="<?php echo esc_attr( $uid ); ?>-year" data-rnta-admin-year>
						<?php for ( $year = (int) current_time( 'Y' ) - 5; $year <= (int) current_time( 'Y' ) + 10; $year++ ) : ?><option value="<?php echo esc_attr( $year ); ?>" <?php selected( $year, (int) gmdate( 'Y', strtotime( $month_start ) ) ); ?>><?php echo esc_html( $year ); ?></option><?php endfor; ?>
					</select>
					<button type="submit" class="button button-primary">View calendar</button>
					<label for="<?php echo esc_attr( $uid ); ?>-date"><?php esc_html_e( 'Date', 'rockntiara-reservations' ); ?></label>
					<input type="date" id="<?php echo esc_attr( $uid ); ?>-date" name="rnta_calendar_date" data-rnta-admin-date value="<?php echo esc_attr( $requested_date ); ?>">
					<div class="rnta-admin-calendar-nav" role="group" aria-label="Calendar navigation">
						<button type="button" class="button" data-rnta-admin-nav="prev">&lsaquo;</button>
						<button type="button" class="button" data-rnta-admin-nav="today">Today</button>
						<button type="button" class="button" data-rnta-admin-nav="next">&rsaquo;</button>
					</div>
					<div class="rnta-admin-calendar-views" role="group" aria-label="Calendar view">
						<button type="button" class="button<?php echo 'month' === $initial_view ? ' is-active' : ''; ?>" data-rnta-admin-view="month">Month</button>
						<button type="button" class="button<?php echo 'agenda' === $initial_view ? ' is-active' : ''; ?>" data-rnta-admin-view="agenda">Agenda</button>
						<button type="button" class="button<?php echo 'week' === $initial_view ? ' is-active' : ''; ?>" data-rnta-admin-view="week">Week</button>
						<button type="button" class="button<?php echo 'day' === $initial_view ? ' is-active' : ''; ?>" data-rnta-admin-view="day">Day</button>
					</div>
				</form>
				<div class="rnta-availability__legend">
					<span><i class="rnta-availability__dot rnta-availability__dot--available"></i><?php esc_html_e( 'Available', 'rockntiara-reservations' ); ?></span>
					<span><i class="rnta-availability__dot rnta-availability__dot--leadtime"></i><?php echo esc_html( sprintf( __( '%d-day notice', 'rockntiara-reservations' ), self::MINIMUM_LEAD_DAYS ) ); ?></span>
					<span><i class="rnta-availability__dot rnta-availability__dot--blocked"></i><?php esc_html_e( 'Unavailable / blocked', 'rockntiara-reservations' ); ?></span>
					<span><i class="rnta-availability__dot rnta-availability__dot--weekday-blocked"></i><?php esc_html_e( 'Mon-Thu closed', 'rockntiara-reservations' ); ?></span>
					<span><i class="rnta-availability__dot rnta-availability__dot--past"></i><?php esc_html_e( 'Past', 'rockntiara-reservations' ); ?></span>
				</div>
				<div class="rnta-availability__months rnta-admin-calendar-panels">
					<div class="rnta-admin-calendar-panel is-active" data-rnta-admin-panel="0">
						<?php echo $this->render_admin_month_table( $data['months'][0] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						<?php echo $this->render_admin_agenda_all( $all_blocks ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						<?php echo $this->render_admin_schedule( $requested_date, 'week' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						<?php echo $this->render_admin_schedule( $requested_date, 'day' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</div>
				</div>
			</div>
		</div>
		<div class="rnta-admin-event-modal" data-rnta-admin-modal hidden>
			<div class="rnta-admin-event-modal__backdrop" data-rnta-admin-modal-close></div>
			<div class="rnta-admin-event-modal__card" role="dialog" aria-modal="true" aria-labelledby="rnta-admin-event-modal-title">
				<button type="button" class="rnta-admin-event-modal__close" data-rnta-admin-modal-close aria-label="Close">×</button>
				<span class="rnta-availability__eyebrow">Calendar event</span>
				<h2 id="rnta-admin-event-modal-title" data-event-modal-title></h2>
				<p><strong>Date:</strong> <span data-event-modal-date></span></p>
				<p><strong>Time:</strong> <span data-event-modal-time></span></p>
				<p><strong>Type:</strong> <span data-event-modal-type></span></p>
				<a class="button button-primary" data-event-modal-link href="#" hidden>Open reservation details</a>
			</div>
		</div>
		<script>
		(function(){
			const root=document.getElementById(<?php echo wp_json_encode( $uid ); ?>); if(!root){return;}
			const form=root.querySelector('form'), monthSelect=root.querySelector('[data-rnta-admin-month]'), yearSelect=root.querySelector('[data-rnta-admin-year]'), dateInput=root.querySelector('[data-rnta-admin-date]');
			const panels=Array.from(root.querySelectorAll('[data-rnta-admin-panel]')), viewButtons=Array.from(root.querySelectorAll('[data-rnta-admin-view]'));
			const navButtons=Array.from(root.querySelectorAll('[data-rnta-admin-nav]'));
			let view=<?php echo wp_json_encode( $initial_view ); ?>;
			const viewInput=root.querySelector('[data-rnta-admin-view-input]');
			function dateForNavigation(){
				if(view==='month'||view==='agenda') return yearSelect.value+'-'+monthSelect.value.slice(-2)+'-01';
				return dateInput.value || yearSelect.value+'-'+monthSelect.value.slice(-2)+'-01';
			}
			function submitForDate(date){
				const d=new Date(date+'T12:00:00'); if(Number.isNaN(d.getTime())) return;
				const year=String(d.getFullYear()), month=String(d.getMonth()+1).padStart(2,'0');
				yearSelect.value=year;
				const monthValue=year+'-'+month;
				if(!Array.from(monthSelect.options).some(function(option){return option.value===monthValue;})){const option=document.createElement('option');option.value=monthValue;option.textContent=d.toLocaleString('en-US',{month:'long'});monthSelect.appendChild(option);}
				monthSelect.value=monthValue; dateInput.value=monthValue+'-'+String(d.getDate()).padStart(2,'0'); viewInput.value=view; form.submit();
			}
			function panel(){return panels[0];}
			function alignDateToLoadedMonth(){
				const loadedMonth=yearSelect.value+'-'+monthSelect.value.slice(-2);
				if(!dateInput.value || dateInput.value.slice(0,7)!==loadedMonth){ dateInput.value=loadedMonth+'-01'; }
			}
			function apply(){
				const active=panel(); panels.forEach(p=>p.classList.toggle('is-active',p===active));
				root.classList.toggle('is-agenda-view',view==='agenda'); root.classList.toggle('is-week-view',view==='week'); root.classList.toggle('is-day-view',view==='day');
				const target=dateInput.value;
				root.querySelectorAll('[data-rnta-admin-day]').forEach(cell=>cell.classList.toggle('is-selected-day',cell.getAttribute('data-rnta-admin-day')===target));
				const selectedDay=root.querySelector('[data-rnta-admin-day="'+target+'"]'); const selectedWeek=selectedDay?selectedDay.closest('[data-rnta-admin-week]'):null;
				root.querySelectorAll('[data-rnta-admin-week]').forEach(row=>row.classList.toggle('is-selected-week',!!selectedWeek && row.getAttribute('data-rnta-admin-week')===selectedWeek.getAttribute('data-rnta-admin-week')));
			}
			form.addEventListener('submit',function(){monthSelect.value=yearSelect.value+'-'+monthSelect.value.slice(-2);viewInput.value=view;});
			dateInput.addEventListener('change',function(){
				const target=this.value; const selectedMonth=yearSelect.value+'-'+monthSelect.value.slice(-2);
				if(view==='week'||view==='day'||target.slice(0,7)!==selectedMonth){ submitForDate(target); } else { apply(); }
			});
			viewButtons.forEach(btn=>btn.addEventListener('click',function(){view=this.getAttribute('data-rnta-admin-view');viewInput.value=view;viewButtons.forEach(b=>b.classList.toggle('is-active',b===this));if(view==='week'||view==='day'){alignDateToLoadedMonth();}apply();})); apply();
			navButtons.forEach(btn=>btn.addEventListener('click',function(){
				const action=this.getAttribute('data-rnta-admin-nav'); if(action==='today'){submitForDate('<?php echo esc_js( current_time( 'Y-m-d' ) ); ?>');return;}
				const d=new Date(dateForNavigation()+'T12:00:00'); if(Number.isNaN(d.getTime())) return;
				if(view==='week') d.setDate(d.getDate()+(action==='next'?7:-7)); else if(view==='day') d.setDate(d.getDate()+(action==='next'?1:-1)); else d.setMonth(d.getMonth()+(action==='next'?1:-1));
				submitForDate(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'));
			}));
			const modal=document.querySelector('[data-rnta-admin-modal]');
			if(modal){
				root.addEventListener('click',function(clickEvent){
					const event=clickEvent.target.closest('[data-rnta-admin-event]');
					if(!event || !root.contains(event)){return;}
					clickEvent.preventDefault(); modal.hidden=false;
					modal.querySelector('[data-event-modal-title]').textContent=event.dataset.eventTitle;
					modal.querySelector('[data-event-modal-date]').textContent=event.dataset.eventDate;
					modal.querySelector('[data-event-modal-time]').textContent=event.dataset.eventTime;
					modal.querySelector('[data-event-modal-type]').textContent=event.dataset.eventType;
					const link=modal.querySelector('[data-event-modal-link]');
					if(event.dataset.eventUrl){link.href=event.dataset.eventUrl;link.hidden=false;}else{link.hidden=true;}
				});
				modal.querySelectorAll('[data-rnta-admin-modal-close]').forEach(function(el){el.addEventListener('click',function(){modal.hidden=true;});});
			}
		})();
		</script>
		<?php
	}

	public function render_reservation_context_calendar( $reservation ) {
		RNTA_Reservations_Conflict_Engine::instance()->refresh_all_reservation_blocks();

		$focus_date = ! empty( $reservation['confirmed_party_date'] ) ? $reservation['confirmed_party_date'] : $reservation['requested_party_date'];

		if ( empty( $focus_date ) ) {
			return '<div class="notice notice-info inline"><p>' . esc_html__( 'Set a requested or confirmed date first to load the availability calendar for this reservation.', 'rockntiara-reservations' ) . '</p></div>';
		}

		$month_start = gmdate( 'Y-m-01', strtotime( $focus_date ) );
		$month_end   = gmdate( 'Y-m-t', strtotime( $focus_date ) );
		$blocks      = RNTA_Reservations_Block_Repository::instance()->get_blocks_between( $month_start . ' 00:00:00', $month_end . ' 23:59:59' );
		$blocked_map = $this->build_blocked_dates_map( $blocks );
		$month       = $this->build_month_data( $month_start, $blocked_map, current_time( 'Y-m-d' ), $this->get_minimum_bookable_date_string(), $focus_date );
		$day_blocks  = RNTA_Reservations_Block_Repository::instance()->get_blocks_for_date( $focus_date );
		$timeline    = $this->build_day_timeline( $focus_date, $day_blocks, $reservation );

		ob_start();
		$this->print_public_assets();
		?>
		<div class="rnta-availability rnta-availability--detail">
			<div class="rnta-availability__header rnta-availability__header--detail">
				<span class="rnta-availability__eyebrow"><?php esc_html_e( 'Schedule context', 'rockntiara-reservations' ); ?></span>
				<h3 class="rnta-availability__title rnta-availability__title--detail"><?php esc_html_e( 'Availability around this reservation', 'rockntiara-reservations' ); ?></h3>
				<p class="rnta-availability__copy"><?php echo esc_html( sprintf( __( 'New party requests require at least %d days notice. Parties are available Friday, Saturday, and Sunday only. Party start times are fixed at 10:00 AM, 1:00 PM, 4:00 PM, and 7:00 PM. Each party lasts 2 hours and keeps a 30-minute post-event cleanup buffer. Temporary holds stay blocked for 2 days after the request is created if payment is not yet verified.', 'rockntiara-reservations' ), self::MINIMUM_LEAD_DAYS ) ); ?></p>
			</div>
			<div class="rnta-availability__detail-grid">
				<?php echo $this->render_month_grid( $month, false ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				<div class="rnta-availability__timeline">
					<div class="rnta-availability__timeline-head">
						<h4><?php echo esc_html( sprintf( __( 'Day timeline - %s', 'rockntiara-reservations' ), $focus_date ) ); ?></h4>
					</div>
					<div class="rnta-availability__timeline-list">
						<?php if ( empty( $timeline ) ) : ?>
							<div class="rnta-availability__timeline-empty"><?php esc_html_e( 'No blocks are registered for this date yet.', 'rockntiara-reservations' ); ?></div>
						<?php else : ?>
							<?php foreach ( $timeline as $item ) : ?>
								<div class="rnta-availability__timeline-item rnta-availability__timeline-item--<?php echo esc_attr( $item['type'] ); ?>">
									<div class="rnta-availability__timeline-time"><?php echo esc_html( $item['time_label'] ); ?></div>
									<div class="rnta-availability__timeline-body">
										<strong><?php echo esc_html( $item['title'] ); ?></strong>
										<div><?php echo esc_html( $item['note'] ); ?></div>
									</div>
								</div>
							<?php endforeach; ?>
						<?php endif; ?>
					</div>
				</div>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}

	private function get_months_payload( $months_to_show ) {
		RNTA_Reservations_Conflict_Engine::instance()->refresh_all_reservation_blocks();

		$today       = current_time( 'Y-m-d' );
		$min_date    = $this->get_minimum_bookable_date_string();
		$start_date  = gmdate( 'Y-m-01', strtotime( $today ) );
		$end_date    = gmdate( 'Y-m-t', strtotime( '+' . ( $months_to_show - 1 ) . ' month', strtotime( $start_date ) ) );
		$blocks      = RNTA_Reservations_Block_Repository::instance()->get_blocks_between( $start_date . ' 00:00:00', $end_date . ' 23:59:59' );
		$blocked_map = $this->build_blocked_dates_map( $blocks );
		$months      = array();

		for ( $i = 0; $i < $months_to_show; $i++ ) {
			$month_start = gmdate( 'Y-m-01', strtotime( '+' . $i . ' month', strtotime( $start_date ) ) );
			$months[]    = $this->build_month_data( $month_start, $blocked_map, $today, $min_date );
		}

		return array(
			'today'                 => $today,
			'minimum_lead_days'     => self::MINIMUM_LEAD_DAYS,
			'minimum_bookable_date' => $min_date,
			'months'                => $months,
			'blocks_by_date'        => $this->build_public_blocks_payload( $blocked_map ),
			'fixed_party_start_times' => array( '10:00', '13:00', '16:00', '19:00' ),
			'party_duration_minutes' => 120,
			'business_hours' => array(
				'start' => '10:00',
				'end'   => '21:30',
			),
			'slot_step'      => 30,
			'operational_buffers' => array(
				'setup'   => 0,
				'cleanup' => 30,
			),
		);
	}

	private function get_admin_month_payload( $month_start ) {
		RNTA_Reservations_Conflict_Engine::instance()->refresh_all_reservation_blocks();
		$month_end   = gmdate( 'Y-m-t', strtotime( $month_start ) );
		$blocks      = RNTA_Reservations_Block_Repository::instance()->get_blocks_between( $month_start . ' 00:00:00', $month_end . ' 23:59:59' );
		$blocked_map = $this->build_blocked_dates_map( $blocks );
		$month       = $this->build_month_data( $month_start, $blocked_map, current_time( 'Y-m-d' ), '1900-01-01' );

		return array(
			'today'  => current_time( 'Y-m-d' ),
			'months' => array( $month ),
		);
	}

	private function get_minimum_bookable_date_string() {
		try {
			$today = new DateTimeImmutable( 'today', wp_timezone() );
		} catch ( Exception $e ) {
			$today = new DateTimeImmutable( current_time( 'Y-m-d' ) . ' 00:00:00' );
		}

		return $today->modify( '+' . self::MINIMUM_LEAD_DAYS . ' days' )->format( 'Y-m-d' );
	}

	private function build_public_blocks_payload( $blocked_map ) {
		$payload = array();

		foreach ( $blocked_map as $date => $blocks ) {
			$payload[ $date ] = array();

			foreach ( $blocks as $block ) {
				$block_start_date = ! empty( $block['start'] ) ? substr( $block['start'], 0, 10 ) : $date;
				$block_end_date   = ! empty( $block['end'] ) ? substr( $block['end'], 0, 10 ) : $date;
				$start_time       = ! empty( $block['start'] ) ? substr( $block['start'], 11, 5 ) : '';
				$end_time         = ! empty( $block['end'] ) ? substr( $block['end'], 11, 5 ) : '';

				if ( $date > $block_start_date ) {
					$start_time = '00:00';
				}

				if ( $date < $block_end_date ) {
					$end_time = '23:59';
				}

				$payload[ $date ][] = array(
					'title'  => isset( $block['title'] ) ? $block['title'] : '',
					'type'   => isset( $block['block_type'] ) ? $block['block_type'] : '',
					'start'  => $start_time,
					'end'    => $end_time,
				);
			}
		}

		return $payload;
	}

	private function build_blocked_dates_map( $blocks ) {
		$map = array();

		foreach ( $blocks as $block ) {
			$start = ! empty( $block['start_datetime'] ) ? substr( $block['start_datetime'], 0, 10 ) : '';
			$end   = ! empty( $block['end_datetime'] ) ? substr( $block['end_datetime'], 0, 10 ) : '';

			if ( ! $start || ! $end ) {
				continue;
			}

			$current = strtotime( $start );
			$last    = strtotime( $end );

			while ( $current <= $last ) {
				$key = gmdate( 'Y-m-d', $current );
				if ( ! isset( $map[ $key ] ) ) {
					$map[ $key ] = array();
				}
				$map[ $key ][] = array(
					'reservation_id' => isset( $block['reservation_id'] ) ? absint( $block['reservation_id'] ) : 0,
					'title'      => isset( $block['title'] ) ? $block['title'] : '',
					'block_type' => isset( $block['block_type'] ) ? $block['block_type'] : '',
					'start'      => isset( $block['start_datetime'] ) ? $block['start_datetime'] : '',
					'end'        => isset( $block['end_datetime'] ) ? $block['end_datetime'] : '',
				);
				$current = strtotime( '+1 day', $current );
			}
		}

		return $map;
	}

	private function build_month_data( $month_start, $blocked_map, $today, $minimum_bookable_date, $focus_date = '' ) {
		$label          = gmdate( 'F Y', strtotime( $month_start ) );
		$days_in_month  = (int) gmdate( 't', strtotime( $month_start ) );
		$start_weekday  = (int) gmdate( 'N', strtotime( $month_start ) );
		$weeks          = array();
		$week           = array();

		for ( $i = 1; $i < $start_weekday; $i++ ) {
			$week[] = null;
		}

		for ( $day = 1; $day <= $days_in_month; $day++ ) {
			$date       = gmdate( 'Y-m-d', strtotime( $month_start . ' +' . ( $day - 1 ) . ' day' ) );
			$is_past    = $date < $today;
			$is_too_soon = ! $is_past && $date < $minimum_bookable_date;
			$is_party_day = $this->is_party_day( $date );
			$is_blocked = isset( $blocked_map[ $date ] ) && ! empty( $blocked_map[ $date ] );
			$status     = 'available';

			if ( $is_past ) {
				$status = 'past';
			} elseif ( $is_too_soon ) {
				$status = 'leadtime';
			} elseif ( ! $is_party_day ) {
				$status = 'weekday-blocked';
			} elseif ( $is_blocked ) {
				$status = $this->date_has_full_day_block( $date, $blocked_map[ $date ] ) ? 'blocked' : 'limited';
			}

			$week[] = array(
				'day'      => $day,
				'date'     => $date,
				'status'   => $status,
				'blocks'   => $is_blocked ? $blocked_map[ $date ] : array(),
				'is_focus' => $focus_date === $date,
			);

			if ( count( $week ) === 7 ) {
				$weeks[] = $week;
				$week    = array();
			}
		}

		while ( ! empty( $week ) && count( $week ) < 7 ) {
			$week[] = null;
		}

		if ( ! empty( $week ) ) {
			$weeks[] = $week;
		}

		return array(
			'label' => $label,
			'weeks' => $weeks,
		);
	}

	private function is_party_day( $date ) {
		$weekday = (int) gmdate( 'N', strtotime( $date ) );
		return in_array( $weekday, array( 5, 6, 7 ), true );
	}

	private function date_has_full_day_block( $date, $blocks ) {
		$day_start = strtotime( $date . ' 00:00:00' );
		$day_end   = strtotime( $date . ' 23:59:59' );

		foreach ( $blocks as $block ) {
			$start = ! empty( $block['start'] ) ? strtotime( $block['start'] ) : 0;
			$end   = ! empty( $block['end'] ) ? strtotime( $block['end'] ) : 0;

			if ( $start && $end && $start <= $day_start && $end >= $day_end ) {
				return true;
			}
		}

		return false;
	}

	private function render_month_grid( $month, $public_mode ) {
		ob_start();
		?>
		<div class="rnta-availability__month">
			<div class="rnta-availability__month-header"><?php echo esc_html( $month['label'] ); ?></div>
			<div class="rnta-availability__weekdays">
				<span><?php esc_html_e( 'Mon', 'rockntiara-reservations' ); ?></span>
				<span><?php esc_html_e( 'Tue', 'rockntiara-reservations' ); ?></span>
				<span><?php esc_html_e( 'Wed', 'rockntiara-reservations' ); ?></span>
				<span><?php esc_html_e( 'Thu', 'rockntiara-reservations' ); ?></span>
				<span><?php esc_html_e( 'Fri', 'rockntiara-reservations' ); ?></span>
				<span><?php esc_html_e( 'Sat', 'rockntiara-reservations' ); ?></span>
				<span><?php esc_html_e( 'Sun', 'rockntiara-reservations' ); ?></span>
			</div>
			<div class="rnta-availability__grid">
				<?php foreach ( $month['weeks'] as $week ) : ?>
					<?php foreach ( $week as $cell ) : ?>
						<?php if ( null === $cell ) : ?>
							<div class="rnta-availability__day rnta-availability__day--empty"></div>
						<?php else : ?>
							<?php
							$title = '';
							if ( 'leadtime' === $cell['status'] ) {
								$title = sprintf(
									__( 'Rock N Tiara requires at least %d days notice. Please choose %s or later.', 'rockntiara-reservations' ),
									self::MINIMUM_LEAD_DAYS,
									$this->format_public_date( $this->get_minimum_bookable_date_string() )
								);
							} elseif ( 'weekday-blocked' === $cell['status'] ) {
								$title = __( 'Parties are available Friday, Saturday, and Sunday only.', 'rockntiara-reservations' );
							}
							if ( ! empty( $cell['blocks'] ) ) {
								$title = implode(
									' | ',
									array_map(
										static function ( $block ) {
											return ! empty( $block['title'] ) ? $block['title'] : 'Blocked';
										},
										$cell['blocks']
									)
								);
							}
							?>
							<button
								type="button"
								class="rnta-availability__day rnta-availability__day--<?php echo esc_attr( $cell['status'] ); ?><?php echo ! empty( $cell['is_focus'] ) ? ' rnta-availability__day--focus' : ''; ?>"
								<?php echo $public_mode && in_array( $cell['status'], array( 'available', 'limited' ), true ) ? 'data-rnta-available-date="' . esc_attr( $cell['date'] ) . '"' : ''; ?>
								<?php echo in_array( $cell['status'], array( 'past', 'leadtime', 'blocked', 'weekday-blocked' ), true ) ? 'disabled' : ''; ?>
								title="<?php echo esc_attr( $title ); ?>"
							>
								<span><?php echo esc_html( $cell['day'] ); ?></span>
							</button>
						<?php endif; ?>
					<?php endforeach; ?>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}

	private function render_admin_month_table( $month ) {
		$weekdays = array( 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' );
		ob_start();
		?>
		<div class="rnta-availability__admin-month">
			<div class="rnta-availability__month-header"><?php echo esc_html( $month['label'] ); ?></div>
			<div class="rnta-availability__admin-weekdays">
				<?php foreach ( $weekdays as $weekday ) : ?><span><?php echo esc_html( $weekday ); ?></span><?php endforeach; ?>
			</div>
			<div class="rnta-availability__admin-calendar-grid">
				<?php foreach ( $month['weeks'] as $week_index => $week ) : ?>
					<div class="rnta-availability__admin-week-row" data-rnta-admin-week="<?php echo esc_attr( $week_index ); ?>">
					<?php foreach ( $week as $cell ) : ?>
						<?php if ( null === $cell ) : ?>
							<div class="rnta-availability__admin-day rnta-availability__admin-day--empty"></div>
						<?php else : ?>
							<div class="rnta-availability__admin-day rnta-availability__admin-day--<?php echo esc_attr( $cell['status'] ); ?>" data-rnta-admin-day="<?php echo esc_attr( $cell['date'] ); ?>">
								<div class="rnta-availability__admin-day-number"><?php echo esc_html( $cell['day'] ); ?></div>
								<?php foreach ( $cell['blocks'] as $block ) : ?>
									<?php
									$start = ! empty( $block['start'] ) ? substr( $block['start'], 11, 5 ) : '';
									$end   = ! empty( $block['end'] ) ? substr( $block['end'], 11, 5 ) : '';
									$time  = $start && $end ? $start . '–' . $end : __( 'All day', 'rockntiara-reservations' );
									?>
									<button type="button" class="rnta-availability__admin-event rnta-availability__admin-event--<?php echo esc_attr( 'manual' === $block['block_type'] ? 'manual' : 'reservation' ); ?>" data-rnta-admin-event data-event-title="<?php echo esc_attr( $block['title'] ? $block['title'] : __( 'Blocked', 'rockntiara-reservations' ) ); ?>" data-event-date="<?php echo esc_attr( $cell['date'] ); ?>" data-event-time="<?php echo esc_attr( $time ); ?>" data-event-type="<?php echo esc_attr( 'manual' === $block['block_type'] ? 'Manual blackout' : 'Reservation' ); ?>" data-event-url="<?php echo esc_url( $block['reservation_id'] ? admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $block['reservation_id'] ) ) : '' ); ?>">
										<strong><?php echo esc_html( $time ); ?></strong>
										<span><?php echo esc_html( $block['title'] ? $block['title'] : __( 'Blocked', 'rockntiara-reservations' ) ); ?></span>
									</button>
								<?php endforeach; ?>
							</div>
						<?php endif; ?>
					<?php endforeach; ?>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}

	private function render_admin_agenda( $month ) {
		ob_start();
		?>
		<div class="rnta-admin-agenda">
			<h2><?php esc_html_e( 'Agenda', 'rockntiara-reservations' ); ?></h2>
			<?php $has_events = false; foreach ( $month['weeks'] as $week ) : foreach ( $week as $cell ) : if ( null === $cell || empty( $cell['blocks'] ) ) { continue; } $has_events = true; foreach ( $cell['blocks'] as $block ) : ?>
				<button type="button" class="rnta-admin-agenda-item" data-rnta-admin-event data-event-title="<?php echo esc_attr( $block['title'] ? $block['title'] : __( 'Blocked', 'rockntiara-reservations' ) ); ?>" data-event-date="<?php echo esc_attr( $cell['date'] ); ?>" data-event-time="<?php echo esc_attr( ! empty( $block['start'] ) && ! empty( $block['end'] ) ? substr( $block['start'], 11, 5 ) . '–' . substr( $block['end'], 11, 5 ) : __( 'All day', 'rockntiara-reservations' ) ); ?>" data-event-type="<?php echo esc_attr( 'manual' === $block['block_type'] ? 'Manual blackout' : 'Reservation' ); ?>" data-event-url="<?php echo esc_url( $block['reservation_id'] ? admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $block['reservation_id'] ) ) : '' ); ?>">
					<strong><?php echo esc_html( $cell['date'] ); ?></strong>
					<span><?php echo esc_html( ! empty( $block['start'] ) && ! empty( $block['end'] ) ? substr( $block['start'], 11, 5 ) . '–' . substr( $block['end'], 11, 5 ) : __( 'All day', 'rockntiara-reservations' ) ); ?></span>
					<em><?php echo esc_html( $block['title'] ? $block['title'] : __( 'Blocked', 'rockntiara-reservations' ) ); ?></em>
				</button>
			<?php endforeach; endforeach; endforeach; if ( ! $has_events ) : ?><p><?php esc_html_e( 'No reservation or blackout events in this month.', 'rockntiara-reservations' ); ?></p><?php endif; ?>
		</div>
		<?php
		return ob_get_clean();
	}

	private function render_admin_agenda_all( $blocks ) {
		usort( $blocks, static function ( $a, $b ) { return strcmp( (string) ( $a['start_datetime'] ?? '' ), (string) ( $b['start_datetime'] ?? '' ) ); } );
		ob_start();
		?>
		<div class="rnta-admin-agenda">
			<h2><?php esc_html_e( 'Agenda', 'rockntiara-reservations' ); ?></h2>
			<?php if ( empty( $blocks ) ) : ?><p><?php esc_html_e( 'No reservation or blackout events have been registered yet.', 'rockntiara-reservations' ); ?></p><?php else : foreach ( $blocks as $block ) : $start = ! empty( $block['start_datetime'] ) ? $block['start_datetime'] : ''; $end = ! empty( $block['end_datetime'] ) ? $block['end_datetime'] : ''; $date = $start ? substr( $start, 0, 10 ) : ( $block['block_date'] ?? '' ); $time = $start && $end ? substr( $start, 11, 5 ) . ' - ' . substr( $end, 11, 5 ) : __( 'All day', 'rockntiara-reservations' ); ?>
				<button type="button" class="rnta-admin-agenda-item" data-rnta-admin-event data-event-title="<?php echo esc_attr( $block['title'] ?: __( 'Blocked', 'rockntiara-reservations' ) ); ?>" data-event-date="<?php echo esc_attr( $date ); ?>" data-event-time="<?php echo esc_attr( $time ); ?>" data-event-type="<?php echo esc_attr( 'manual' === $block['block_type'] ? 'Manual blackout' : 'Reservation' ); ?>" data-event-url="<?php echo esc_url( ! empty( $block['reservation_id'] ) ? admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $block['reservation_id'] ) ) : '' ); ?>">
					<strong><?php echo esc_html( $date ); ?></strong><span><?php echo esc_html( $time ); ?></span><em><?php echo esc_html( $block['title'] ?: __( 'Blocked', 'rockntiara-reservations' ) ); ?></em>
				</button>
			<?php endforeach; endif; ?>
		</div>
		<?php
		return ob_get_clean();
	}

	private function render_admin_schedule( $selected_date, $view ) {
		$selected_date = preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) $selected_date ) ? $selected_date : current_time( 'Y-m-d' );
		$timestamp     = strtotime( $selected_date . ' 12:00:00' );
		$days          = array();
		if ( 'week' === $view ) {
			$weekday = (int) gmdate( 'N', $timestamp );
			for ( $i = 1; $i <= 7; $i++ ) { $days[] = gmdate( 'Y-m-d', strtotime( ( $i - $weekday ) . ' day', $timestamp ) ); }
		} else { $days[] = $selected_date; }
		$blocks  = RNTA_Reservations_Block_Repository::instance()->get_blocks_between( reset( $days ) . ' 00:00:00', end( $days ) . ' 23:59:59' );
		$by_date = array_fill_keys( $days, array() );
		foreach ( $blocks as $block ) { $date = ! empty( $block['start_datetime'] ) ? substr( $block['start_datetime'], 0, 10 ) : ''; if ( isset( $by_date[ $date ] ) ) { $by_date[ $date ][] = $block; } }
		ob_start();
		?>
		<div class="rnta-admin-schedule rnta-admin-schedule--<?php echo esc_attr( $view ); ?>" data-rnta-admin-schedule="<?php echo esc_attr( $view ); ?>">
			<div class="rnta-admin-schedule__heading"><?php echo esc_html( 'week' === $view ? 'Week of ' . reset( $days ) : $selected_date ); ?></div>
			<div class="rnta-admin-schedule__head"><div class="rnta-admin-schedule__time-label"></div><?php foreach ( $days as $day ) : ?><div class="rnta-admin-schedule__day-label"><strong><?php echo esc_html( gmdate( 'D', strtotime( $day ) ) ); ?></strong><span><?php echo esc_html( gmdate( 'M j', strtotime( $day ) ) ); ?></span></div><?php endforeach; ?></div>
			<div class="rnta-admin-schedule__body"><div class="rnta-admin-schedule__times"><?php for ( $hour = 8; $hour <= 20; $hour++ ) : ?><span><?php echo esc_html( gmdate( 'g A', strtotime( sprintf( '2000-01-01 %02d:00:00', $hour ) ) ) ); ?></span><?php endfor; ?></div><?php foreach ( $days as $day ) : ?><div class="rnta-admin-schedule__column"><?php for ( $hour = 8; $hour <= 20; $hour++ ) : ?><i></i><?php endfor; ?><?php foreach ( $by_date[ $day ] as $block ) : $start = ! empty( $block['start_datetime'] ) ? strtotime( $block['start_datetime'] ) : strtotime( $day . ' 08:00:00' ); $end = ! empty( $block['end_datetime'] ) ? strtotime( $block['end_datetime'] ) : $start + 3600; $top = max( 0, ( ( (int) gmdate( 'G', $start ) * 60 + (int) gmdate( 'i', $start ) ) - 480 ) * 1.05 ); $height = max( 34, ( ( $end - $start ) / 60 ) * 1.05 ); $time = gmdate( 'H:i', $start ) . ' - ' . gmdate( 'H:i', $end ); ?>
				<button type="button" class="rnta-admin-schedule__event rnta-admin-schedule__event--<?php echo esc_attr( 'manual' === $block['block_type'] ? 'manual' : 'reservation' ); ?>" style="top:<?php echo esc_attr( $top ); ?>px;height:<?php echo esc_attr( $height ); ?>px" data-rnta-admin-event data-event-title="<?php echo esc_attr( $block['title'] ?: 'Blocked' ); ?>" data-event-date="<?php echo esc_attr( $day ); ?>" data-event-time="<?php echo esc_attr( $time ); ?>" data-event-type="<?php echo esc_attr( 'manual' === $block['block_type'] ? 'Manual blackout' : 'Reservation' ); ?>" data-event-url="<?php echo esc_url( ! empty( $block['reservation_id'] ) ? admin_url( 'admin.php?page=rnta-reservations&reservation_id=' . absint( $block['reservation_id'] ) ) : '' ); ?>"><strong><?php echo esc_html( $time ); ?></strong><span><?php echo esc_html( $block['title'] ?: 'Blocked' ); ?></span></button>
			<?php endforeach; ?></div><?php endforeach; ?></div>
		</div>
		<?php
		return ob_get_clean();
	}

	private function format_public_date( $date ) {
		$timestamp = strtotime( $date );

		if ( ! $timestamp ) {
			return $date;
		}

		return date_i18n( 'F j, Y', $timestamp );
	}

	private function build_day_timeline( $date, $blocks, $reservation ) {
		$items = array();

		foreach ( $blocks as $block ) {
			$items[] = array(
				'type'       => ( ! empty( $block['source_status'] ) && 'temporary_hold' === $block['source_status'] ) ? 'hold' : 'blocked',
				'time_label' => substr( $block['start_datetime'], 11, 5 ) . ' - ' . substr( $block['end_datetime'], 11, 5 ),
				'title'      => ! empty( $block['title'] ) ? $block['title'] : __( 'Blocked window', 'rockntiara-reservations' ),
				'note'       => ! empty( $block['notes'] ) ? wp_strip_all_tags( $block['notes'] ) : __( 'Unavailable window', 'rockntiara-reservations' ),
			);
		}

		$request_date = ! empty( $reservation['requested_party_date'] ) ? $reservation['requested_party_date'] : '';
		$request_time = ! empty( $reservation['requested_start_time'] ) ? $reservation['requested_start_time'] : '';

		if ( $request_date === $date && $request_time ) {
			$items[] = array(
				'type'       => 'request',
				'time_label' => $request_time,
				'title'      => __( 'Requested party time', 'rockntiara-reservations' ),
				'note'       => __( 'This is the time originally selected in Book Now.', 'rockntiara-reservations' ),
			);
		}

		usort(
			$items,
			static function ( $a, $b ) {
				return strcmp( $a['time_label'], $b['time_label'] );
			}
		);

		return $items;
	}

	public function print_public_assets() {
		static $printed = false;

		if ( $printed ) {
			return;
		}

		$printed = true;
		?>
		<style>
			.rnta-availability{
				width:min(calc(100% - 32px),1200px);
				margin:0 auto;
				display:grid;
				gap:24px;
				padding:40px 0;
			}
			.rnta-availability__header{display:grid;gap:12px;text-align:center;}
			.rnta-availability__eyebrow{
				display:inline-flex;justify-self:center;align-items:center;min-height:40px;padding:0 18px;border-radius:999px;
				border:1px solid rgba(237,79,143,.22);background:rgba(255,255,255,.78);color:#ed4f8f;
				font:700 12px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;
			}
			.rnta-availability__title{
				margin:0;color:#ed4f8f;font:400 clamp(44px,5vw,76px)/.92 "Great Vibes",cursive;
			}
			.rnta-availability__copy,
			.rnta-availability__legend span{
				color:#856b76;font:500 15px/1.7 "Quicksand",sans-serif;
			}
			.rnta-availability__legend{
				display:flex;gap:18px;justify-content:center;flex-wrap:wrap;
			}
			.rnta-availability__toolbar{
				display:flex;
				flex-wrap:wrap;
				align-items:center;
				justify-content:center;
				gap:12px;
			}
			.rnta-availability__toolbar-label{
				color:#856b76;
				font:700 13px/1.2 "Quicksand",sans-serif;
				letter-spacing:.04em;
				text-transform:uppercase;
			}
			.rnta-availability__month-selector{
				min-width:220px;
				min-height:48px;
				padding:0 16px;
				border:1.5px solid rgba(237,79,143,.18);
				border-radius:16px;
				background:linear-gradient(180deg, rgba(255,255,255,.98), rgba(255,248,251,.98));
				color:#452c35;
				font:600 15px/1 "Quicksand",sans-serif;
				box-shadow:0 10px 24px rgba(69,44,53,.04);
			}
			.rnta-availability__dot{
				display:inline-block;width:11px;height:11px;border-radius:999px;margin-right:8px;vertical-align:middle;
			}
			.rnta-availability__dot--available{background:#5fcf87;}
			.rnta-availability__dot--leadtime{background:#f7c3d8;}
			.rnta-availability__dot--limited{background:#f8b34b;}
			.rnta-availability__dot--blocked{background:#ed4f8f;}
			.rnta-availability__dot--weekday-blocked{background:#d9c9cf;}
			.rnta-availability__dot--past{background:#d9c9cf;}
			.rnta-availability__months{
				display:grid;
				grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
				gap:24px;
			}
			.rnta-availability__month-frame{
				display:block;
			}
			.rnta-availability--single .rnta-availability__months{
				grid-template-columns:1fr;
			}
			.rnta-availability--single .rnta-availability__month-frame{
				display:none;
			}
			.rnta-availability--single .rnta-availability__month-frame.is-active{
				display:block;
			}
			.rnta-availability__month{
				background:linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,248,251,.95));
				border:1px solid rgba(237,79,143,.16);
				border-radius:28px;
				padding:22px;
				box-shadow:0 18px 40px rgba(69,44,53,.06);
				display:grid;
				gap:14px;
			}
			.rnta-availability__month-header{
				color:#452c35;font:700 24px/1.08 "Quicksand",sans-serif;letter-spacing:-.03em;text-align:center;
			}
			.rnta-availability__admin-month{
				background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(255,248,251,.96));
				border:1px solid rgba(237,79,143,.16);border-radius:24px;padding:18px;
				box-shadow:0 18px 40px rgba(69,44,53,.06);overflow:hidden;
			}
			.rnta-availability__admin-weekdays,
			.rnta-availability__admin-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));}
			.rnta-availability__admin-weekdays{gap:6px;margin:14px 0 6px;}
			.rnta-availability__admin-weekdays span{padding:10px 6px;text-align:center;border-radius:10px;background:#fff5f9;color:#a4838f;font:700 11px/1 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;}
			.rnta-availability__admin-calendar-grid{border-top:1px solid rgba(237,79,143,.12);border-left:1px solid rgba(237,79,143,.12);}
			.rnta-availability__admin-week-row{display:contents;}
			.rnta-availability__admin-day{min-height:112px;padding:8px;border-right:1px solid rgba(237,79,143,.12);border-bottom:1px solid rgba(237,79,143,.12);background:#fff;}
			.rnta-availability__admin-day--past,.rnta-availability__admin-day--leadtime{background:#faf6f8;color:#b9a5ad;}
			.rnta-availability__admin-day--weekday-blocked{background:#fcf8fa;color:#b9a5ad;}
			.rnta-availability__admin-day--blocked{background:#fff3f7;}
			.rnta-availability__admin-day-number{color:#452c35;font:700 13px/1 "Quicksand",sans-serif;margin-bottom:8px;}
			.rnta-availability__admin-day--past .rnta-availability__admin-day-number,.rnta-availability__admin-day--leadtime .rnta-availability__admin-day-number,.rnta-availability__admin-day--weekday-blocked .rnta-availability__admin-day-number{color:#b9a5ad;}
			.rnta-availability__admin-event{display:grid;gap:2px;margin-top:5px;padding:7px 8px;border-radius:8px;color:#452c35;font:500 11px/1.25 "Quicksand",sans-serif;overflow:hidden;}
			.rnta-availability__admin-event strong{font-weight:800;white-space:nowrap;}
			.rnta-availability__admin-event span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
			.rnta-availability__admin-event--reservation{background:#e9f8ee;border-left:3px solid #52bd78;}
			.rnta-availability__admin-event--manual{background:#fff4c9;border-left:3px solid #e2ad27;}
			.rnta-admin-calendar-panel{display:none;}
			.rnta-admin-calendar-panel.is-active{display:block;}
			.rnta-admin-calendar-nav{display:flex;gap:4px;}
			.rnta-admin-calendar-views{display:flex;gap:4px;margin-left:auto;}
			.rnta-admin-calendar-views .button.is-active{background:#ed4f8f;border-color:#ed4f8f;color:#fff;}
			.rnta-admin-agenda{display:none;margin-top:18px;background:#fff;border:1px solid rgba(237,79,143,.16);border-radius:20px;padding:18px;}
			.rnta-admin-agenda h2{margin:0 0 14px;color:#452c35;font:700 20px/1.2 "Quicksand",sans-serif;}
			.rnta-admin-agenda-item{display:grid;width:100%;grid-template-columns:130px 130px 1fr;gap:12px;padding:12px 0;border:0;border-bottom:1px solid rgba(237,79,143,.12);background:transparent;color:#856b76;font:500 14px/1.4 "Quicksand",sans-serif;text-align:left;cursor:pointer;}
			.rnta-admin-agenda-item:last-child{border-bottom:0;}
			.rnta-admin-agenda-item:hover{background:#fff7fa;}
			.rnta-admin-agenda-item strong{color:#452c35;}.rnta-admin-agenda-item span{color:#ed4f8f;font-weight:700;}.rnta-admin-agenda-item em{font-style:normal;}
			.rnta-admin-schedule{display:none;margin-top:18px;background:#fff;border:1px solid rgba(237,79,143,.16);border-radius:20px;padding:18px;overflow:auto;}
			.rnta-admin-schedule__heading{margin:0 0 14px;color:#452c35;font:700 20px/1.2 "Quicksand",sans-serif;}
			.rnta-admin-schedule__head,.rnta-admin-schedule__body{display:grid;grid-template-columns:72px repeat(7,minmax(110px,1fr));min-width:820px;}
			.rnta-admin-schedule--day .rnta-admin-schedule__head,.rnta-admin-schedule--day .rnta-admin-schedule__body{grid-template-columns:72px minmax(260px,1fr);min-width:340px;}
			.rnta-admin-schedule__day-label{display:grid;gap:3px;padding:10px;text-align:center;background:#fff5f9;border:1px solid rgba(237,79,143,.12);color:#856b76;font:600 12px/1.2 "Quicksand",sans-serif;}
			.rnta-admin-schedule__day-label strong{color:#452c35;font-size:14px;}.rnta-admin-schedule__day-label span{font-size:11px;}
			.rnta-admin-schedule__times{position:relative;display:grid;grid-template-rows:repeat(13,64px);color:#a4838f;font:600 11px/1 "Quicksand",sans-serif;text-align:right;padding-right:9px;}
			.rnta-admin-schedule__times span{transform:translateY(-7px);}.rnta-admin-schedule__column{position:relative;height:832px;border-left:1px solid rgba(237,79,143,.12);background:#fff;}
			.rnta-admin-schedule__column i{display:block;height:64px;border-bottom:1px solid rgba(237,79,143,.12);}.rnta-admin-schedule__event{position:absolute;left:5px;right:5px;z-index:2;display:grid;gap:2px;padding:6px 8px;border:0;border-radius:8px;text-align:left;overflow:hidden;color:#452c35;font:500 11px/1.2 "Quicksand",sans-serif;cursor:pointer;}.rnta-admin-schedule__event strong{font-weight:800;white-space:nowrap;}.rnta-admin-schedule__event span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.rnta-admin-schedule__event--reservation{background:#e9f8ee;border-left:3px solid #52bd78;}.rnta-admin-schedule__event--manual{background:#fff4c9;border-left:3px solid #e2ad27;}
			.rnta-availability__admin-event{width:100%;border:0;text-align:left;cursor:pointer;}
			.rnta-availability__admin-event:hover{filter:brightness(.97);box-shadow:0 4px 10px rgba(69,44,53,.10);}
			.rnta-admin-event-modal[hidden]{display:none;}
			.rnta-admin-event-modal{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;}
			.rnta-admin-event-modal__backdrop{position:absolute;inset:0;background:rgba(69,44,53,.34);backdrop-filter:blur(3px);}
			.rnta-admin-event-modal__card{position:relative;width:min(460px,calc(100% - 32px));padding:28px;border:1px solid rgba(237,79,143,.24);border-radius:24px;background:#fffafd;box-shadow:0 24px 70px rgba(69,44,53,.22);color:#856b76;font:500 15px/1.6 "Quicksand",sans-serif;}
			.rnta-admin-event-modal__card h2{margin:14px 0 18px;color:#452c35;font:700 26px/1.1 "Quicksand",sans-serif;}
			.rnta-admin-event-modal__card p{margin:8px 0;}.rnta-admin-event-modal__close{position:absolute;right:14px;top:12px;width:34px;height:34px;border:1px solid rgba(237,79,143,.24);border-radius:50%;background:#fff;color:#ed4f8f;font-size:22px;cursor:pointer;}
			.rnta-availability--admin.is-agenda-view .rnta-availability__admin-month{display:none;}
			.rnta-availability--admin.is-agenda-view .rnta-admin-agenda{display:block;}
			.rnta-availability--admin.is-week-view .rnta-availability__admin-month,.rnta-availability--admin.is-day-view .rnta-availability__admin-month,.rnta-availability--admin.is-week-view .rnta-admin-agenda,.rnta-availability--admin.is-day-view .rnta-admin-agenda{display:none;}
			.rnta-availability--admin.is-week-view .rnta-admin-schedule--week,.rnta-availability--admin.is-day-view .rnta-admin-schedule--day{display:block;}
			.rnta-availability--admin.is-week-view .rnta-availability__admin-week-row:not(.is-selected-week){display:none;}
			.rnta-availability--admin.is-day-view .rnta-availability__admin-day:not(.is-selected-day){display:none;}
			.rnta-availability--admin.is-day-view .rnta-availability__admin-day.is-selected-day{grid-column:1 / -1;min-height:180px;}
			.rnta-availability__weekdays,
			.rnta-availability__grid{
				display:grid;
				grid-template-columns:repeat(7,1fr);
				gap:8px;
			}
			.rnta-availability__weekdays span{
				display:flex;
				align-items:center;
				justify-content:center;
				min-height:34px;
				padding:0 4px;
				border-radius:12px;
				background:rgba(255,245,249,.9);
				border:1px solid rgba(237,79,143,.08);
				text-align:center;color:#a4838f;font:700 12px/1 "Quicksand",sans-serif;text-transform:uppercase;letter-spacing:.08em;
			}
			.rnta-availability__day{
				appearance:none;border:none;min-height:46px;border-radius:16px;
				font:700 14px/1 "Quicksand",sans-serif;display:flex;align-items:center;justify-content:center;
				background:#fff;color:#452c35;border:1px solid rgba(237,79,143,.10);cursor:pointer;
				transition:transform .18s ease, box-shadow .18s ease, background-color .18s ease, color .18s ease;
			}
			.rnta-availability__day--available:hover{
				transform:translateY(-2px);
				box-shadow:0 12px 24px rgba(95,207,135,.16);
				background:#f2fff7;
			}
			.rnta-availability__day--limited{
				background:#fff8ec;color:#b56a00;border-color:rgba(248,179,75,.32);
			}
			.rnta-availability__day--limited:hover{
				transform:translateY(-2px);
				box-shadow:0 12px 24px rgba(248,179,75,.16);
				background:#fff3dc;
			}
			.rnta-availability__day--blocked{
				background:#fff1f6;color:#ed4f8f;border-color:rgba(237,79,143,.22);cursor:not-allowed;
			}
			.rnta-availability__day--leadtime{
				background:#fff6fa;color:#c8a6b2;border-color:rgba(237,79,143,.14);cursor:not-allowed;
			}
			.rnta-availability__day--weekday-blocked{
				background:#fbf7f9;color:#b8a1aa;border-color:#f0dfe6;cursor:not-allowed;
			}
			.rnta-availability__day--past{
				background:#f7f4f5;color:#c0aeb5;border-color:#eee5e8;cursor:not-allowed;
			}
			.rnta-availability__day--focus{
				box-shadow:0 0 0 3px rgba(95, 207, 135, .18) inset;
				border-color:#5fcf87;
			}
			.rnta-availability__day--empty{
				min-height:46px;
				background:transparent;border:1px dashed rgba(237,79,143,.05);pointer-events:none;
				opacity:.28;
			}
			.rnta-availability--admin{padding-top:10px;}
			.rnta-admin-calendar-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:14px 16px;background:#fff;border:1px solid rgba(237,79,143,.16);border-radius:16px;}
			.rnta-admin-calendar-toolbar label{color:#856b76;font:700 12px/1 "Quicksand",sans-serif;text-transform:uppercase;letter-spacing:.05em;}
			.rnta-admin-calendar-toolbar select,.rnta-admin-calendar-toolbar input{min-height:38px;border:1px solid rgba(237,79,143,.22);border-radius:10px;background:#fff8fb;color:#452c35;padding:0 10px;font:600 13px/1 "Quicksand",sans-serif;}
			.rnta-availability--detail{width:100%;padding:0;}
			.rnta-availability__header--detail{text-align:left;}
			.rnta-availability__title--detail{font-size:52px;line-height:.95;}
			.rnta-availability__detail-grid{
				display:grid;
				grid-template-columns:minmax(320px, 1fr) minmax(320px, 1fr);
				gap:24px;
				align-items:start;
			}
			.rnta-availability__timeline{
				background:linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,248,251,.95));
				border:1px solid rgba(237,79,143,.16);
				border-radius:28px;
				padding:22px;
				box-shadow:0 18px 40px rgba(69,44,53,.06);
			}
			.rnta-availability__timeline h4{
				margin:0 0 16px;color:#452c35;font:700 24px/1.08 "Quicksand",sans-serif;letter-spacing:-.03em;
			}
			.rnta-availability__timeline-head{
				display:flex;
				align-items:center;
				justify-content:space-between;
				gap:12px;
				margin-bottom:16px;
			}
			.rnta-availability__timeline-list{
				display:grid;
				gap:12px;
			}
			.rnta-availability__timeline-item{
				display:grid;
				grid-template-columns:130px 1fr;
				gap:14px;
				padding:14px 16px;
				border-radius:18px;
				border:1px solid rgba(237,79,143,.12);
				background:#fff;
			}
			.rnta-availability__timeline-item--hold{
				background:#fff6fa;
				border-color:rgba(237,79,143,.20);
			}
			.rnta-availability__timeline-item--request{
				background:#f2fff7;
				border-color:rgba(95,207,135,.24);
			}
			.rnta-availability__timeline-time{
				color:#ed4f8f;font:700 13px/1.2 "Quicksand",sans-serif;letter-spacing:.08em;text-transform:uppercase;
			}
			.rnta-availability__timeline-body{
				color:#856b76;font:500 14px/1.6 "Quicksand",sans-serif;
			}
			.rnta-availability__timeline-body strong{
				display:block;color:#452c35;margin-bottom:4px;
			}
			.rnta-availability__timeline-empty{
				padding:18px;border-radius:18px;background:#fff;color:#856b76;font:500 14px/1.6 "Quicksand",sans-serif;border:1px solid rgba(237,79,143,.12);
			}
			@media (max-width:767px){
				.rnta-availability{width:min(calc(100% - 20px),1200px);gap:16px;padding:22px 0;}
				.rnta-availability__month{padding:14px;border-radius:22px;}
				.rnta-availability__title{font-size:44px;line-height:.95;}
				.rnta-availability__detail-grid{grid-template-columns:1fr;}
				.rnta-availability__timeline-item{grid-template-columns:1fr;}
				.rnta-availability__admin-month{padding:10px;border-radius:18px;overflow-x:auto;}
				.rnta-availability__admin-weekdays,.rnta-availability__admin-calendar-grid{min-width:700px;}
				.rnta-admin-calendar-toolbar{display:grid!important;grid-template-columns:1fr 1fr;align-items:center;}
				.rnta-admin-calendar-views{grid-column:1/-1;margin-left:0;flex-wrap:wrap;}
				.rnta-admin-agenda-item{grid-template-columns:1fr;gap:4px;}
			}
		</style>
		<script>
			document.addEventListener('click', function(event){
				const button = event.target.closest('[data-rnta-available-date]');
				if(!button){ return; }
				const date = button.getAttribute('data-rnta-available-date');
				const bookNowDate = document.getElementById('rnta_preferred_party_date');
				if(bookNowDate){
					bookNowDate.value = date;
					bookNowDate.dispatchEvent(new Event('change', { bubbles:true }));
					bookNowDate.scrollIntoView({ behavior:'smooth', block:'center' });
				}
			});
			document.addEventListener('change', function(event){
				const selector = event.target.closest('[data-rnta-month-selector]');
				if(!selector){ return; }
				const root = selector.closest('.rnta-availability');
				if(!root){ return; }
				root.querySelectorAll('[data-rnta-month-frame]').forEach(function(frame){
					frame.classList.toggle('is-active', frame.getAttribute('data-rnta-month-frame') === selector.value);
				});
			});
		</script>
		<?php
	}
}
