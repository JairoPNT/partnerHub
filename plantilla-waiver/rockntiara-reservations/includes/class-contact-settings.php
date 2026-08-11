<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Central contact settings and WhatsApp/phone link helpers.
 */
final class RNTA_Reservations_Contact_Settings {
	const OPTION_KEY = 'rnta_contact_settings';

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		// Register after the RT - Reservations parent menu exists.
		add_action( 'admin_menu', array( $this, 'register_menu' ), 20 );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'wp_footer', array( $this, 'print_frontend_bridge' ), 120 );
		add_action( 'wp_ajax_rnta_contact_submit', array( $this, 'handle_contact_submit' ) );
		add_action( 'wp_ajax_nopriv_rnta_contact_submit', array( $this, 'handle_contact_submit' ) );
		add_shortcode( 'rnta_whatsapp_link', array( $this, 'render_whatsapp_shortcode' ) );
	}

	public static function get_settings() {
		$settings = get_option( self::OPTION_KEY, array() );
		return wp_parse_args(
			is_array( $settings ) ? $settings : array(),
			array(
				'whatsapp_number' => '',
				'phone_number'    => '+19544640316',
				'contact_email'   => 'info@rockntiara.com',
				'maps_url'        => '',
				'venue_address'   => defined( 'RNTA_RESERVATIONS_VENUE_ADDRESS' ) ? RNTA_RESERVATIONS_VENUE_ADDRESS : '',
			)
		);
	}

	public static function normalize_number( $value ) {
		return preg_replace( '/[^0-9]/', '', (string) $value );
	}

	public static function whatsapp_url( $service_name = '' ) {
		$settings = self::get_settings();
		$number   = self::normalize_number( $settings['whatsapp_number'] );
		if ( '' === $number ) {
			return '';
		}

		$service_name = trim( wp_strip_all_tags( (string) $service_name ) );
		$message      = $service_name
			? sprintf( 'Hi Rock N Tiara, I\'m interested in booking %s. Could you please share availability and next steps?', $service_name )
			: 'Hi Rock N Tiara, I\'d like to get in touch. Could you please help me with my question?';

		return 'https://wa.me/' . $number . '?text=' . rawurlencode( $message );
	}

	public static function phone_url() {
		$settings = self::get_settings();
		$number   = self::normalize_number( $settings['phone_number'] );
		return '' !== $number ? 'tel:+' . $number : '';
	}

	public function register_menu() {
		add_submenu_page(
			'rnta-reservations',
			__( 'Contact Settings', 'rockntiara-reservations' ),
			__( 'Contact Settings', 'rockntiara-reservations' ),
			'manage_woocommerce',
			'rnta-contact-settings',
			array( $this, 'render_settings_page' )
		);
	}

	public function register_settings() {
		register_setting(
			'rnta_contact_settings_group',
			self::OPTION_KEY,
			array( $this, 'sanitize_settings' )
		);
	}

	public function sanitize_settings( $input ) {
		$input = is_array( $input ) ? $input : array();
		return array(
			'whatsapp_number' => sanitize_text_field( $input['whatsapp_number'] ?? '' ),
			'phone_number'    => sanitize_text_field( $input['phone_number'] ?? '' ),
			'contact_email'   => sanitize_email( $input['contact_email'] ?? '' ),
			'maps_url'        => esc_url_raw( $input['maps_url'] ?? '' ),
			'venue_address'   => sanitize_text_field( $input['venue_address'] ?? '' ),
		);
	}

	public function render_settings_page() {
		$settings = self::get_settings();
		?>
		<div class="wrap rnta-contact-settings">
			<h1><?php esc_html_e( 'RT Contact Settings', 'rockntiara-reservations' ); ?></h1>
			<p><?php esc_html_e( 'Manage the contact details used by Contact, Spa Services, the footer, support CTAs, and reservation messaging.', 'rockntiara-reservations' ); ?></p>
			<form method="post" action="options.php">
				<?php settings_fields( 'rnta_contact_settings_group' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="rnta-whatsapp-number"><?php esc_html_e( 'WhatsApp number', 'rockntiara-reservations' ); ?></label></th>
						<td>
							<input type="text" class="regular-text" id="rnta-whatsapp-number" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[whatsapp_number]" value="<?php echo esc_attr( $settings['whatsapp_number'] ); ?>" placeholder="+1 954 000 0000">
							<p class="description"><?php esc_html_e( 'Use the full international number. This is separate from the phone number.', 'rockntiara-reservations' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="rnta-phone-number"><?php esc_html_e( 'Phone number', 'rockntiara-reservations' ); ?></label></th>
						<td><input type="text" class="regular-text" id="rnta-phone-number" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[phone_number]" value="<?php echo esc_attr( $settings['phone_number'] ); ?>" placeholder="+1 954 464 0316"></td>
					</tr>
					<tr>
						<th scope="row"><label for="rnta-contact-email"><?php esc_html_e( 'Contact email', 'rockntiara-reservations' ); ?></label></th>
						<td><input type="email" class="regular-text" id="rnta-contact-email" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[contact_email]" value="<?php echo esc_attr( $settings['contact_email'] ); ?>"></td>
					</tr>
					<tr>
						<th scope="row"><label for="rnta-maps-url"><?php esc_html_e( 'Google Maps URL', 'rockntiara-reservations' ); ?></label></th>
						<td><input type="url" class="regular-text" id="rnta-maps-url" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[maps_url]" value="<?php echo esc_attr( $settings['maps_url'] ); ?>"></td>
					</tr>
					<tr>
						<th scope="row"><label for="rnta-venue-address"><?php esc_html_e( 'Venue address', 'rockntiara-reservations' ); ?></label></th>
						<td>
							<input type="text" class="regular-text" id="rnta-venue-address" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[venue_address]" value="<?php echo esc_attr( $settings['venue_address'] ); ?>">
							<p class="description"><?php esc_html_e( 'Used by frontend contact blocks. Reservation and waiver legal records keep the canonical venue constant.', 'rockntiara-reservations' ); ?></p>
						</td>
					</tr>
				</table>
				<?php submit_button( __( 'Save Contact Settings', 'rockntiara-reservations' ) ); ?>
			</form>
		</div>
		<?php
	}

	public function render_whatsapp_shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'service' => '',
				'label'   => 'WhatsApp to Book',
				'class'   => '',
			),
			$atts,
			'rnta_whatsapp_link'
		);
		$url = self::whatsapp_url( $atts['service'] );
		if ( '' === $url ) {
			return '';
		}

		return sprintf(
			'<a class="%1$s" href="%2$s" target="_blank" rel="noopener">%3$s</a>',
			esc_attr( $atts['class'] ),
			esc_url( $url ),
			esc_html( $atts['label'] )
		);
	}

	public function print_frontend_bridge() {
		$settings = self::get_settings();
		$data     = array(
			'whatsapp' => self::normalize_number( $settings['whatsapp_number'] ),
			'phone'    => self::normalize_number( $settings['phone_number'] ),
			'phone_display' => (string) $settings['phone_number'],
			'email'    => (string) $settings['contact_email'],
			'address'  => (string) $settings['venue_address'],
			'maps_url' => (string) $settings['maps_url'],
			'ajax_url' => admin_url( 'admin-ajax.php' ),
			'nonce'   => wp_create_nonce( 'rnta_contact_submit' ),
		);
		?>
		<script id="rnta-contact-settings-bridge">
		(function(){
			var cfg=<?php echo wp_json_encode( $data ); ?>;
			var encode=window.encodeURIComponent;
			var message=function(service){return service?'Hi Rock N Tiara, I\'m interested in booking '+service+'. Could you please share availability and next steps?':'Hi Rock N Tiara, I\'d like to get in touch. Could you please help me with my question?';};
				var apply=function(){
				document.querySelectorAll('a[href*="wa.me/"],a[href*="api.whatsapp.com"]').forEach(function(a){
					if(!cfg.whatsapp){a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.classList.add('rnta-contact-missing');return;}
					var service=a.getAttribute('data-rnta-whatsapp-service')||'';
					a.href='https://wa.me/'+cfg.whatsapp+'?text='+encode(message(service));
					a.target='_blank';a.rel='noopener';
				});
				document.querySelectorAll('a[href^="tel:"]').forEach(function(a){if(cfg.phone){a.href='tel:+'+cfg.phone;}});
				document.querySelectorAll('a[data-rnta-contact-link="email"]').forEach(function(a){if(cfg.email){a.href='mailto:'+cfg.email;}});
				document.querySelectorAll('a[data-rnta-contact-link="maps"]').forEach(function(a){if(cfg.maps_url){a.href=cfg.maps_url;}});
				document.querySelectorAll('[data-rnta-contact-value="phone"]').forEach(function(el){if(cfg.phone_display){el.textContent=cfg.phone_display;}});
				document.querySelectorAll('[data-rnta-contact-value="email"]').forEach(function(el){if(cfg.email){el.textContent=cfg.email;}});
				document.querySelectorAll('[data-rnta-contact-value="address"]').forEach(function(el){if(cfg.address){el.textContent=cfg.address;}});
				document.querySelectorAll('form.rta-contact-form').forEach(function(form){
					form.addEventListener('submit',function(e){
						e.preventDefault();
						var button=form.querySelector('[type="submit"]'), message=form.querySelector('.rta-contact-form__message');
						if(button){button.disabled=true;button.classList.add('is-sending');}
						var data=new FormData(form); data.append('action','rnta_contact_submit'); data.append('nonce',cfg.nonce);
						fetch(cfg.ajax_url,{method:'POST',body:data,credentials:'same-origin'}).then(function(r){return r.json();}).then(function(result){
							if(message){message.textContent=result.success?result.data.message:(result.data&&result.data.message?result.data.message:'Please try again.');message.classList.toggle('is-success',!!result.success);message.classList.add('is-visible');}
							if(result.success){form.reset();}
						}).catch(function(){if(message){message.textContent='We could not send your message. Please contact us directly.';message.classList.add('is-visible');}}).finally(function(){if(button){button.disabled=false;button.classList.remove('is-sending');}});
					});
				});
			};
			if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',apply);}else{apply();}
		})();
		</script>
		<?php
	}

	public function handle_contact_submit() {
		if ( ! check_ajax_referer( 'rnta_contact_submit', 'nonce', false ) ) {
			wp_send_json_error( array( 'message' => 'Your session expired. Please refresh and try again.' ), 403 );
		}
		if ( ! empty( $_POST['website'] ) ) {
			wp_send_json_error( array( 'message' => 'Spam protection triggered.' ), 400 );
		}
		$name    = sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) );
		$email   = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
		$phone   = sanitize_text_field( wp_unslash( $_POST['phone'] ?? '' ) );
		$message = sanitize_textarea_field( wp_unslash( $_POST['message'] ?? '' ) );
		if ( '' === $name || ! is_email( $email ) || '' === $message ) {
			wp_send_json_error( array( 'message' => 'Please complete your name, email, and message.' ), 422 );
		}
		$settings = self::get_settings();
		$to       = is_email( $settings['contact_email'] ) ? $settings['contact_email'] : 'info@rockntiara.com';
		$subject  = 'New Contact Request - Rock N Tiara';
		$body     = '<h2>New Rock N Tiara contact request</h2><p><strong>Name:</strong> ' . esc_html( $name ) . '</p><p><strong>Email:</strong> ' . esc_html( $email ) . '</p><p><strong>Phone:</strong> ' . esc_html( $phone ) . '</p><p><strong>Message:</strong><br>' . nl2br( esc_html( $message ) ) . '</p>';
		$headers  = array( 'Content-Type: text/html; charset=UTF-8', 'Reply-To: ' . $email );
		if ( wp_mail( $to, $subject, $body, $headers ) ) {
			wp_send_json_success( array( 'message' => 'Thank you. Your message has been sent.' ) );
		}
		wp_send_json_error( array( 'message' => 'We could not send your message. Please contact us directly.' ), 500 );
	}
}
