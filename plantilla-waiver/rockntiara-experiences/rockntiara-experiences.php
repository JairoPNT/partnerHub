<?php
/**
 * Plugin Name: RT - Experiences
 * Description: Unified experience manager for Parties, Spa Services, and Addons with reusable shortcode rendering, detail modals, and reservation handoff.
 * Version: 0.8.2
 * Author: Codex for Rock N Tiara
 * License: GPL-2.0-or-later
 * Text Domain: rockntiara-experiences
 */

if (!defined('ABSPATH')) {
	exit;
}

final class RockNTiara_Experiences_Single_File {
	const POST_TYPE      = 'rnta_experience';
	const TAXONOMY       = 'rnta_experience_type';
	const NONCE          = 'rnta_experience_meta_nonce';
	const SETTINGS_KEY   = 'rnta_experiences_settings';
	const SETTINGS_GROUP = 'rnta_experiences_settings_group';
	const MINIMUM_LEAD_DAYS = 12;
	const PARTY_DURATION_MINUTES = 120;
	const PARTY_SETUP_BUFFER_MINUTES = 0;
	const PARTY_CLEANUP_BUFFER_MINUTES = 30;

	private static $instance = null;
	private static $assets_printed = false;

	public static function instance() {
		if (null === self::$instance) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		add_action('init', array($this, 'register_taxonomy'));
		add_action('init', array($this, 'register_post_type'));
		add_action('init', array($this, 'ensure_default_terms'), 30);
		add_action('add_meta_boxes', array($this, 'register_meta_boxes'));
		add_action('save_post_' . self::POST_TYPE, array($this, 'save_meta_boxes'));

		add_action('admin_menu', array($this, 'register_settings_page'));
		add_action('admin_init', array($this, 'register_settings'));
		add_action('admin_post_rnta_experiences_bulk_import', array($this, 'handle_bulk_import_upload'));

		add_shortcode('rnta_experiences', array($this, 'render_shortcode'));
		add_shortcode('rnta_parties_grid', array($this, 'render_parties_grid_shortcode'));
		add_shortcode('rnta_spa_grid', array($this, 'render_spa_grid_shortcode'));
		add_shortcode('rnta_addons_grid', array($this, 'render_addons_grid_shortcode'));
		add_shortcode('rnta_book_now_builder', array($this, 'render_book_now_builder_shortcode'));

		add_filter('manage_' . self::POST_TYPE . '_posts_columns', array($this, 'admin_columns'));
		add_action('manage_' . self::POST_TYPE . '_posts_custom_column', array($this, 'admin_column_content'), 10, 2);
		add_action('restrict_manage_posts', array($this, 'render_admin_filters'));
		add_action('pre_get_posts', array($this, 'apply_admin_filters'));

		add_action('template_redirect', array($this, 'handle_book_now_submission'));
		add_filter('woocommerce_get_item_data', array($this, 'woocommerce_get_item_data'), 10, 2);
		add_action('woocommerce_checkout_create_order_line_item', array($this, 'woocommerce_checkout_create_order_line_item'), 10, 4);
		add_action('woocommerce_checkout_create_order', array($this, 'woocommerce_checkout_create_order'), 10, 2);
		add_action('woocommerce_admin_order_data_after_billing_address', array($this, 'woocommerce_admin_order_data_after_billing_address'));
	}

	public static function activate() {
		$plugin = self::instance();
		$plugin->register_taxonomy();
		$plugin->register_post_type();
		$plugin->ensure_default_terms();
		flush_rewrite_rules();
	}

	public static function deactivate() {
		flush_rewrite_rules();
	}

	public function register_post_type() {
		add_theme_support('post-thumbnails', array(self::POST_TYPE));

		register_post_type(
			self::POST_TYPE,
			array(
				'labels' => array(
					'name'          => __('Experiences', 'rockntiara-experiences'),
					'singular_name' => __('Experience', 'rockntiara-experiences'),
					'add_new_item'  => __('Add New Experience', 'rockntiara-experiences'),
					'edit_item'     => __('Edit Experience', 'rockntiara-experiences'),
					'menu_name'     => __('RT - Experiences', 'rockntiara-experiences'),
				),
				'public'              => false,
				'show_ui'             => true,
				'show_in_menu'        => true,
				'show_in_rest'        => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'has_archive'         => false,
				'menu_position'       => 63,
				'menu_icon'           => 'dashicons-star-filled',
				'supports'            => array('title', 'thumbnail', 'page-attributes'),
				'rewrite'             => false,
			)
		);
	}

	public function register_taxonomy() {
		register_taxonomy(
			self::TAXONOMY,
			array(self::POST_TYPE),
			array(
				'labels' => array(
					'name'          => __('Experience Types', 'rockntiara-experiences'),
					'singular_name' => __('Experience Type', 'rockntiara-experiences'),
					'menu_name'     => __('Experience Types', 'rockntiara-experiences'),
				),
				'public'            => false,
				'show_ui'           => true,
				'show_admin_column' => true,
				'hierarchical'      => false,
				'show_in_rest'      => false,
				'rewrite'           => false,
			)
		);
	}

	public function ensure_default_terms() {
		$defaults = array(
			'party' => 'Parties',
			'spa'   => 'Spa Services',
			'addon' => 'Addons',
		);

		foreach ($defaults as $slug => $name) {
			if (!term_exists($slug, self::TAXONOMY)) {
				wp_insert_term($name, self::TAXONOMY, array('slug' => $slug));
			}
		}
	}

	public function register_meta_boxes() {
		add_meta_box(
			'rnta_experience_details',
			__('Experience Details', 'rockntiara-experiences'),
			array($this, 'render_meta_box'),
			self::POST_TYPE,
			'normal',
			'high'
		);
	}

	public function render_meta_box($post) {
		wp_nonce_field('rnta_save_experience_meta', self::NONCE);
		$meta = $this->get_meta($post->ID);
		?>
		<style>
			#rnta_experience_details .inside {
				margin: 0;
				padding: 0;
				background: linear-gradient(180deg, #fff7fb 0%, #fff 100%);
			}
			.rnta-meta-grid {
				display:grid;
				gap:18px;
				padding:18px;
				color:#452c35;
				font-family:"Quicksand", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			}
			.rnta-meta-section {
				grid-column:1 / -1;
				border:1px solid rgba(237,79,143,.20);
				border-radius:22px;
				background:rgba(255,255,255,.86);
				box-shadow:0 18px 38px rgba(237,79,143,.08);
				overflow:hidden;
			}
			.rnta-meta-section .full { grid-column:1 / -1; }
			.rnta-meta-section-toggle {
				display:flex;
				align-items:center;
				justify-content:space-between;
				width:100%;
				padding:18px 22px 16px;
				border:0;
				border-bottom:1px solid rgba(237,79,143,.18);
				background:linear-gradient(180deg, rgba(255,245,249,.98), rgba(255,255,255,.92));
				color:#ed4f8f;
				font:900 14px/1 "Quicksand", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
				text-transform:uppercase;
				letter-spacing:.08em;
				cursor:pointer;
				text-align:left;
			}
			.rnta-meta-section-title {
				display:flex;
				flex-direction:column;
				gap:4px;
			}
			.rnta-meta-section-title strong {
				font-size:14px;
				line-height:1.15;
				font-weight:900;
				text-transform:uppercase;
				letter-spacing:.08em;
			}
			.rnta-meta-section-title small {
				font-size:12px;
				line-height:1.35;
				font-weight:700;
				letter-spacing:0;
				text-transform:none;
				color:#866371;
			}
			.rnta-meta-section-toggle:hover { background:linear-gradient(180deg, rgba(255,236,245,.98), rgba(255,255,255,.94)); }
			.rnta-meta-chevron {
				display:inline-flex;
				align-items:center;
				justify-content:center;
				width:24px;
				height:24px;
				border-radius:999px;
				background:#ffe1ee;
				color:#ed4f8f;
				font-size:16px;
				line-height:1;
				box-shadow:0 8px 16px rgba(237,79,143,.10);
				transition:transform .16s ease;
			}
			.rnta-meta-section.is-collapsed .rnta-meta-chevron { transform:rotate(-90deg); }
			.rnta-meta-section-body {
				display:grid;
				grid-template-columns:repeat(2,minmax(0,1fr));
				gap:16px 20px;
				padding:20px 22px 22px;
			}
			.rnta-meta-section.is-collapsed .rnta-meta-section-body { display:none; }
			.rnta-meta-grid label {
				display:flex;
				align-items:center;
				gap:7px;
				width:max-content;
				max-width:100%;
				font-weight:800;
				margin-bottom:7px;
				color:#452c35;
				letter-spacing:.01em;
			}
			.rnta-meta-grid input[type="text"],
			.rnta-meta-grid input[type="number"],
			.rnta-meta-grid input[type="url"],
			.rnta-meta-grid textarea,
			.rnta-meta-grid select {
				width:100%;
				min-height:42px;
				border:1px solid rgba(237,79,143,.28);
				border-radius:14px;
				background:#fff;
				color:#452c35;
				box-shadow:0 8px 18px rgba(237,79,143,.05);
			}
			.rnta-meta-grid textarea {
				min-height:104px;
				padding:10px 12px;
				line-height:1.45;
			}
			.rnta-meta-grid input[type="text"],
			.rnta-meta-grid input[type="number"],
			.rnta-meta-grid input[type="url"],
			.rnta-meta-grid select {
				padding:0 12px;
			}
			.rnta-meta-grid input:focus,
			.rnta-meta-grid textarea:focus,
			.rnta-meta-grid select:focus {
				border-color:#ed4f8f;
				box-shadow:0 0 0 3px rgba(237,79,143,.12);
				outline:none;
			}
			.rnta-meta-help { margin:7px 0 0; color:#866371; font-size:12px; line-height:1.35; }
			.rnta-meta-check {
				display:flex;
				align-items:center;
				gap:8px;
				padding:14px 16px;
				border:1px solid rgba(237,79,143,.16);
				border-radius:16px;
				background:#fff8fb;
			}
			.rnta-meta-check label { margin:0; width:auto; }
			/* Visible fallback: headings remain readable if the admin script is delayed. */
			.rnta-meta-heading {
				grid-column:1 / -1;
				margin:12px 0 -4px;
				padding:14px 16px;
				border:1px solid rgba(237,79,143,.22);
				border-radius:16px;
				background:linear-gradient(180deg, #fff0f7, #fff9fc);
				color:#ed4f8f;
				font:900 14px/1.2 "Quicksand", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
				text-transform:uppercase;
				letter-spacing:.08em;
			}
			.rnta-meta-section-copy {
				grid-column:1 / -1;
				margin:-2px 0 6px;
				color:#866371;
				font-size:13px;
				line-height:1.45;
			}
			.rnta-meta-checklist {
				display:grid;
				grid-template-columns:repeat(2,minmax(0,1fr));
				gap:12px;
				padding:4px 0 0;
			}
			.rnta-meta-checkitem {
				display:flex;
				align-items:flex-start;
				gap:10px;
				padding:12px 14px;
				border:1px solid rgba(237,79,143,.16);
				border-radius:16px;
				background:#fff9fc;
				box-shadow:0 8px 18px rgba(237,79,143,.04);
			}
			.rnta-meta-checkitem input[type="checkbox"] {
				margin:2px 0 0;
				accent-color:#ed4f8f;
				flex:0 0 auto;
			}
			.rnta-meta-checkitem span {
				display:block;
				color:#452c35;
				font-weight:700;
				line-height:1.35;
			}
			.rnta-meta-checkitem label {
				display:block;
				width:100%;
				margin:0;
				cursor:pointer;
			}
			.rnta-meta-info {
				position:relative;
				display:inline-flex;
				align-items:center;
				justify-content:center;
				flex:0 0 auto;
				width:19px;
				height:19px;
				border-radius:999px;
				background:#ffe1ee;
				color:#ed4f8f;
				font:900 12px/1 "Quicksand", sans-serif;
				cursor:help;
				box-shadow:0 8px 14px rgba(237,79,143,.10);
			}
			.rnta-meta-info::after {
				content:attr(data-help);
				position:absolute;
				left:50%;
				bottom:calc(100% + 9px);
				z-index:20;
				width:260px;
				max-width:min(260px, 70vw);
				padding:11px 13px;
				border:1px solid rgba(237,79,143,.20);
				border-radius:14px;
				background:#452c35;
				color:#fff;
				font:600 12px/1.4 "Quicksand", sans-serif;
				text-transform:none;
				letter-spacing:0;
				box-shadow:0 16px 34px rgba(69,44,53,.22);
				opacity:0;
				pointer-events:none;
				transform:translate(-50%, 4px);
				transition:opacity .16s ease, transform .16s ease;
			}
			.rnta-meta-info:hover::after,
			.rnta-meta-info:focus::after {
				opacity:1;
				transform:translate(-50%, 0);
			}
			.rnta-meta-grid > .rnta-meta-help {
				grid-column:1 / -1;
				padding:10px 14px;
				border-radius:14px;
				background:#fff;
				border:1px solid rgba(237,79,143,.14);
			}
			@media (max-width: 900px) {
				.rnta-meta-section-body { grid-template-columns:1fr; padding:18px; }
				.rnta-meta-checklist { grid-template-columns:1fr; }
				.rnta-meta-section-toggle { padding:16px 18px 14px; }
			}
		
.rnta-book-now-builder__slot-btn.is-taken {
	opacity: 0.85;
	cursor: not-allowed;
	background-color: #f8d7da !important;
	color: #721c24 !important;
	border-color: #f5c6cb !important;
	font-weight: 600;
}
.rnta-availability__day.is-selected {
	background-color: #e91e63 !important;
	color: #ffffff !important;
	border-color: #e91e63 !important;
	font-weight: bold;
}

</style>
		<script>
			(function () {
				const grid = document.currentScript.nextElementSibling;
				if (!grid || !grid.classList.contains('rnta-meta-grid')) return;

				const sectionCopy = {
					'General Settings': 'Public-facing content for cards, popups, labels, and basic presentation.',
					'Party Pricing & Capacity': 'Rules used by Book Now to calculate package value, guest limits, and automatic time requirements.',
					'Internal Party Service Choices': 'Use this only for packages where the host must choose from the internal mini menu: Mani, Pedi, Facial, Make-up, Hair.',
					'Addon Rules': 'Only applies when this Experience is an Addon. Use these fields to control pricing behavior and compatibility.'
				};

				Array.from(grid.querySelectorAll('.rnta-meta-heading')).forEach((heading, index) => {
					const title = heading.textContent.trim();
					const copy = sectionCopy[title] || '';
					const section = document.createElement('section');
					section.className = 'rnta-meta-section';
					grid.insertBefore(section, heading);

					if (index !== 0) {
						section.classList.add('is-collapsed');
					}

					const toggle = document.createElement('button');
					toggle.type = 'button';
					toggle.className = 'rnta-meta-section-toggle';
					toggle.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
					toggle.innerHTML = '<span class="rnta-meta-section-title"><strong>' + title + '</strong><small>' + copy + '</small></span><span class="rnta-meta-chevron">&#8964;</span>';
					section.appendChild(toggle);

					const body = document.createElement('div');
					body.className = 'rnta-meta-section-body';
					section.appendChild(body);

					heading.remove();
					let node = section.nextSibling;
					while (node && !(node.classList && node.classList.contains('rnta-meta-heading'))) {
						const next = node.nextSibling;
						body.appendChild(node);
						node = next;
					}

					toggle.addEventListener('click', () => {
						section.classList.toggle('is-collapsed');
						toggle.setAttribute('aria-expanded', section.classList.contains('is-collapsed') ? 'false' : 'true');
					});
				});

				const help = {
					rnta_badge_text: 'Optional short badge shown in cards or detail views. Avoid generic labels that do not add value.',
					rnta_age_label: 'Optional age or audience label, only if it helps the customer understand fit.',
					rnta_display_price: 'Customer-facing price text, such as From $699. This can include words.',
					rnta_duration: 'Customer-facing duration label, such as 2 hours. Operational duration is handled by booking rules.',
					rnta_short_description: 'Short public summary used in cards and previews. Keep it concise and polished.',
					rnta_conditions: 'Business conditions, one per line. These are separated from includes.',
					rnta_includes: 'Included items, one per line. Do not mix pricing rules or restrictions here.',
					rnta_reserve_label: 'Optional CTA label override. Most parties can keep the default.',
					rnta_page_url: 'Optional detail page URL if this experience has a dedicated page.',
					rnta_reservation_status: 'Optional internal/public status label. Leave empty unless needed.',
					rnta_featured: 'Marks the experience as featured for shortcodes that prioritize featured items.',
					rnta_base_price: 'Numeric base price used by Book Now quote calculations. Do not include $ symbols.',
					rnta_included_guests: 'Number of guests included in the base package.',
					rnta_max_guests: 'Maximum guests allowed for this experience.',
					rnta_extra_guest_price: 'Price for each guest above the included guest count.',
					rnta_auto_extra_time_threshold: 'Guest count threshold after which a required time add-on is automatically added. Example: 15 means 16+ guests.',
					rnta_auto_extra_time_addon: 'The extra-time add-on automatically selected after the threshold, usually Additional 1 Hour.',
					rnta_capacity_note: 'Plain-language capacity explanation shown to the team/customer where relevant.',
					rnta_allowed_addons: 'Add-ons that can be selected with this party in Book Now.',
					rnta_enable_internal_service_choices: 'Turn this on only when the host must choose a limited number of internal spa-style activities for the party.',
					rnta_spa_services_included_count: 'How many internal service options the host must choose for this party.',
					rnta_spa_service_options: 'Internal party service options shown in Book Now. For launch, these should normally be only: Mani, Pedi, Facial, Make-up, Hair.',
					rnta_quote_note: 'Optional override for the quote disclaimer shown in Book Now.',
					rnta_pricing_model: 'For add-ons: fixed, per guest, or custom quote.',
					rnta_requires_contact: 'For add-ons that require manual availability confirmation.',
					rnta_requires_extra_time: 'For add-ons that require additional party time.',
					rnta_availability_note: 'Optional add-on note such as subject to availability or call for quote.',
					rnta_compatible_parties: 'Reverse mapping for add-ons. Parties should still define allowed add-ons.'
				};

				Object.keys(help).forEach((id) => {
					const label = grid.querySelector('label[for="' + id + '"]');
					if (!label || label.querySelector('.rnta-meta-info')) return;
					const info = document.createElement('span');
					info.className = 'rnta-meta-info';
					info.tabIndex = 0;
					info.textContent = '?';
					info.setAttribute('aria-label', help[id]);
					info.setAttribute('data-help', help[id]);
					label.appendChild(info);
				});

				const internalServiceChecks = Array.from(grid.querySelectorAll('[data-rnta-service-option-checkbox]'));
				const hiddenInternalServices = grid.querySelector('#rnta_spa_service_options');
				const syncInternalServices = () => {
					if (!hiddenInternalServices) return;
						hiddenInternalServices.value = internalServiceChecks.filter((el) => el.checked).map((el) => el.value).join('\\n');
				};
				internalServiceChecks.forEach((el) => el.addEventListener('change', syncInternalServices));
				syncInternalServices();

				document.addEventListener('click', (event) => {
					const btn = event.target.closest('.rnta-toggle-all-checklist');
					if (!btn) return;
					event.preventDefault();
					event.stopPropagation();
					const targetId = btn.getAttribute('data-checklist-id');
					const action = btn.getAttribute('data-action');
					let container = targetId ? document.getElementById(targetId) : null;
					if (!container && btn.parentNode) {
						container = btn.parentNode.nextElementSibling;
					}
					if (!container) return;
					container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
						cb.checked = (action === 'select');
						cb.dispatchEvent(new Event('change', { bubbles: true }));
					});
				});
			})();
		</script>
		<div class="rnta-meta-grid">
			<div class="rnta-meta-heading"><?php esc_html_e('General Settings', 'rockntiara-experiences'); ?></div>
			<div>
				<label for="rnta_badge_text"><?php esc_html_e('Badge / Ribbon', 'rockntiara-experiences'); ?></label>
				<input id="rnta_badge_text" name="rnta_badge_text" type="text" value="<?php echo esc_attr($meta['badge_text']); ?>">
			</div>
			<div>
				<label for="rnta_age_label"><?php esc_html_e('Age / Audience Label', 'rockntiara-experiences'); ?></label>
				<input id="rnta_age_label" name="rnta_age_label" type="text" value="<?php echo esc_attr($meta['age_label']); ?>">
			</div>
			<div>
				<label for="rnta_display_price"><?php esc_html_e('Display Price', 'rockntiara-experiences'); ?></label>
				<input id="rnta_display_price" name="rnta_display_price" type="text" value="<?php echo esc_attr($meta['display_price']); ?>" placeholder="From $550">
			</div>
			<div>
				<label for="rnta_duration"><?php esc_html_e('Duration', 'rockntiara-experiences'); ?></label>
				<input id="rnta_duration" name="rnta_duration" type="text" value="<?php echo esc_attr($meta['duration']); ?>" placeholder="2 hours">
			</div>
			<div class="full">
				<label for="rnta_short_description"><?php esc_html_e('Short Description', 'rockntiara-experiences'); ?></label>
				<textarea id="rnta_short_description" name="rnta_short_description"><?php echo esc_textarea($meta['short_description']); ?></textarea>
			</div>
			<div class="full">
				<label for="rnta_conditions"><?php esc_html_e('Conditions', 'rockntiara-experiences'); ?></label>
				<textarea id="rnta_conditions" name="rnta_conditions"><?php echo esc_textarea($meta['conditions']); ?></textarea>
				<p class="rnta-meta-help"><?php esc_html_e('One condition per line.', 'rockntiara-experiences'); ?></p>
			</div>
			<div class="full">
				<label for="rnta_includes"><?php esc_html_e('Includes', 'rockntiara-experiences'); ?></label>
				<textarea id="rnta_includes" name="rnta_includes"><?php echo esc_textarea($meta['includes']); ?></textarea>
				<p class="rnta-meta-help"><?php esc_html_e('One included item per line.', 'rockntiara-experiences'); ?></p>
			</div>
			<div>
				<label for="rnta_reserve_label"><?php esc_html_e('Reserve Button Label', 'rockntiara-experiences'); ?></label>
				<input id="rnta_reserve_label" name="rnta_reserve_label" type="text" value="<?php echo esc_attr($meta['reserve_label']); ?>" placeholder="Reserve Now">
			</div>
			<div>
				<label for="rnta_page_url"><?php esc_html_e('Details Page URL (optional)', 'rockntiara-experiences'); ?></label>
				<input id="rnta_page_url" name="rnta_page_url" type="url" value="<?php echo esc_attr($meta['page_url']); ?>" placeholder="https://...">
			</div>
			<div>
				<label for="rnta_reservation_status"><?php esc_html_e('Status Label (optional)', 'rockntiara-experiences'); ?></label>
				<input id="rnta_reservation_status" name="rnta_reservation_status" type="text" value="<?php echo esc_attr($meta['reservation_status']); ?>" placeholder="Deposit required">
			</div>
			<div class="rnta-meta-check">
				<input id="rnta_featured" name="rnta_featured" type="checkbox" value="1" <?php checked($meta['featured'], '1'); ?>>
				<label for="rnta_featured"><?php esc_html_e('Featured experience', 'rockntiara-experiences'); ?></label>
			</div>

			<div class="rnta-meta-heading"><?php esc_html_e('Party Pricing & Capacity', 'rockntiara-experiences'); ?></div>
			<div>
				<label for="rnta_base_price"><?php esc_html_e('Base Price', 'rockntiara-experiences'); ?></label>
				<input id="rnta_base_price" name="rnta_base_price" type="number" min="0" step="0.01" value="<?php echo esc_attr($meta['base_price']); ?>" placeholder="500">
				<p class="rnta-meta-help"><?php esc_html_e('Base package value before extra guests or addons.', 'rockntiara-experiences'); ?></p>
			</div>
			<div>
				<label for="rnta_included_guests"><?php esc_html_e('Included Guests', 'rockntiara-experiences'); ?></label>
				<input id="rnta_included_guests" name="rnta_included_guests" type="number" min="0" step="1" value="<?php echo esc_attr($meta['included_guests']); ?>" placeholder="10">
			</div>
			<div>
				<label for="rnta_max_guests"><?php esc_html_e('Max Guests', 'rockntiara-experiences'); ?></label>
				<input id="rnta_max_guests" name="rnta_max_guests" type="number" min="0" step="1" value="<?php echo esc_attr($meta['max_guests']); ?>" placeholder="20">
			</div>
			<div>
				<label for="rnta_extra_guest_price"><?php esc_html_e('Extra Guest Price', 'rockntiara-experiences'); ?></label>
				<input id="rnta_extra_guest_price" name="rnta_extra_guest_price" type="number" min="0" step="0.01" value="<?php echo esc_attr($meta['extra_guest_price']); ?>" placeholder="35">
			</div>
			<div>
				<label for="rnta_auto_extra_time_threshold"><?php esc_html_e('Auto Extra Time After Guests', 'rockntiara-experiences'); ?></label>
				<input id="rnta_auto_extra_time_threshold" name="rnta_auto_extra_time_threshold" type="number" min="0" step="1" value="<?php echo esc_attr($meta['auto_extra_time_threshold']); ?>" placeholder="15">
				<p class="rnta-meta-help"><?php esc_html_e('Example: enter 15 when this package requires extra time for 16 or more guests.', 'rockntiara-experiences'); ?></p>
			</div>
			<div>
				<label for="rnta_auto_extra_time_addon"><?php esc_html_e('Auto Extra Time Addon', 'rockntiara-experiences'); ?></label>
				<select id="rnta_auto_extra_time_addon" name="rnta_auto_extra_time_addon">
					<option value=""><?php esc_html_e('None', 'rockntiara-experiences'); ?></option>
					<?php foreach ($this->get_experience_posts_by_type('addon') as $addon_id => $addon_title) : ?>
						<option value="<?php echo esc_attr($addon_id); ?>" <?php selected((string) $meta['auto_extra_time_addon'], (string) $addon_id); ?>>
							<?php echo esc_html($addon_title); ?>
						</option>
					<?php endforeach; ?>
				</select>
				<p class="rnta-meta-help"><?php esc_html_e('Used by Book Now to automatically add required party time when the guest count crosses the threshold.', 'rockntiara-experiences'); ?></p>
			</div>
			<div class="full">
				<label for="rnta_capacity_note"><?php esc_html_e('Capacity Note', 'rockntiara-experiences'); ?></label>
				<textarea id="rnta_capacity_note" name="rnta_capacity_note"><?php echo esc_textarea($meta['capacity_note']); ?></textarea>
				<p class="rnta-meta-help"><?php esc_html_e('Example: Includes up to 10 guests. Maximum 20 guests. Additional guests are $35 each.', 'rockntiara-experiences'); ?></p>
			</div>
			<div class="full">
				<label for="rnta_allowed_addons"><?php esc_html_e('Allowed Addons', 'rockntiara-experiences'); ?></label>
				<?php $this->render_checkbox_list('rnta_allowed_addons', 'rnta_allowed_addons[]', $meta['allowed_addons'], $this->get_experience_posts_by_type('addon')); ?>
				<p class="rnta-meta-help"><?php esc_html_e('Used by Book Now to show which extra paid addons can be selected for this Party.', 'rockntiara-experiences'); ?></p>
			</div>
			<div class="full">
				<label for="rnta_included_addons"><?php esc_html_e('Included Addons (Included in Base Package Price)', 'rockntiara-experiences'); ?></label>
				<?php $this->render_checkbox_list('rnta_included_addons', 'rnta_included_addons[]', $meta['included_addons'], $this->get_experience_posts_by_type('addon')); ?>
				<p class="rnta-meta-help"><?php esc_html_e('Addons selected here will be pre-included in this Party package at $0 extra cost.', 'rockntiara-experiences'); ?></p>
			</div>
			<div class="rnta-meta-heading"><?php esc_html_e('Internal Party Service Choices', 'rockntiara-experiences'); ?></div>
			<div class="rnta-meta-check">
				<input id="rnta_enable_internal_service_choices" name="rnta_enable_internal_service_choices" type="checkbox" value="1" <?php checked($meta['enable_internal_service_choices'], '1'); ?>>
				<label for="rnta_enable_internal_service_choices"><?php esc_html_e('This party lets the host choose from the internal service mini menu', 'rockntiara-experiences'); ?></label>
			</div>
			<div>
				<label for="rnta_spa_services_included_count"><?php esc_html_e('Included Spa Service Choices', 'rockntiara-experiences'); ?></label>
				<input id="rnta_spa_services_included_count" name="rnta_spa_services_included_count" type="number" min="0" step="1" value="<?php echo esc_attr($meta['spa_services_included_count']); ?>" placeholder="5">
				<p class="rnta-meta-help"><?php esc_html_e('How many spa services the host must choose for this Party. Example: 3, 4, or 5.', 'rockntiara-experiences'); ?></p>
			</div>
			<div class="full">
				<label for="rnta_spa_service_options"><?php esc_html_e('Selectable Internal Services', 'rockntiara-experiences'); ?></label>
				<?php $this->render_internal_service_checklist('rnta_spa_service_options_choices', 'rnta_spa_service_options_choices[]', $meta['spa_service_options']); ?>
				<textarea id="rnta_spa_service_options" name="rnta_spa_service_options" style="display:none;"><?php echo esc_textarea($meta['spa_service_options']); ?></textarea>
				<p class="rnta-meta-help"><?php esc_html_e('These are internal party choices only. They are not public Spa Service products.', 'rockntiara-experiences'); ?></p>
			</div>
			<div class="full">
				<label for="rnta_quote_note"><?php esc_html_e('Quote Disclaimer Override (optional)', 'rockntiara-experiences'); ?></label>
				<textarea id="rnta_quote_note" name="rnta_quote_note"><?php echo esc_textarea($meta['quote_note']); ?></textarea>
			</div>

			<div class="rnta-meta-heading"><?php esc_html_e('Addon Rules', 'rockntiara-experiences'); ?></div>
			<div>
				<label for="rnta_pricing_model"><?php esc_html_e('Pricing Model', 'rockntiara-experiences'); ?></label>
				<select id="rnta_pricing_model" name="rnta_pricing_model">
					<?php foreach ($this->get_pricing_model_options() as $value => $label) : ?>
						<option value="<?php echo esc_attr($value); ?>" <?php selected($meta['pricing_model'], $value); ?>><?php echo esc_html($label); ?></option>
					<?php endforeach; ?>
				</select>
			</div>
			<div class="rnta-meta-check">
				<input id="rnta_requires_contact" name="rnta_requires_contact" type="checkbox" value="1" <?php checked($meta['requires_contact'], '1'); ?>>
				<label for="rnta_requires_contact"><?php esc_html_e('Requires contact / availability confirmation', 'rockntiara-experiences'); ?></label>
			</div>
			<div class="rnta-meta-check">
				<input id="rnta_requires_extra_time" name="rnta_requires_extra_time" type="checkbox" value="1" <?php checked($meta['requires_extra_time'], '1'); ?>>
				<label for="rnta_requires_extra_time"><?php esc_html_e('Requires additional time purchase', 'rockntiara-experiences'); ?></label>
			</div>
			<div class="full">
				<label for="rnta_availability_note"><?php esc_html_e('Availability / Pricing Note', 'rockntiara-experiences'); ?></label>
				<textarea id="rnta_availability_note" name="rnta_availability_note"><?php echo esc_textarea($meta['availability_note']); ?></textarea>
				<p class="rnta-meta-help"><?php esc_html_e('Used for subject-to-availability or custom quote language.', 'rockntiara-experiences'); ?></p>
			</div>
			<div class="full">
				<label for="rnta_compatible_parties"><?php esc_html_e('Compatible Parties', 'rockntiara-experiences'); ?></label>
				<?php $this->render_checkbox_list('rnta_compatible_parties', 'rnta_compatible_parties[]', $meta['compatible_parties'], $this->get_experience_posts_by_type('party')); ?>
				<p class="rnta-meta-help"><?php esc_html_e('Optional reverse mapping for addons. Parties should still define Allowed Addons.', 'rockntiara-experiences'); ?></p>
			</div>
		</div>
		<p class="rnta-meta-help"><?php esc_html_e('Compact views show summary only. Full conditions and reservation CTA live in the detail modal.', 'rockntiara-experiences'); ?></p>
		<?php
	}

	private function render_checkbox_list($field_id, $field_name, $selected, $options) {
		$selected_values = array_map('strval', (array) $selected);
		if (empty($options)) {
			echo '<div id="' . esc_attr($field_id) . '" class="rnta-meta-checklist">';
			echo '<p class="rnta-meta-help">' . esc_html__('No related experiences available yet.', 'rockntiara-experiences') . '</p>';
			echo '</div>';
			return;
		}

		echo '<div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center;">';
		echo '<button type="button" class="button button-small rnta-toggle-all-checklist" data-checklist-id="' . esc_attr($field_id) . '" data-action="select" onclick="var c=document.getElementById(\'' . esc_attr($field_id) . '\');if(!c&&this.parentNode){c=this.parentNode.nextElementSibling;}if(c){c.querySelectorAll(\'input[type=checkbox]\').forEach(function(b){b.checked=true;b.dispatchEvent(new Event(\'change\',{bubbles:true}));});}return false;">' . esc_html__('Add All', 'rockntiara-experiences') . '</button>';
		echo '<button type="button" class="button button-small rnta-toggle-all-checklist" data-checklist-id="' . esc_attr($field_id) . '" data-action="deselect" onclick="var c=document.getElementById(\'' . esc_attr($field_id) . '\');if(!c&&this.parentNode){c=this.parentNode.nextElementSibling;}if(c){c.querySelectorAll(\'input[type=checkbox]\').forEach(function(b){b.checked=false;b.dispatchEvent(new Event(\'change\',{bubbles:true}));});}return false;">' . esc_html__('Deselect All', 'rockntiara-experiences') . '</button>';
		echo '</div>';

		echo '<div id="' . esc_attr($field_id) . '" class="rnta-meta-checklist">';

		foreach ($options as $option_id => $option_title) {
			$input_id = $field_id . '_' . absint($option_id);
			echo '<div class="rnta-meta-checkitem">';
			echo '<input id="' . esc_attr($input_id) . '" type="checkbox" name="' . esc_attr($field_name) . '" value="' . esc_attr($option_id) . '" ' . checked(in_array((string) $option_id, $selected_values, true), true, false) . '>';
			echo '<label for="' . esc_attr($input_id) . '"><span>' . esc_html($option_title) . '</span></label>';
			echo '</div>';
		}

		echo '</div>';
	}

	private function render_internal_service_checklist($field_id, $field_name, $selected_raw) {
		$options = array('Mani', 'Pedi', 'Facial', 'Make-up', 'Hair');
		$selected = array_map('strval', $this->explode_lines($selected_raw));
		echo '<div id="' . esc_attr($field_id) . '" class="rnta-meta-checklist">';
		foreach ($options as $index => $option_title) {
			$input_id = $field_id . '_' . $index;
			echo '<div class="rnta-meta-checkitem">';
			echo '<input id="' . esc_attr($input_id) . '" type="checkbox" name="' . esc_attr($field_name) . '" value="' . esc_attr($option_title) . '" ' . checked(in_array($option_title, $selected, true), true, false) . ' data-rnta-service-option-checkbox>';
			echo '<label for="' . esc_attr($input_id) . '"><span>' . esc_html($option_title) . '</span></label>';
			echo '</div>';
		}
		echo '</div>';
	}

	private function get_meta($post_id) {
		$defaults = array(
			'badge_text'          => '',
			'age_label'           => '',
			'display_price'       => '',
			'duration'            => '',
			'short_description'   => '',
			'conditions'          => '',
			'includes'            => '',
			'reserve_label'       => __('Reserve Now', 'rockntiara-experiences'),
			'page_url'            => '',
			'reservation_status'  => '',
			'base_price'          => '',
			'included_guests'     => '',
			'max_guests'          => '',
			'extra_guest_price'   => '',
			'auto_extra_time_threshold' => '',
			'auto_extra_time_addon' => '',
			'capacity_note'       => '',
			'allowed_addons'      => array(),
			'included_addons'     => array(),
			'enable_internal_service_choices' => '',
			'spa_services_included_count' => '',
			'spa_service_options' => '',
			'allowed_spa_services' => array(),
			'quote_note'          => '',
			'pricing_model'       => 'fixed',
			'requires_contact'    => '',
			'requires_extra_time' => '',
			'availability_note'   => '',
			'compatible_parties'  => array(),
			'featured'            => '',
		);

		foreach ($defaults as $key => $default) {
			$saved = get_post_meta($post_id, '_rnta_' . $key, true);
			if (in_array($key, array('allowed_addons', 'included_addons', 'allowed_spa_services', 'compatible_parties'), true)) {
				$defaults[$key] = is_array($saved) ? $saved : $default;
			} else {
				$defaults[$key] = '' !== $saved ? $saved : $default;
			}
		}

		if (empty($defaults['enable_internal_service_choices'])) {
			$defaults['enable_internal_service_choices'] = (!empty($defaults['spa_service_options']) || !empty($defaults['spa_services_included_count'])) ? '1' : '';
		}

		return $defaults;
	}

	public function save_meta_boxes($post_id) {
		if (!isset($_POST[self::NONCE]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST[self::NONCE])), 'rnta_save_experience_meta')) {
			return;
		}

		if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
			return;
		}

		if (!current_user_can('edit_post', $post_id)) {
			return;
		}

		$fields = array(
			'badge_text'         => 'sanitize_text_field',
			'age_label'          => 'sanitize_text_field',
			'display_price'      => 'sanitize_text_field',
			'duration'           => 'sanitize_text_field',
			'short_description'  => 'sanitize_textarea_field',
			'conditions'         => 'sanitize_textarea_field',
			'includes'           => 'sanitize_textarea_field',
			'reserve_label'      => 'sanitize_text_field',
			'page_url'           => 'esc_url_raw',
			'reservation_status' => 'sanitize_text_field',
			'base_price'         => array($this, 'sanitize_decimal_string'),
			'included_guests'    => 'absint',
			'max_guests'         => 'absint',
			'extra_guest_price'  => array($this, 'sanitize_decimal_string'),
			'auto_extra_time_threshold' => 'absint',
			'auto_extra_time_addon' => 'absint',
			'capacity_note'      => 'sanitize_textarea_field',
			'spa_services_included_count' => 'absint',
			'spa_service_options' => 'sanitize_textarea_field',
			'quote_note'         => 'sanitize_textarea_field',
			'pricing_model'      => array($this, 'sanitize_pricing_model'),
			'availability_note'  => 'sanitize_textarea_field',
		);

		foreach ($fields as $field => $sanitizer) {
			$value = isset($_POST['rnta_' . $field]) ? call_user_func($sanitizer, wp_unslash($_POST['rnta_' . $field])) : '';
			update_post_meta($post_id, '_rnta_' . $field, $value);
		}

		$service_choices = isset($_POST['rnta_spa_service_options_choices']) ? array_map('sanitize_text_field', wp_unslash($_POST['rnta_spa_service_options_choices'])) : array();
		$service_choices = array_values(array_intersect($service_choices, array('Mani', 'Pedi', 'Facial', 'Make-up', 'Hair')));
		update_post_meta($post_id, '_rnta_spa_service_options', implode("\n", $service_choices));

		update_post_meta($post_id, '_rnta_allowed_addons', $this->sanitize_id_array(isset($_POST['rnta_allowed_addons']) ? wp_unslash($_POST['rnta_allowed_addons']) : array()));
		update_post_meta($post_id, '_rnta_included_addons', $this->sanitize_id_array(isset($_POST['rnta_included_addons']) ? wp_unslash($_POST['rnta_included_addons']) : array()));
		update_post_meta($post_id, '_rnta_allowed_spa_services', $this->sanitize_id_array(isset($_POST['rnta_allowed_spa_services']) ? wp_unslash($_POST['rnta_allowed_spa_services']) : array()));
		update_post_meta($post_id, '_rnta_compatible_parties', $this->sanitize_id_array(isset($_POST['rnta_compatible_parties']) ? wp_unslash($_POST['rnta_compatible_parties']) : array()));
		update_post_meta($post_id, '_rnta_enable_internal_service_choices', isset($_POST['rnta_enable_internal_service_choices']) ? '1' : '');
		update_post_meta($post_id, '_rnta_requires_contact', isset($_POST['rnta_requires_contact']) ? '1' : '');
		update_post_meta($post_id, '_rnta_requires_extra_time', isset($_POST['rnta_requires_extra_time']) ? '1' : '');
		update_post_meta($post_id, '_rnta_featured', isset($_POST['rnta_featured']) ? '1' : '');
	}

	public function register_settings_page() {
		add_submenu_page(
			'edit.php?post_type=' . self::POST_TYPE,
			__('Experience Settings', 'rockntiara-experiences'),
			__('Settings', 'rockntiara-experiences'),
			'manage_options',
			'rnta-experience-settings',
			array($this, 'render_settings_page')
		);

		add_submenu_page(
			'edit.php?post_type=' . self::POST_TYPE,
			__('Bulk Import', 'rockntiara-experiences'),
			__('Bulk Import', 'rockntiara-experiences'),
			'manage_options',
			'rnta-experience-bulk-import',
			array($this, 'render_bulk_import_page')
		);
	}

	public function register_settings() {
		register_setting(
			self::SETTINGS_GROUP,
			self::SETTINGS_KEY,
			array($this, 'sanitize_settings')
		);
	}

	public function sanitize_settings($input) {
		return array(
			'deposit_product_id' => isset($input['deposit_product_id']) ? absint($input['deposit_product_id']) : 0,
		);
	}

	public function render_settings_page() {
		$options = get_option(self::SETTINGS_KEY, array('deposit_product_id' => 0));
		?>
		<div class="wrap">
			<h1><?php esc_html_e('Rock N Tiara Experiences Settings', 'rockntiara-experiences'); ?></h1>
			<form method="post" action="options.php">
				<?php settings_fields(self::SETTINGS_GROUP); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row">
							<label for="rnta_deposit_product_id"><?php esc_html_e('Deposit Product ID', 'rockntiara-experiences'); ?></label>
						</th>
						<td>
							<input
								id="rnta_deposit_product_id"
								name="<?php echo esc_attr(self::SETTINGS_KEY); ?>[deposit_product_id]"
								type="number"
								min="0"
								value="<?php echo esc_attr(isset($options['deposit_product_id']) ? $options['deposit_product_id'] : 0); ?>"
								class="regular-text"
							>
							<p class="description"><?php esc_html_e('Use the WooCommerce product ID of the single USD 200 Deposit product. Book Now will later use this product for the reservation checkout handoff.', 'rockntiara-experiences'); ?></p>
						</td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}

	public function render_bulk_import_page() {
		if (!current_user_can('manage_options')) {
			wp_die(esc_html__('You do not have permission to import experiences.', 'rockntiara-experiences'));
		}

		$result = get_transient('rnta_experiences_import_result_' . get_current_user_id());
		if ($result) {
			delete_transient('rnta_experiences_import_result_' . get_current_user_id());
		}

		$fields = $this->get_importable_fields();
		?>
		<div class="wrap">
			<h1><?php esc_html_e('Rock N Tiara Experiences Bulk Import', 'rockntiara-experiences'); ?></h1>
			<p><?php esc_html_e('Upload one CSV or JSON file to create or update Parties, Spa Services, and Addons in one batch.', 'rockntiara-experiences'); ?></p>

			<?php if (is_array($result)) : ?>
				<div class="notice notice-<?php echo empty($result['errors']) ? 'success' : 'warning'; ?> is-dismissible">
					<p>
						<strong><?php esc_html_e('Import completed.', 'rockntiara-experiences'); ?></strong>
						<?php
						printf(
							esc_html__('Created: %1$d. Updated: %2$d. Skipped: %3$d.', 'rockntiara-experiences'),
							absint($result['created']),
							absint($result['updated']),
							absint($result['skipped'])
						);
						?>
					</p>
					<?php if (!empty($result['errors'])) : ?>
						<ul>
							<?php foreach ($result['errors'] as $error) : ?>
								<li><?php echo esc_html($error); ?></li>
							<?php endforeach; ?>
						</ul>
					<?php endif; ?>
				</div>
			<?php endif; ?>

			<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" enctype="multipart/form-data" style="max-width: 920px; background: #fff; border: 1px solid #dcdcde; padding: 24px; border-radius: 8px;">
				<input type="hidden" name="action" value="rnta_experiences_bulk_import">
				<?php wp_nonce_field('rnta_experiences_bulk_import', 'rnta_experiences_bulk_import_nonce'); ?>

				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="rnta_import_file"><?php esc_html_e('Import file', 'rockntiara-experiences'); ?></label></th>
						<td>
							<input id="rnta_import_file" name="rnta_import_file" type="file" accept=".csv,.json,text/csv,application/json" required>
							<p class="description"><?php esc_html_e('Accepted formats: CSV with a header row, or JSON array/object. Use the field list below.', 'rockntiara-experiences'); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e('Import behavior', 'rockntiara-experiences'); ?></th>
						<td>
							<label>
								<input type="checkbox" name="rnta_update_existing" value="1" checked>
								<?php esc_html_e('Update existing experiences when the slug already exists', 'rockntiara-experiences'); ?>
							</label>
							<br>
							<label>
								<input type="checkbox" name="rnta_publish_imported" value="1" checked>
								<?php esc_html_e('Publish imported experiences by default', 'rockntiara-experiences'); ?>
							</label>
						</td>
					</tr>
				</table>

				<?php submit_button(__('Import Experiences', 'rockntiara-experiences')); ?>
			</form>

			<h2><?php esc_html_e('Supported fields', 'rockntiara-experiences'); ?></h2>
			<p><?php esc_html_e('Required: type and title. Type must be party, spa, or addon. Lists can be separated with the pipe character: item one | item two | item three.', 'rockntiara-experiences'); ?></p>
			<table class="widefat striped" style="max-width: 1100px;">
				<thead>
					<tr>
						<th><?php esc_html_e('Field', 'rockntiara-experiences'); ?></th>
						<th><?php esc_html_e('Use', 'rockntiara-experiences'); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ($fields as $field => $description) : ?>
						<tr>
							<td><code><?php echo esc_html($field); ?></code></td>
							<td><?php echo esc_html($description); ?></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		</div>
		<?php
	}

	public function handle_bulk_import_upload() {
		if (!current_user_can('manage_options')) {
			wp_die(esc_html__('You do not have permission to import experiences.', 'rockntiara-experiences'));
		}

		check_admin_referer('rnta_experiences_bulk_import', 'rnta_experiences_bulk_import_nonce');

		$result = array(
			'created' => 0,
			'updated' => 0,
			'skipped' => 0,
			'errors'  => array(),
		);

		if (empty($_FILES['rnta_import_file']['tmp_name'])) {
			$result['errors'][] = __('No import file was uploaded.', 'rockntiara-experiences');
			$this->redirect_after_import($result);
		}

		$file_name = isset($_FILES['rnta_import_file']['name']) ? sanitize_file_name(wp_unslash($_FILES['rnta_import_file']['name'])) : '';
		$tmp_name  = isset($_FILES['rnta_import_file']['tmp_name']) ? sanitize_text_field(wp_unslash($_FILES['rnta_import_file']['tmp_name'])) : '';
		$extension = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));

		if (!in_array($extension, array('csv', 'json'), true)) {
			$result['errors'][] = __('Unsupported file type. Upload a CSV or JSON file.', 'rockntiara-experiences');
			$this->redirect_after_import($result);
		}

		$records = 'json' === $extension ? $this->parse_import_json($tmp_name, $result) : $this->parse_import_csv($tmp_name, $result);
		if (empty($records)) {
			$result['errors'][] = __('No valid records were found in the import file.', 'rockntiara-experiences');
			$this->redirect_after_import($result);
		}

		$options = array(
			'update_existing'  => isset($_POST['rnta_update_existing']),
			'publish_imported' => isset($_POST['rnta_publish_imported']),
		);

		$pending_addon_links = array();
		$pending_spa_service_links = array();

		foreach ($records as $index => $record) {
			$row_number = $index + 1;
			$imported = $this->upsert_experience_record($record, $options, $row_number, $result);

			if (!$imported || empty($imported['post_id'])) {
				continue;
			}

			if (!empty($imported['created'])) {
				$result['created']++;
			} else {
				$result['updated']++;
			}

			if (!empty($imported['allowed_addons_raw'])) {
				$pending_addon_links[$imported['post_id']] = $imported['allowed_addons_raw'];
			}
			if (!empty($imported['allowed_spa_services_provided'])) {
				$pending_spa_service_links[$imported['post_id']] = $imported['allowed_spa_services_raw'];
			}
			if (!empty($imported['compatible_parties_raw'])) {
				update_post_meta($imported['post_id'], '_rnta_compatible_parties', $this->resolve_experience_references($imported['compatible_parties_raw'], 'party'));
			}
			if (!empty($imported['auto_extra_time_addon_raw'])) {
				$auto_extra_time_addon = $this->resolve_experience_references($imported['auto_extra_time_addon_raw'], 'addon');
				update_post_meta($imported['post_id'], '_rnta_auto_extra_time_addon', !empty($auto_extra_time_addon[0]) ? absint($auto_extra_time_addon[0]) : 0);
			}
		}

		foreach ($pending_addon_links as $post_id => $raw_value) {
			update_post_meta($post_id, '_rnta_allowed_addons', $this->resolve_experience_references($raw_value, 'addon'));
		}
		foreach ($pending_spa_service_links as $post_id => $raw_value) {
			update_post_meta($post_id, '_rnta_allowed_spa_services', $this->resolve_experience_references($raw_value, 'spa'));
		}

		$this->redirect_after_import($result);
	}

	public function render_parties_grid_shortcode($atts = array()) {
		$atts = shortcode_atts(
			array(
				'columns' => 3,
				'limit'   => -1,
				'class'   => '',
				'per_page' => 6,
				'filters' => 'yes',
				'pager'   => 'yes',
			),
			$atts,
			'rnta_parties_grid'
		);

		return $this->render_shortcode(
			array_merge(
				$atts,
				array(
					'type'            => 'party',
					'view'            => 'compact',
					'modal'           => 'yes',
					'show_details'    => 'no',
					'show_conditions' => 'no',
					'primary_action'  => 'details',
					'details_label'   => 'See More',
				)
			)
		);
	}

	public function render_spa_grid_shortcode($atts = array()) {
		$atts = shortcode_atts(
			array(
				'columns' => 3,
				'limit'   => -1,
				'class'   => '',
				'per_page' => 6,
				'filters' => 'yes',
				'pager'   => 'yes',
			),
			$atts,
			'rnta_spa_grid'
		);

		return $this->render_shortcode(
			array_merge(
				$atts,
				array(
					'type'            => 'spa',
					'view'            => 'compact',
					'modal'           => 'yes',
					'show_details'    => 'no',
					'show_conditions' => 'no',
					'primary_action'  => 'details',
					'details_label'   => 'See More',
				)
			)
		);
	}

	public function render_addons_grid_shortcode($atts = array()) {
		$atts = shortcode_atts(
			array(
				'columns' => 3,
				'limit'   => -1,
				'class'   => '',
			),
			$atts,
			'rnta_addons_grid'
		);

		return $this->render_shortcode(
			array_merge(
				$atts,
				array(
					'type'            => 'addon',
					'view'            => 'compact',
					'modal'           => 'yes',
					'show_details'    => 'no',
					'show_conditions' => 'no',
					'primary_action'  => 'details',
					'details_label'   => 'See More',
				)
			)
		);
	}

	public function render_book_now_builder_shortcode($atts = array()) {
		if ($this->is_elementor_editor_context()) {
			return '<div style="padding:18px 20px;border:1px solid rgba(237,79,143,.18);border-radius:22px;background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(255,248,251,.96));color:#856b76;font:600 14px/1.6 Quicksand, sans-serif;"><strong style="display:block;color:#ed4f8f;margin-bottom:8px;">Rock N Tiara Book Now Builder</strong>This shortcode is intentionally simplified inside Elementor editor mode. View the page on the frontend to use the live party selector, addons logic, quote engine, and checkout handoff.</div>';
		}

		try {
			$atts = shortcode_atts(
				array(
					'default_party' => isset($_GET['experience_id']) ? absint(wp_unslash($_GET['experience_id'])) : 0,
				),
				$atts,
				'rnta_book_now_builder'
			);

			$parties = $this->get_frontend_experiences_by_type('party');
			if (empty($parties)) {
				return '';
			}

			$selected_party_id = absint($atts['default_party']);
			if (!$selected_party_id || !isset($parties[$selected_party_id])) {
				$party_keys = array_keys($parties);
				$selected_party_id = (int) reset($party_keys);
			}

			$addons = $this->get_frontend_experiences_by_type('addon');
			$spa_services = $this->get_frontend_experiences_by_type('spa');
			$this->print_book_now_assets_once();

			$form_action = remove_query_arg(array('rnta_quote_requested', 'rnta_quote_error'));
			$status      = isset($_GET['rnta_quote_requested']) ? sanitize_key(wp_unslash($_GET['rnta_quote_requested'])) : '';
			$error       = isset($_GET['rnta_quote_error']) ? sanitize_text_field(wp_unslash($_GET['rnta_quote_error'])) : '';

			ob_start();
			?>
			<div
				class="rnta-book-now-builder"
				data-rnta-book-now
				data-deposit-product-id="<?php echo esc_attr($this->get_deposit_product_id()); ?>"
				data-parties="<?php echo esc_attr(wp_json_encode($parties)); ?>"
				data-addons="<?php echo esc_attr(wp_json_encode($addons)); ?>"
				data-spa-services="<?php echo esc_attr(wp_json_encode($spa_services)); ?>"
				data-selected-party="<?php echo esc_attr($selected_party_id); ?>"
			>
				<?php if ('success' === $status) : ?>
					<div class="rnta-book-now-builder__message rnta-book-now-builder__message--success">
						<?php esc_html_e('Your full quote request was sent successfully. Rock N Tiara will follow up with you soon.', 'rockntiara-experiences'); ?>
					</div>
				<?php endif; ?>

				<?php if (!empty($error)) : ?>
					<div class="rnta-book-now-builder__message rnta-book-now-builder__message--error">
						<?php echo esc_html($error); ?>
					</div>
				<?php endif; ?>

				<form class="rnta-book-now-builder__form" method="post" action="<?php echo esc_url($form_action); ?>">
					<?php wp_nonce_field('rnta_book_now_submit', 'rnta_book_now_nonce'); ?>
					<input type="hidden" name="rnta_book_now_action" value="">
					<input type="hidden" name="rnta_selected_party_id" value="<?php echo esc_attr($selected_party_id); ?>" data-rnta-selected-party-input>
					<input type="hidden" name="rnta_estimated_total" value="" data-rnta-estimated-total>
					<input type="hidden" name="rnta_extra_guest_total" value="" data-rnta-extra-guest-total>
					<input type="hidden" name="rnta_extra_guest_count" value="" data-rnta-extra-guest-count>
					<input type="hidden" name="rnta_selected_spa_services" value="" data-rnta-selected-spa-services-input>

					<section class="rnta-book-now-builder__section rnta-book-now-builder__section--selector">
						<div class="rnta-book-now-builder__heading">
							<span class="rnta-book-now-builder__eyebrow"><?php esc_html_e('Step 1', 'rockntiara-experiences'); ?></span>
							<h3><?php esc_html_e('Choose your party package', 'rockntiara-experiences'); ?></h3>
						</div>
						<div class="rnta-book-now-builder__party-select">
							<label for="rnta_party_selector"><?php esc_html_e('Party package', 'rockntiara-experiences'); ?></label>
							<select id="rnta_party_selector" data-rnta-party-selector>
								<?php foreach ($parties as $party_id => $party) : ?>
									<option value="<?php echo esc_attr($party_id); ?>" <?php selected($selected_party_id, $party_id); ?>>
										<?php echo esc_html($party['title']); ?>
									</option>
								<?php endforeach; ?>
							</select>
						</div>
					</section>

					<section class="rnta-book-now-builder__section rnta-book-now-builder__section--summary">
						<div class="rnta-book-now-builder__heading">
							<span class="rnta-book-now-builder__eyebrow"><?php esc_html_e('Step 2', 'rockntiara-experiences'); ?></span>
							<h3><?php esc_html_e('Review your selected party', 'rockntiara-experiences'); ?></h3>
						</div>
						<div class="rnta-book-now-builder__party-card" data-rnta-party-card></div>
					</section>

					<section class="rnta-book-now-builder__section rnta-book-now-builder__section--guests">
						<div class="rnta-book-now-builder__heading">
							<span class="rnta-book-now-builder__eyebrow"><?php esc_html_e('Step 3', 'rockntiara-experiences'); ?></span>
							<h3><?php esc_html_e('Guest count & package limits', 'rockntiara-experiences'); ?></h3>
						</div>
						<div class="rnta-book-now-builder__guest-grid">
							<div class="rnta-book-now-builder__field">
								<label for="rnta_guest_count"><?php esc_html_e('How many girls will attend?', 'rockntiara-experiences'); ?></label>
								<input id="rnta_guest_count" type="number" min="1" step="1" value="1" name="rnta_guest_count" data-rnta-guest-count required>
							</div>
							<div class="rnta-book-now-builder__capacity-box" data-rnta-capacity-box></div>
						</div>
						<div class="rnta-book-now-builder__validation" data-rnta-guest-validation></div>
					</section>

					<section class="rnta-book-now-builder__section rnta-book-now-builder__section--spa-services" data-rnta-spa-services-section>
						<div class="rnta-book-now-builder__heading">
							<span class="rnta-book-now-builder__eyebrow"><?php esc_html_e('Step 4', 'rockntiara-experiences'); ?></span>
							<h3><?php esc_html_e('Choose included spa services', 'rockntiara-experiences'); ?></h3>
						</div>
						<div class="rnta-book-now-builder__capacity-box" data-rnta-spa-services-note></div>
						<div class="rnta-book-now-builder__spa-services-grid" data-rnta-spa-services-grid></div>
						<div class="rnta-book-now-builder__validation" data-rnta-spa-services-validation></div>
					</section>

					<section class="rnta-book-now-builder__section rnta-book-now-builder__section--addons">
						<div class="rnta-book-now-builder__heading">
							<span class="rnta-book-now-builder__eyebrow"><?php esc_html_e('Step 5', 'rockntiara-experiences'); ?></span>
							<h3><?php esc_html_e('Customize with addons', 'rockntiara-experiences'); ?></h3>
						</div>
						<div class="rnta-book-now-builder__addons-grid" data-rnta-addons-grid></div>
					</section>

					<section class="rnta-book-now-builder__section rnta-book-now-builder__section--details">
						<div class="rnta-book-now-builder__heading">
							<span class="rnta-book-now-builder__eyebrow"><?php esc_html_e('Step 6', 'rockntiara-experiences'); ?></span>
							<h3><?php esc_html_e('Reservation details', 'rockntiara-experiences'); ?></h3>
						</div>
						<div class="rnta-book-now-builder__capacity-box" style="margin-bottom:18px;">
							<?php esc_html_e('Parties are available Friday, Saturday, and Sunday only. Start times are fixed at 10:00 AM, 1:00 PM, 4:00 PM, and 7:00 PM. Each party lasts 2 hours, followed by a 30-minute cleanup and reset block. Your selected date and start time are placed on a temporary 48-hour hold while Rock N Tiara reviews payment proof.', 'rockntiara-experiences'); ?>
						</div>
						<div class="rnta-book-now-builder__details-stack">
							<div class="rnta-book-now-builder__subsection">
								<div class="rnta-book-now-builder__subheading">
									<span class="rnta-book-now-builder__subeyebrow"><?php esc_html_e('Personal details', 'rockntiara-experiences'); ?></span>
									<h4><?php esc_html_e('Host and birthday child information', 'rockntiara-experiences'); ?></h4>
								</div>
								<div class="rnta-book-now-builder__details-grid">
									<div class="rnta-book-now-builder__field"><label for="rnta_host_first_name"><?php esc_html_e('Host first name', 'rockntiara-experiences'); ?></label><input id="rnta_host_first_name" name="rnta_host_first_name" type="text" required></div>
									<div class="rnta-book-now-builder__field"><label for="rnta_host_last_name"><?php esc_html_e('Host last name', 'rockntiara-experiences'); ?></label><input id="rnta_host_last_name" name="rnta_host_last_name" type="text" required></div>
									<div class="rnta-book-now-builder__field"><label for="rnta_host_email"><?php esc_html_e('Host email', 'rockntiara-experiences'); ?></label><input id="rnta_host_email" name="rnta_host_email" type="email" required></div>
									<div class="rnta-book-now-builder__field"><label for="rnta_host_phone"><?php esc_html_e('Host phone', 'rockntiara-experiences'); ?></label><input id="rnta_host_phone" name="rnta_host_phone" type="text" required></div>
									<div class="rnta-book-now-builder__field"><label for="rnta_child_name"><?php esc_html_e('Child name', 'rockntiara-experiences'); ?></label><input id="rnta_child_name" name="rnta_child_name" type="text" required></div>
									<div class="rnta-book-now-builder__field"><label for="rnta_child_age"><?php esc_html_e('Child age', 'rockntiara-experiences'); ?></label><input id="rnta_child_age" name="rnta_child_age" type="number" min="1" step="1" required readonly placeholder="<?php esc_attr_e('Auto-calculated from birthday', 'rockntiara-experiences'); ?>"></div>
									<div class="rnta-book-now-builder__field rnta-book-now-builder__field--full">
										<label for="rnta_child_birthdate"><?php esc_html_e('Birthday date', 'rockntiara-experiences'); ?></label>
										<input id="rnta_child_birthdate" name="rnta_child_birthdate" type="hidden" data-rnta-birth-hidden>
										<div class="rnta-book-now-builder__birth-picker">
											<select data-rnta-birth-month>
												<option value=""><?php esc_html_e('Month', 'rockntiara-experiences'); ?></option>
												<?php for ( $month = 1; $month <= 12; $month++ ) : ?>
													<option value="<?php echo esc_attr( sprintf( '%02d', $month ) ); ?>"><?php echo esc_html( gmdate( 'F', gmmktime( 0, 0, 0, $month, 1 ) ) ); ?></option>
												<?php endfor; ?>
											</select>
											<select data-rnta-birth-day>
												<option value=""><?php esc_html_e('Day', 'rockntiara-experiences'); ?></option>
												<?php for ( $day = 1; $day <= 31; $day++ ) : ?>
													<option value="<?php echo esc_attr( sprintf( '%02d', $day ) ); ?>"><?php echo esc_html( $day ); ?></option>
												<?php endfor; ?>
											</select>
											<select data-rnta-birth-year>
												<option value=""><?php esc_html_e('Year', 'rockntiara-experiences'); ?></option>
												<?php for ( $year = (int) gmdate( 'Y' ); $year >= ((int) gmdate( 'Y' ) - 18); $year-- ) : ?>
													<option value="<?php echo esc_attr( $year ); ?>"><?php echo esc_html( $year ); ?></option>
												<?php endfor; ?>
											</select>
										</div>
									</div>
								</div>
							</div>
							<div class="rnta-book-now-builder__subsection">
								<div class="rnta-book-now-builder__subheading">
									<span class="rnta-book-now-builder__subeyebrow"><?php esc_html_e('Availability', 'rockntiara-experiences'); ?></span>
									<h4><?php esc_html_e('Choose your preferred date and start time', 'rockntiara-experiences'); ?></h4>
								</div>
								<input id="rnta_preferred_party_date" name="rnta_preferred_party_date" type="hidden" required>
								<div class="rnta-book-now-builder__availability-shell">
									<div class="rnta-book-now-builder__availability">
										<?php echo do_shortcode( '[rnta_availability_calendar months="12" single_month="yes" title="Choose your preferred party date"]' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
									</div>
									<div class="rnta-book-now-builder__field rnta-book-now-builder__availability-aside">
										<label for="rnta_preferred_party_time"><?php esc_html_e('Preferred start time', 'rockntiara-experiences'); ?></label>
										<input id="rnta_preferred_party_time" name="rnta_preferred_party_time" type="hidden" required data-rnta-time-hidden>
										<div class="rnta-book-now-builder__slot-picker">
											<div class="rnta-book-now-builder__slot-head">
												<strong><?php esc_html_e( 'Available fixed party start times', 'rockntiara-experiences' ); ?></strong>
												<span data-rnta-slot-selected><?php esc_html_e( 'Choose a date first', 'rockntiara-experiences' ); ?></span>
											</div>
											<div class="rnta-book-now-builder__slot-grid" data-rnta-slot-grid></div>
											<p class="rnta-book-now-builder__slot-message" data-rnta-slot-message><?php esc_html_e( 'Tap a date on the calendar to load available start times.', 'rockntiara-experiences' ); ?></p>
										</div>
									</div>
								</div>
								<div class="rnta-book-now-builder__field rnta-book-now-builder__field--full">
									<label for="rnta_reservation_notes"><?php esc_html_e('Planning notes', 'rockntiara-experiences'); ?> <span class="rnta-book-now-builder__field-hint"><?php esc_html_e('(allergies, preferences, accessibility, special requests)', 'rockntiara-experiences'); ?></span></label>
									<textarea id="rnta_reservation_notes" name="rnta_reservation_notes" rows="4" placeholder="<?php esc_attr_e('Share anything we should know about your celebration.', 'rockntiara-experiences'); ?>"></textarea>
								</div>
							</div>
						</div>
					</section>

					<section class="rnta-book-now-builder__section rnta-book-now-builder__section--quote">
						<div class="rnta-book-now-builder__heading">
							<span class="rnta-book-now-builder__eyebrow"><?php esc_html_e('Step 7', 'rockntiara-experiences'); ?></span>
							<h3><?php esc_html_e('Estimated celebration total', 'rockntiara-experiences'); ?></h3>
						</div>
						<div class="rnta-book-now-builder__quote-box" data-rnta-quote-box></div>
						<div data-rnta-booking-validation-summary style="margin-top: 16px;"></div>
								<div class="rnta-book-now-builder__actions">
							<button type="submit" class="rnta-book-now-builder__btn rnta-book-now-builder__btn--primary" data-rnta-submit-action="reserve"><?php esc_html_e('Reserve with $200 Deposit', 'rockntiara-experiences'); ?></button>
							<button type="submit" class="rnta-book-now-builder__btn rnta-book-now-builder__btn--secondary" data-rnta-submit-action="quote"><?php esc_html_e('Request Full Quote', 'rockntiara-experiences'); ?></button>
						</div>
					</section>
				</form>
			</div>
			<?php
			return ob_get_clean();
		} catch (\Throwable $e) {
			error_log('Rock N Tiara Book Now builder error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
			if (current_user_can('manage_options')) {
				return '<div style="padding:16px;border:1px solid #f3c9d8;border-radius:18px;background:#fff6f8;color:#b53968;font:600 14px/1.5 Arial,sans-serif;">Book Now builder error: ' . esc_html($e->getMessage()) . ' (line ' . absint($e->getLine()) . ')</div>';
			}
			return '';
		}
	}

	private function is_elementor_editor_context() {
		if (did_action('elementor/loaded') && class_exists('\Elementor\Plugin')) {
			$plugin = \Elementor\Plugin::$instance;
			if ($plugin && isset($plugin->editor) && method_exists($plugin->editor, 'is_edit_mode') && $plugin->editor->is_edit_mode()) {
				return true;
			}

			if ($plugin && isset($plugin->preview) && method_exists($plugin->preview, 'is_preview_mode') && $plugin->preview->is_preview_mode()) {
				return true;
			}
		}

		return false;
	}

	public function render_shortcode($atts) {
		$atts = shortcode_atts(
			array(
				'type'            => 'party',
				'featured'        => '',
				'limit'           => -1,
				'columns'         => 3,
				'ids'             => '',
				'orderby'         => 'menu_order',
				'order'           => 'ASC',
				'show_price'      => 'yes',
				'show_badge'      => 'yes',
				'show_age'        => 'yes',
				'show_duration'   => 'yes',
				'show_details'    => 'yes',
				'show_conditions' => 'yes',
				'view'            => 'full',
				'modal'           => 'no',
				'primary_action'  => 'reserve',
				'details_label'   => 'See More',
				'per_page'        => 0,
				'filters'         => 'no',
				'pager'           => 'no',
				'search_label'    => __('Search experiences', 'rockntiara-experiences'),
				'search_placeholder' => __('Search by name, keyword, includes, price...', 'rockntiara-experiences'),
				'class'           => '',
			),
			$atts,
			'rnta_experiences'
		);

		$query_args = array(
			'post_type'      => self::POST_TYPE,
			'post_status'    => 'publish',
			'posts_per_page' => (int) $atts['limit'],
			'order'          => ('DESC' === strtoupper($atts['order'])) ? 'DESC' : 'ASC',
		);

		if (!empty($atts['ids'])) {
			$ids = array_filter(array_map('absint', explode(',', $atts['ids'])));
			if (!empty($ids)) {
				$query_args['post__in'] = $ids;
				$query_args['orderby']  = 'post__in';
			}
		} else {
			if ('menu_order' === $atts['orderby']) {
				$query_args['orderby'] = array('menu_order' => $query_args['order'], 'title' => 'ASC');
			} else {
				$query_args['orderby'] = sanitize_key($atts['orderby']);
			}
		}

		if (!empty($atts['type']) && 'all' !== $atts['type']) {
			$query_args['tax_query'] = array(
				array(
					'taxonomy' => self::TAXONOMY,
					'field'    => 'slug',
					'terms'    => sanitize_title($atts['type']),
				),
			);
		}

		if ('' !== $atts['featured']) {
			$query_args['meta_query'] = array(
				array(
					'key'   => '_rnta_featured',
					'value' => ('yes' === strtolower($atts['featured']) || '1' === $atts['featured']) ? '1' : '',
				),
			);
		}

		$query = new WP_Query($query_args);
		if (!$query->have_posts()) {
			return '';
		}

		$this->print_assets_once();

		$columns = max(1, min(4, absint($atts['columns'])));
		$per_page = max(0, absint($atts['per_page']));
		$show_filters = in_array(strtolower((string) $atts['filters']), array('1', 'yes', 'true', 'on'), true);
		$show_pager = $per_page > 0 && in_array(strtolower((string) $atts['pager']), array('1', 'yes', 'true', 'on'), true);
		$browser_id = 'rnta-experiences-browser-' . wp_unique_id();
		$classes = trim(
			'rnta-experiences-grid rnta-experiences-grid--cols-' . $columns .
			('compact' === $atts['view'] ? ' rnta-experiences-grid--compact' : '') .
			' ' . sanitize_html_class($atts['class'])
		);

		ob_start();
		?>
		<div
			id="<?php echo esc_attr($browser_id); ?>"
			class="rnta-experiences-browser<?php echo $show_filters ? ' rnta-experiences-browser--filterable' : ''; ?>"
			data-rnta-experiences-browser
			data-rnta-per-page="<?php echo esc_attr($per_page); ?>"
		>
			<?php if ($show_filters) : ?>
				<div class="rnta-experiences-browser__toolbar">
					<label class="rnta-experiences-browser__search" for="<?php echo esc_attr($browser_id); ?>-search">
						<span><?php echo esc_html($atts['search_label']); ?></span>
						<input
							id="<?php echo esc_attr($browser_id); ?>-search"
							type="search"
							placeholder="<?php echo esc_attr($atts['search_placeholder']); ?>"
							autocomplete="off"
							data-rnta-experiences-search
						>
					</label>
					<div class="rnta-experiences-browser__summary" data-rnta-experiences-summary></div>
				</div>
			<?php endif; ?>

			<div class="<?php echo esc_attr($classes); ?>" data-rnta-experiences-grid>
				<?php
				while ($query->have_posts()) :
					$query->the_post();
					echo $this->render_card(get_the_ID(), $atts); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				endwhile;
				?>
			</div>

			<div class="rnta-experiences-browser__empty" data-rnta-experiences-empty hidden>
				<?php esc_html_e('No experiences matched that search. Try a different keyword.', 'rockntiara-experiences'); ?>
			</div>

			<?php if ($show_pager) : ?>
				<div class="rnta-experiences-browser__pager" data-rnta-experiences-pager>
					<button type="button" class="rnta-experiences-browser__pager-btn" data-rnta-experiences-prev><?php esc_html_e('Previous', 'rockntiara-experiences'); ?></button>
					<span class="rnta-experiences-browser__pager-status" data-rnta-experiences-page-status></span>
					<button type="button" class="rnta-experiences-browser__pager-btn" data-rnta-experiences-next><?php esc_html_e('Next', 'rockntiara-experiences'); ?></button>
				</div>
			<?php endif; ?>
		</div>
		<?php if ('yes' === strtolower($atts['modal'])) : ?>
			<div class="rnta-experience-modal-root" data-rnta-modal-root hidden>
				<div class="rnta-experience-modal-backdrop" data-rnta-modal-close></div>
				<div class="rnta-experience-modal-shell" role="dialog" aria-modal="true" aria-label="Experience details">
					<button class="rnta-experience-modal-close" type="button" aria-label="Close details" data-rnta-modal-close>&times;</button>
					<div class="rnta-experience-modal-content" data-rnta-modal-content></div>
				</div>
			</div>

			<div class="rnta-experience-modal-templates" hidden>
				<?php
				$query->rewind_posts();
				while ($query->have_posts()) :
					$query->the_post();
					echo $this->render_modal(get_the_ID()); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				endwhile;
				?>
			</div>
		<?php endif; ?>
		<?php
		wp_reset_postdata();

		return ob_get_clean();
	}

	private function get_card_filter_text($post_id, $meta, $type_slug) {
		$pieces = array(
			get_the_title($post_id),
			$type_slug,
			$meta['badge'],
			$meta['age_label'],
			$meta['display_price'],
			$meta['duration'],
			$meta['short_description'],
			$meta['includes'],
			$meta['conditions'],
			$meta['capacity_note'],
			$meta['availability_note'],
			$meta['pricing_model'],
		);

		return trim(wp_strip_all_tags(html_entity_decode(implode(' ', array_filter($pieces)), ENT_QUOTES, get_bloginfo('charset'))));
	}

	private function render_card($post_id, $atts) {
		$meta       = $this->get_meta($post_id);
		$type_terms = get_the_terms($post_id, self::TAXONOMY);
		$type_slug  = (!empty($type_terms) && !is_wp_error($type_terms)) ? $type_terms[0]->slug : 'party';
		$title      = get_the_title($post_id);
		$image      = get_the_post_thumbnail_url($post_id, 'large');
		$image      = $image ? $image : 'https://lightslategrey-scorpion-689196.hostingersite.com/wp-content/uploads/2026/07/rockntiara-logo-pink.png';
		$includes   = $this->explode_lines($meta['includes']);
		$page_url   = !empty($meta['page_url']) ? $meta['page_url'] : '';
		$booking_url = $this->build_reserve_url($post_id);

		$view = strtolower($atts['view']);
		$primary_action = strtolower($atts['primary_action']);

		ob_start();
		?>
		<article class="rnta-experience-card rnta-experience-card--<?php echo esc_attr($type_slug); ?><?php echo 'compact' === $view ? ' rnta-experience-card--compact' : ''; ?>" data-experience-id="<?php echo esc_attr($post_id); ?>" data-rnta-filter-text="<?php echo esc_attr($this->get_card_filter_text($post_id, $meta, $type_slug)); ?>">
			<div class="rnta-experience-card__media">
				<img src="<?php echo esc_url($image); ?>" alt="<?php echo esc_attr($title); ?>">
			</div>

			<div class="rnta-experience-card__body">
				<h3 class="rnta-experience-card__title"><?php echo esc_html($title); ?></h3>

				<?php if (!empty($meta['short_description']) && 'compact' !== $view) : ?>
					<p class="rnta-experience-card__description"><?php echo esc_html($meta['short_description']); ?></p>
				<?php endif; ?>

				<div class="rnta-experience-card__facts">
					<?php if ('yes' === strtolower($atts['show_price']) && !empty($meta['display_price'])) : ?>
						<span><strong><?php esc_html_e('Price:', 'rockntiara-experiences'); ?></strong> <?php echo esc_html($meta['display_price']); ?></span>
					<?php endif; ?>
					<?php if ('addon' === $type_slug && !empty($meta['pricing_model'])) : ?>
						<span><strong><?php esc_html_e('Pricing:', 'rockntiara-experiences'); ?></strong> <?php echo esc_html($this->get_pricing_model_label($meta['pricing_model'])); ?></span>
					<?php endif; ?>
					<?php if ('yes' === strtolower($atts['show_duration']) && !empty($meta['duration'])) : ?>
						<span><strong><?php esc_html_e('Duration:', 'rockntiara-experiences'); ?></strong> <?php echo esc_html($meta['duration']); ?></span>
					<?php endif; ?>
					<?php if ('yes' === strtolower($atts['show_age']) && !empty($meta['age_label']) && 'compact' !== $view) : ?>
						<span><strong><?php esc_html_e('Best for:', 'rockntiara-experiences'); ?></strong> <?php echo esc_html($meta['age_label']); ?></span>
					<?php endif; ?>
				</div>

				<?php if (!empty($includes)) : ?>
					<div class="rnta-experience-card__details">
						<div class="rnta-experience-card__group">
							<h4><?php esc_html_e('Includes', 'rockntiara-experiences'); ?></h4>
							<ul>
								<?php foreach ($includes as $item) : ?>
									<li><?php echo esc_html($item); ?></li>
								<?php endforeach; ?>
							</ul>
						</div>
					</div>
				<?php endif; ?>

				<div class="rnta-experience-card__actions">
					<?php if ('details' === $primary_action && 'yes' === strtolower($atts['modal'])) : ?>
						<button class="rnta-experience-card__btn rnta-experience-card__btn--primary" type="button" data-rnta-modal-open="<?php echo esc_attr($post_id); ?>">
							<?php echo esc_html($atts['details_label']); ?>
						</button>
					<?php else : ?>
						<a class="rnta-experience-card__btn rnta-experience-card__btn--primary" href="<?php echo esc_url($booking_url); ?>">
							<?php echo esc_html(!empty($meta['reserve_label']) ? $meta['reserve_label'] : __('Reserve Now', 'rockntiara-experiences')); ?>
						</a>
					<?php endif; ?>

					<?php if (!empty($page_url) && 'compact' !== $view) : ?>
						<a class="rnta-experience-card__btn rnta-experience-card__btn--secondary" href="<?php echo esc_url($page_url); ?>">
							<?php esc_html_e('View Details', 'rockntiara-experiences'); ?>
						</a>
					<?php endif; ?>
				</div>
			</div>
		</article>
		<?php

		return ob_get_clean();
	}

	private function render_modal($post_id) {
		$meta       = $this->get_meta($post_id);
		$title      = get_the_title($post_id);
		$image      = get_the_post_thumbnail_url($post_id, 'large');
		$image      = $image ? $image : 'https://lightslategrey-scorpion-689196.hostingersite.com/wp-content/uploads/2026/07/rockntiara-logo-pink.png';
		$includes   = $this->explode_lines($meta['includes']);
		$conditions = $this->explode_lines($meta['conditions']);
		$booking_url = $this->build_reserve_url($post_id);

		ob_start();
		?>
		<template data-rnta-modal-template="<?php echo esc_attr($post_id); ?>">
			<div class="rnta-experience-modal-card">
				<div class="rnta-experience-modal-card__media">
					<img src="<?php echo esc_url($image); ?>" alt="<?php echo esc_attr($title); ?>">
				</div>
				<div class="rnta-experience-modal-card__body">
					<?php if (!empty($meta['badge_text'])) : ?>
					<div class="rnta-experience-modal-card__meta">
						<?php if (!empty($meta['badge_text'])) : ?>
							<span class="rnta-experience-card__badge"><?php echo esc_html($meta['badge_text']); ?></span>
						<?php endif; ?>
					</div>
					<?php endif; ?>

					<h3 class="rnta-experience-modal-card__title"><?php echo esc_html($title); ?></h3>

					<div class="rnta-experience-modal-card__facts">
						<?php if (!empty($meta['display_price'])) : ?>
							<span><strong><?php esc_html_e('Price:', 'rockntiara-experiences'); ?></strong> <?php echo esc_html($meta['display_price']); ?></span>
						<?php endif; ?>
						<?php if (!empty($meta['pricing_model']) && 'fixed' !== $meta['pricing_model']) : ?>
							<span><strong><?php esc_html_e('Pricing:', 'rockntiara-experiences'); ?></strong> <?php echo esc_html($this->get_pricing_model_label($meta['pricing_model'])); ?></span>
						<?php endif; ?>
						<?php if (!empty($meta['duration'])) : ?>
							<span><strong><?php esc_html_e('Duration:', 'rockntiara-experiences'); ?></strong> <?php echo esc_html($meta['duration']); ?></span>
						<?php endif; ?>
						<?php if (!empty($meta['age_label'])) : ?>
							<span><strong><?php esc_html_e('Best for:', 'rockntiara-experiences'); ?></strong> <?php echo esc_html($meta['age_label']); ?></span>
						<?php endif; ?>
					</div>

					<?php if (!empty($meta['short_description'])) : ?>
						<p class="rnta-experience-modal-card__description"><?php echo esc_html($meta['short_description']); ?></p>
					<?php endif; ?>

					<?php if (!empty($includes)) : ?>
						<div class="rnta-experience-modal-card__group">
							<h4><?php esc_html_e('Includes', 'rockntiara-experiences'); ?></h4>
							<ul>
								<?php foreach ($includes as $item) : ?>
									<li><?php echo esc_html($item); ?></li>
								<?php endforeach; ?>
							</ul>
						</div>
					<?php endif; ?>

					<?php if (!empty($conditions)) : ?>
						<div class="rnta-experience-modal-card__group">
							<h4><?php esc_html_e('Conditions', 'rockntiara-experiences'); ?></h4>
							<ul>
								<?php foreach ($conditions as $item) : ?>
									<li><?php echo esc_html($item); ?></li>
								<?php endforeach; ?>
							</ul>
						</div>
					<?php endif; ?>

					<?php if (!empty($meta['capacity_note'])) : ?>
						<div class="rnta-experience-modal-card__group">
							<h4><?php esc_html_e('Capacity', 'rockntiara-experiences'); ?></h4>
							<p class="rnta-experience-modal-card__description"><?php echo esc_html($meta['capacity_note']); ?></p>
						</div>
					<?php endif; ?>

					<?php if (!empty($meta['availability_note'])) : ?>
						<div class="rnta-experience-modal-card__group">
							<h4><?php esc_html_e('Booking Note', 'rockntiara-experiences'); ?></h4>
							<p class="rnta-experience-modal-card__description"><?php echo esc_html($meta['availability_note']); ?></p>
						</div>
					<?php endif; ?>

					<div class="rnta-experience-modal-card__actions">
						<a class="rnta-experience-card__btn rnta-experience-card__btn--primary" href="<?php echo esc_url($booking_url); ?>">
							<?php echo esc_html(!empty($meta['reserve_label']) ? $meta['reserve_label'] : __('Reserve Now', 'rockntiara-experiences')); ?>
						</a>
					</div>
				</div>
			</div>
		</template>
		<?php

		return ob_get_clean();
	}

	public function handle_book_now_submission() {
		if ('POST' !== $_SERVER['REQUEST_METHOD']) {
			return;
		}

		if (empty($_POST['rnta_book_now_action'])) {
			return;
		}

		if (!isset($_POST['rnta_book_now_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['rnta_book_now_nonce'])), 'rnta_book_now_submit')) {
			return;
		}

		$action = sanitize_key(wp_unslash($_POST['rnta_book_now_action']));
		$data   = $this->sanitize_book_now_payload($_POST);
		$error  = $this->validate_book_now_payload($data);

		if (!empty($error)) {
			$redirect = add_query_arg('rnta_quote_error', rawurlencode($error), wp_get_referer() ? wp_get_referer() : home_url('/book-now/'));
			wp_safe_redirect($redirect);
			exit;
		}

		if ('reserve' === $action) {
			$this->handle_book_now_reserve($data);
		}

		if ('quote' === $action) {
			$this->handle_book_now_quote_request($data);
		}
	}

	private function handle_book_now_reserve($data) {
		if (!function_exists('WC') || !WC() || !WC()->cart) {
			wp_safe_redirect(add_query_arg('rnta_quote_error', rawurlencode(__('WooCommerce is not ready yet. Please try again.', 'rockntiara-experiences')), home_url('/book-now/')));
			exit;
		}

		$deposit_product_id = $this->get_deposit_product_id();
		if ($deposit_product_id <= 0) {
			wp_safe_redirect(add_query_arg('rnta_quote_error', rawurlencode(__('Deposit product is not configured yet.', 'rockntiara-experiences')), home_url('/book-now/')));
			exit;
		}

		if (function_exists('wc_clear_notices')) {
			wc_clear_notices();
		}

		foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
			if (!empty($cart_item['product_id']) && absint($cart_item['product_id']) === $deposit_product_id) {
				WC()->cart->remove_cart_item($cart_item_key);
			}
		}

		$added = WC()->cart->add_to_cart(
			$deposit_product_id,
			1,
			0,
			array(),
			array(
				'rnta_reservation' => $data,
			)
		);

		if (!$added) {
			if (function_exists('wc_clear_notices')) {
				wc_clear_notices();
			}

			wp_safe_redirect(add_query_arg('rnta_quote_error', rawurlencode(__('We could not prepare the reservation deposit. Please try again.', 'rockntiara-experiences')), home_url('/book-now/')));
			exit;
		}

		if (WC()->session) {
			WC()->session->set('rnta_reservation_data', $data);
		}

		wp_safe_redirect(function_exists('wc_get_checkout_url') ? wc_get_checkout_url() : home_url('/checkout/'));
		exit;
	}

	private function handle_book_now_quote_request($data) {
		$admin_email = get_option('admin_email');
		$subject     = sprintf(__('New Rock N Tiara Quote Request - %s', 'rockntiara-experiences'), $data['party_name']);
		$body        = $this->build_quote_request_email($data);

		wp_mail($admin_email, $subject, $body);

		$redirect = add_query_arg('rnta_quote_requested', 'success', home_url('/book-now/'));
		wp_safe_redirect($redirect);
		exit;
	}

	private function sanitize_book_now_payload($source) {
		$party_id = isset($source['rnta_selected_party_id']) ? absint(wp_unslash($source['rnta_selected_party_id'])) : 0;
		$party_meta = $party_id ? $this->get_meta($party_id) : array();
		$party_name = $party_id ? get_the_title($party_id) : '';
		$duration_minutes = !empty($data['duration_minutes']) ? absint($data['duration_minutes']) : self::PARTY_DURATION_MINUTES;

		$selected_addons = isset($source['rnta_selected_addons']) ? $this->sanitize_id_array(wp_unslash($source['rnta_selected_addons'])) : array();
		$allowed_addons  = isset($party_meta['allowed_addons']) && is_array($party_meta['allowed_addons']) ? array_map('absint', $party_meta['allowed_addons']) : array();
		$included_addons = isset($party_meta['included_addons']) && is_array($party_meta['included_addons']) ? array_map('absint', $party_meta['included_addons']) : array();

		if (!empty($allowed_addons)) {
			$selected_addons = array_values(array_intersect($selected_addons, array_merge($allowed_addons, $included_addons)));
		}

		foreach ($included_addons as $inc_addon_id) {
			if (!in_array($inc_addon_id, $selected_addons, true)) {
				$selected_addons[] = $inc_addon_id;
			}
		}

		$selected_spa_service_names = array();
		if (!empty($source['rnta_selected_spa_service_names']) && is_array($source['rnta_selected_spa_service_names'])) {
			$selected_spa_service_names = array_map('sanitize_text_field', wp_unslash($source['rnta_selected_spa_service_names']));
		}
		if (empty($selected_spa_service_names) && !empty($source['rnta_selected_spa_services'])) {
			$selected_spa_service_names = array_map('sanitize_text_field', explode('|', sanitize_text_field(wp_unslash($source['rnta_selected_spa_services']))));
		}
		$selected_spa_service_names = array_values(array_unique(array_filter($selected_spa_service_names)));

		$internal_service_choices_enabled = !empty($party_meta['enable_internal_service_choices']);
		$spa_service_option_names = $internal_service_choices_enabled && isset($party_meta['spa_service_options']) ? $this->explode_lines($party_meta['spa_service_options']) : array();
		if (!empty($spa_service_option_names)) {
			$allowed_names = array_map('strtolower', $spa_service_option_names);
			$selected_spa_service_names = array_values(
				array_filter(
					$selected_spa_service_names,
					function ($name) use ($allowed_names) {
						return in_array(strtolower($name), $allowed_names, true);
					}
				)
			);
		}

		$selected_spa_services = isset($source['rnta_selected_spa_service_ids']) ? $this->sanitize_id_array(wp_unslash($source['rnta_selected_spa_service_ids'])) : array();
		$allowed_spa_services  = $internal_service_choices_enabled && isset($party_meta['allowed_spa_services']) && is_array($party_meta['allowed_spa_services']) ? array_map('absint', $party_meta['allowed_spa_services']) : array();
		if (!empty($allowed_spa_services)) {
			$selected_spa_services = array_values(array_intersect($selected_spa_services, $allowed_spa_services));
			$selected_spa_service_names = array();
		} elseif (!empty($spa_service_option_names)) {
			$selected_spa_services = array();
		}
		$spa_service_choices_required = $internal_service_choices_enabled && isset($party_meta['spa_services_included_count']) ? absint($party_meta['spa_services_included_count']) : 0;

		$guest_count = isset($source['rnta_guest_count']) ? max(1, absint(wp_unslash($source['rnta_guest_count']))) : 1;
		$included    = isset($party_meta['included_guests']) ? absint($party_meta['included_guests']) : 0;
		$max         = isset($party_meta['max_guests']) ? absint($party_meta['max_guests']) : 0;
		$extra_price = isset($party_meta['extra_guest_price']) ? (float) $party_meta['extra_guest_price'] : 0.0;
		$base_price  = $this->get_experience_numeric_price($party_meta);

		$extra_guest_count = max(0, $guest_count - $included);
		$extra_guest_total = $extra_guest_count * $extra_price;
		$auto_extra_time_threshold = isset($party_meta['auto_extra_time_threshold']) ? absint($party_meta['auto_extra_time_threshold']) : 0;
		$auto_extra_time_addon = isset($party_meta['auto_extra_time_addon']) ? absint($party_meta['auto_extra_time_addon']) : 0;
		if ($auto_extra_time_threshold > 0 && $auto_extra_time_addon > 0 && $guest_count > $auto_extra_time_threshold) {
			$selected_addons = array_values(
				array_filter(
					$selected_addons,
					function ($addon_id) use ($auto_extra_time_addon) {
						return absint($addon_id) === $auto_extra_time_addon || !$this->is_extra_time_addon($addon_id);
					}
				)
			);
			if (!in_array($auto_extra_time_addon, $selected_addons, true)) {
				$selected_addons[] = $auto_extra_time_addon;
			}
		}

		$addons_data = array();
		$addons_total = 0.0;
		$custom_quote_addons = array();
		foreach ($selected_addons as $addon_id) {
			$addon_meta = $this->get_meta($addon_id);
			$model      = !empty($addon_meta['pricing_model']) ? $addon_meta['pricing_model'] : 'fixed';
			$unit_price = $this->get_experience_numeric_price($addon_meta);
			$is_included = in_array(absint($addon_id), $included_addons, true);
			$row_total  = 0.0;
			$duration_minutes += $this->get_extra_time_addon_minutes($addon_id);

			if ($is_included) {
				$row_total = 0.0;
			} elseif ('per_guest' === $model) {
				$row_total = $unit_price * $guest_count;
				$addons_total += $row_total;
			} elseif ('fixed' === $model) {
				$row_total = $unit_price;
				$addons_total += $row_total;
			} else {
				$custom_quote_addons[] = get_the_title($addon_id);
			}

			$addons_data[] = array(
				'id'              => $addon_id,
				'name'            => get_the_title($addon_id),
				'pricing_model'   => $model,
				'display_price'   => $addon_meta['display_price'],
				'unit_price'      => $unit_price,
				'row_total'       => $row_total,
				'requires_contact'=> !empty($addon_meta['requires_contact']) ? '1' : '',
			);
		}

		$estimated_total = $base_price + $extra_guest_total + $addons_total;
		$selected_spa_services_data = array();
		if (!empty($selected_spa_service_names)) {
			foreach ($selected_spa_service_names as $spa_service_name) {
				$selected_spa_services_data[] = array(
					'id'   => 0,
					'name' => $spa_service_name,
				);
			}
		} else {
			foreach ($selected_spa_services as $spa_service_id) {
				if ('spa' !== $this->get_experience_type_slug($spa_service_id)) {
					continue;
				}
				$selected_spa_services_data[] = array(
					'id'   => $spa_service_id,
					'name' => get_the_title($spa_service_id),
				);
			}
		}

		return array(
			'party_id'             => $party_id,
			'party_slug'           => $party_id ? get_post_field('post_name', $party_id) : '',
			'party_name'           => $party_name,
			'party_display_price'  => isset($party_meta['display_price']) ? $party_meta['display_price'] : '',
			'party_base_price'     => $base_price,
			'duration_minutes'     => $duration_minutes,
			'included_guests'      => $included,
			'max_guests'           => $max,
			'extra_guest_price'    => $extra_price,
			'guest_count'          => $guest_count,
			'extra_guest_count'    => $extra_guest_count,
			'extra_guest_total'    => $extra_guest_total,
			'addons_total'         => $addons_total,
			'estimated_total'      => $estimated_total,
			'custom_quote_addons'  => $custom_quote_addons,
			'selected_addons'      => $addons_data,
			'spa_service_choices_required' => $spa_service_choices_required,
			'selected_spa_services' => $selected_spa_services_data,
			'host_first_name'      => isset($source['rnta_host_first_name']) ? sanitize_text_field(wp_unslash($source['rnta_host_first_name'])) : '',
			'host_last_name'       => isset($source['rnta_host_last_name']) ? sanitize_text_field(wp_unslash($source['rnta_host_last_name'])) : '',
			'host_email'           => isset($source['rnta_host_email']) ? sanitize_email(wp_unslash($source['rnta_host_email'])) : '',
			'host_phone'           => isset($source['rnta_host_phone']) ? sanitize_text_field(wp_unslash($source['rnta_host_phone'])) : '',
			'child_name'           => isset($source['rnta_child_name']) ? sanitize_text_field(wp_unslash($source['rnta_child_name'])) : '',
			'child_age'            => isset($source['rnta_child_age']) ? absint(wp_unslash($source['rnta_child_age'])) : 0,
			'child_birthdate'      => isset($source['rnta_child_birthdate']) ? sanitize_text_field(wp_unslash($source['rnta_child_birthdate'])) : '',
			'preferred_party_date' => isset($source['rnta_preferred_party_date']) ? sanitize_text_field(wp_unslash($source['rnta_preferred_party_date'])) : '',
			'preferred_party_time' => isset($source['rnta_preferred_party_time']) ? sanitize_text_field(wp_unslash($source['rnta_preferred_party_time'])) : '',
			'reservation_notes'    => isset($source['rnta_reservation_notes']) ? sanitize_textarea_field(wp_unslash($source['rnta_reservation_notes'])) : '',
		);
	}

	private function validate_book_now_payload($data) {
		if (empty($data['party_id'])) {
			return __('Please choose a party package first.', 'rockntiara-experiences');
		}

		if (empty($data['host_first_name']) || empty($data['host_last_name']) || empty($data['host_email']) || empty($data['host_phone'])) {
			return __('Please complete the host information before continuing.', 'rockntiara-experiences');
		}

		if (empty($data['child_name']) || empty($data['child_age']) || empty($data['preferred_party_date']) || empty($data['preferred_party_time'])) {
			return __('Please complete the child and event details before continuing.', 'rockntiara-experiences');
		}

		if (!empty($data['max_guests']) && $data['guest_count'] > $data['max_guests']) {
			return sprintf(__('This party allows a maximum of %d guests.', 'rockntiara-experiences'), $data['max_guests']);
		}

		if (!empty($data['spa_service_choices_required']) && count($data['selected_spa_services']) !== (int) $data['spa_service_choices_required']) {
			return sprintf(
				__('Please choose exactly %d included spa services for this party.', 'rockntiara-experiences'),
				(int) $data['spa_service_choices_required']
			);
		}

		if (!empty($data['selected_spa_services'])) {
			foreach ($data['selected_spa_services'] as $selected_service) {
				if (empty($selected_service['name'])) {
					return __('Please choose valid included spa services for this party.', 'rockntiara-experiences');
				}
			}
		}

		$availability_error = $this->validate_requested_slot_availability($data);
		if ($availability_error) {
			return $availability_error;
		}

		return '';
	}

	private function validate_requested_slot_availability($data) {
		if (empty($data['preferred_party_date']) || empty($data['preferred_party_time'])) {
			return '';
		}

		$preferred_time = $this->normalize_party_time($data['preferred_party_time']);

		if (!$preferred_time || !in_array($preferred_time, $this->get_fixed_party_start_times(), true)) {
			return __('Please choose one of Rock N Tiara’s fixed party start times: 10:00 AM, 1:00 PM, 4:00 PM, or 7:00 PM.', 'rockntiara-experiences');
		}

		if (!$this->is_party_day($data['preferred_party_date'])) {
			return __('Parties are available Friday, Saturday, and Sunday only. Please choose a weekend party date.', 'rockntiara-experiences');
		}

		$minimum_bookable_date = $this->get_minimum_bookable_date_string();

		if (!empty($minimum_bookable_date) && $data['preferred_party_date'] < $minimum_bookable_date) {
			return sprintf(
				__('Rock N Tiara requires at least %1$d days notice. Please choose %2$s or later.', 'rockntiara-experiences'),
				self::MINIMUM_LEAD_DAYS,
				$this->format_public_date($minimum_bookable_date)
			);
		}

		if (!class_exists('RNTA_Reservations_Block_Repository') || !class_exists('RNTA_Reservations_Conflict_Engine')) {
			return '';
		}

		$duration_minutes = self::PARTY_DURATION_MINUTES;
		$setup_minutes    = self::PARTY_SETUP_BUFFER_MINUTES;
		$cleanup_minutes  = self::PARTY_CLEANUP_BUFFER_MINUTES;

		try {
			$event_start = new DateTimeImmutable($data['preferred_party_date'] . ' ' . $preferred_time . ':00');
		} catch (Exception $e) {
			return __('Please choose a valid party date and start time.', 'rockntiara-experiences');
		}

		$event_end   = $event_start->modify('+' . $duration_minutes . ' minutes');
		$block_start = $event_start->modify('-' . $setup_minutes . ' minutes')->format('Y-m-d H:i:s');
		$block_end   = $event_end->modify('+' . $cleanup_minutes . ' minutes')->format('Y-m-d H:i:s');

		RNTA_Reservations_Conflict_Engine::instance()->refresh_all_reservation_blocks();
		$overlaps = RNTA_Reservations_Block_Repository::instance()->get_overlaps($block_start, $block_end);

		if (!empty($overlaps)) {
			return __('That start time is no longer available. Please choose another date or time.', 'rockntiara-experiences');
		}

		return '';
	}

	private function get_fixed_party_start_times() {
		return array('10:00', '13:00', '16:00', '19:00');
	}

	private function normalize_party_time($time) {
		$time = trim((string) $time);

		if (preg_match('/^\d{1,2}:\d{2}$/', $time)) {
			list($hours, $minutes) = array_map('absint', explode(':', $time));
			if ($hours <= 23 && $minutes <= 59) {
				return sprintf('%02d:%02d', $hours, $minutes);
			}
		}

		return '';
	}

	private function is_party_day($date) {
		$timestamp = strtotime((string) $date);
		if (!$timestamp) {
			return false;
		}

		$weekday = (int) gmdate('N', $timestamp);
		return in_array($weekday, array(5, 6, 7), true);
	}

	private function get_minimum_bookable_date_string() {
		try {
			$today = new DateTimeImmutable('today', wp_timezone());
		} catch (Exception $e) {
			$today = new DateTimeImmutable(current_time('Y-m-d') . ' 00:00:00');
		}

		return $today->modify('+' . self::MINIMUM_LEAD_DAYS . ' days')->format('Y-m-d');
	}

	private function format_public_date($date) {
		$timestamp = strtotime($date);

		if (!$timestamp) {
			return $date;
		}

		return date_i18n('F j, Y', $timestamp);
	}

	public function woocommerce_get_item_data($item_data, $cart_item) {
		if (empty($cart_item['rnta_reservation']) || !is_array($cart_item['rnta_reservation'])) {
			return $item_data;
		}

		$data = $cart_item['rnta_reservation'];
		$item_data[] = array('name' => __('Party', 'rockntiara-experiences'), 'value' => $data['party_name']);
		$item_data[] = array('name' => __('Guest count', 'rockntiara-experiences'), 'value' => $data['guest_count']);

		if (!empty($data['selected_addons'])) {
			$item_data[] = array(
				'name'  => __('Addons', 'rockntiara-experiences'),
				'value' => implode(', ', wp_list_pluck($data['selected_addons'], 'name')),
			);
		}

		if (!empty($data['selected_spa_services'])) {
			$item_data[] = array(
				'name'  => __('Included spa services', 'rockntiara-experiences'),
				'value' => implode(', ', wp_list_pluck($data['selected_spa_services'], 'name')),
			);
		}

		return $item_data;
	}

	public function woocommerce_checkout_create_order_line_item($item, $cart_item_key, $values, $order) {
		if (empty($values['rnta_reservation']) || !is_array($values['rnta_reservation'])) {
			return;
		}

		$data = $values['rnta_reservation'];
		$item->add_meta_data('Party', $data['party_name'], true);
		$item->add_meta_data('Guest Count', $data['guest_count'], true);
		$item->add_meta_data('Child Name', $data['child_name'], true);
		$item->add_meta_data('Preferred Party Date', $data['preferred_party_date'], true);

		if (!empty($data['selected_addons'])) {
			$item->add_meta_data('Addons', implode(', ', wp_list_pluck($data['selected_addons'], 'name')), true);
		}
		if (!empty($data['selected_spa_services'])) {
			$item->add_meta_data('Included Spa Services', implode(', ', wp_list_pluck($data['selected_spa_services'], 'name')), true);
		}
	}

	public function woocommerce_checkout_create_order($order, $data) {
		if (!function_exists('WC') || !WC() || !WC()->session) {
			return;
		}

		$reservation = WC()->session->get('rnta_reservation_data');
		if (empty($reservation) || !is_array($reservation)) {
			return;
		}

		$order->update_meta_data('_rnta_party_id', $reservation['party_id']);
		$order->update_meta_data('_rnta_party_name', $reservation['party_name']);
		$order->update_meta_data('_rnta_guest_count', $reservation['guest_count']);
		$order->update_meta_data('_rnta_extra_guest_count', $reservation['extra_guest_count']);
		$order->update_meta_data('_rnta_extra_guest_total', $reservation['extra_guest_total']);
		$order->update_meta_data('_rnta_estimated_total', $reservation['estimated_total']);
		$order->update_meta_data('_rnta_host_phone', $reservation['host_phone']);
		$order->update_meta_data('_rnta_child_name', $reservation['child_name']);
		$order->update_meta_data('_rnta_child_age', $reservation['child_age']);
		$order->update_meta_data('_rnta_child_birthdate', $reservation['child_birthdate']);
		$order->update_meta_data('_rnta_preferred_party_date', $reservation['preferred_party_date']);
		$order->update_meta_data('_rnta_preferred_party_time', $reservation['preferred_party_time']);
		$order->update_meta_data('_rnta_reservation_notes', $reservation['reservation_notes']);
		$order->update_meta_data('_rnta_selected_addons', wp_json_encode($reservation['selected_addons']));
		$order->update_meta_data('_rnta_selected_spa_services', wp_json_encode($reservation['selected_spa_services']));
		$order->update_meta_data('_rnta_spa_service_choices_required', $reservation['spa_service_choices_required']);
	}

	public function woocommerce_admin_order_data_after_billing_address($order) {
		$party_name = $order->get_meta('_rnta_party_name');
		if (!$party_name) {
			return;
		}

		echo '<div class="order_data_column"><h4>' . esc_html__('Rock N Tiara Reservation', 'rockntiara-experiences') . '</h4>';
		echo '<p><strong>' . esc_html__('Party:', 'rockntiara-experiences') . '</strong> ' . esc_html($party_name) . '</p>';
		echo '<p><strong>' . esc_html__('Guest Count:', 'rockntiara-experiences') . '</strong> ' . esc_html($order->get_meta('_rnta_guest_count')) . '</p>';
		echo '<p><strong>' . esc_html__('Child Name:', 'rockntiara-experiences') . '</strong> ' . esc_html($order->get_meta('_rnta_child_name')) . '</p>';
		echo '<p><strong>' . esc_html__('Preferred Party Date:', 'rockntiara-experiences') . '</strong> ' . esc_html($order->get_meta('_rnta_preferred_party_date')) . '</p>';
		echo '<p><strong>' . esc_html__('Preferred Party Time:', 'rockntiara-experiences') . '</strong> ' . esc_html($order->get_meta('_rnta_preferred_party_time')) . '</p>';
		$selected_spa_services = json_decode((string) $order->get_meta('_rnta_selected_spa_services'), true);
		if (!empty($selected_spa_services) && is_array($selected_spa_services)) {
			echo '<p><strong>' . esc_html__('Included Spa Services:', 'rockntiara-experiences') . '</strong> ' . esc_html(implode(', ', wp_list_pluck($selected_spa_services, 'name'))) . '</p>';
		}
		echo '<p><strong>' . esc_html__('Estimated Total:', 'rockntiara-experiences') . '</strong> $' . esc_html(number_format((float) $order->get_meta('_rnta_estimated_total'), 2)) . '</p>';
		echo '</div>';
	}

	private function build_quote_request_email($data) {
		$lines   = array();
		$lines[] = 'New Rock N Tiara quote request';
		$lines[] = '';
		$lines[] = 'Party: ' . $data['party_name'];
		$lines[] = 'Guest count: ' . $data['guest_count'];
		$lines[] = 'Estimated total: $' . number_format((float) $data['estimated_total'], 2);
		$lines[] = 'Host: ' . $data['host_first_name'] . ' ' . $data['host_last_name'];
		$lines[] = 'Email: ' . $data['host_email'];
		$lines[] = 'Phone: ' . $data['host_phone'];
		$lines[] = 'Child: ' . $data['child_name'] . ' (Age ' . $data['child_age'] . ')';
		$lines[] = 'Birthday: ' . $data['child_birthdate'];
		$lines[] = 'Preferred party date: ' . $data['preferred_party_date'];
		$lines[] = 'Preferred start time: ' . $data['preferred_party_time'];
		$lines[] = 'Notes: ' . $data['reservation_notes'];
		$lines[] = '';
		$lines[] = 'Included spa services selected:';
		if (!empty($data['selected_spa_services'])) {
			foreach ($data['selected_spa_services'] as $service) {
				$lines[] = '- ' . $service['name'];
			}
		} else {
			$lines[] = '- None';
		}
		$lines[] = '';
		$lines[] = 'Selected addons:';
		if (!empty($data['selected_addons'])) {
			foreach ($data['selected_addons'] as $addon) {
				$lines[] = '- ' . $addon['name'] . ' (' . $addon['display_price'] . ')';
			}
		} else {
			$lines[] = '- None';
		}

		if (!empty($data['custom_quote_addons'])) {
			$lines[] = '';
			$lines[] = 'Custom quote addons:';
			foreach ($data['custom_quote_addons'] as $addon_name) {
				$lines[] = '- ' . $addon_name;
			}
		}

		return implode("\n", $lines);
	}

	private function get_frontend_experiences_by_type($type_slug) {
		$query = new WP_Query(
			array(
				'post_type'      => self::POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => array('menu_order' => 'ASC', 'title' => 'ASC'),
				'tax_query'      => array(
					array(
						'taxonomy' => self::TAXONOMY,
						'field'    => 'slug',
						'terms'    => $type_slug,
					),
				),
			)
		);

		$data = array();
		while ($query->have_posts()) {
			$query->the_post();
			$post_id = get_the_ID();
			$meta    = $this->get_meta($post_id);
			$data[$post_id] = array(
				'id'                => $post_id,
				'title'             => get_the_title($post_id),
				'slug'              => get_post_field('post_name', $post_id),
				'image'             => get_the_post_thumbnail_url($post_id, 'large') ? get_the_post_thumbnail_url($post_id, 'large') : 'https://lightslategrey-scorpion-689196.hostingersite.com/wp-content/uploads/2026/07/rockntiara-logo-pink.png',
				'badge_text'        => $meta['badge_text'],
				'display_price'     => $meta['display_price'],
				'base_price'        => $this->get_experience_numeric_price($meta),
				'duration'          => $meta['duration'],
				'duration_minutes'  => self::PARTY_DURATION_MINUTES,
				'short_description' => $meta['short_description'],
				'conditions'        => $this->explode_lines($meta['conditions']),
				'includes'          => $this->explode_lines($meta['includes']),
				'included_guests'   => absint($meta['included_guests']),
				'max_guests'        => absint($meta['max_guests']),
				'extra_guest_price' => (float) $meta['extra_guest_price'],
				'auto_extra_time_threshold' => absint($meta['auto_extra_time_threshold']),
				'auto_extra_time_addon' => absint($meta['auto_extra_time_addon']),
				'capacity_note'     => $meta['capacity_note'],
				'allowed_addons'    => array_map('absint', is_array($meta['allowed_addons']) ? $meta['allowed_addons'] : array()),
				'included_addons'   => array_map('absint', is_array($meta['included_addons']) ? $meta['included_addons'] : array()),
				'enable_internal_service_choices' => !empty($meta['enable_internal_service_choices']),
				'spa_services_included_count' => absint($meta['spa_services_included_count']),
				'spa_service_options' => $this->explode_lines($meta['spa_service_options']),
				'allowed_spa_services' => array_map('absint', is_array($meta['allowed_spa_services']) ? $meta['allowed_spa_services'] : array()),
				'quote_note'        => $meta['quote_note'],
				'pricing_model'     => $meta['pricing_model'],
				'price_number'      => $this->get_experience_numeric_price($meta),
				'requires_contact'  => !empty($meta['requires_contact']),
				'requires_extra_time' => !empty($meta['requires_extra_time']),
				'availability_note' => $meta['availability_note'],
			);
		}
		wp_reset_postdata();

		return $data;
	}

	private function get_experience_numeric_price($meta) {
		if (!empty($meta['base_price'])) {
			return (float) $meta['base_price'];
		}

		if (!empty($meta['display_price'])) {
			$parsed = preg_replace('/[^0-9.\-]/', '', (string) $meta['display_price']);
			return '' !== $parsed ? (float) $parsed : 0.0;
		}

		return 0.0;
	}

	private function get_extra_time_addon_minutes($addon_id) {
		$addon_id = absint($addon_id);
		if (!$addon_id) {
			return 0;
		}

		$text = strtolower(get_the_title($addon_id) . ' ' . get_post_field('post_name', $addon_id));
		if (false !== strpos($text, 'additional-1-hour')
			|| false !== strpos($text, 'additional 1 hour')
			|| false !== strpos($text, 'additional-60')
			|| false !== strpos($text, 'additional 60')
			|| false !== strpos($text, '60 minutes')
			|| false !== strpos($text, '1 hour')) {
			return 60;
		}

		if (false !== strpos($text, 'additional-30')
			|| false !== strpos($text, 'additional 30')
			|| false !== strpos($text, '30 minutes')
			|| false !== strpos($text, '30-minutes')) {
			return 30;
		}

		return 0;
	}

	private function is_extra_time_addon($addon_id) {
		return $this->get_extra_time_addon_minutes($addon_id) > 0;
	}

	private function parse_duration_to_minutes($duration_text) {
		$text = strtolower(trim((string) $duration_text));
		if ($text === '') {
			return 120;
		}

		if (preg_match('/(\d+(?:\.\d+)?)\s*hour/', $text, $matches)) {
			return (int) round(((float) $matches[1]) * 60);
		}

		if (preg_match('/(\d+)\s*min/', $text, $matches)) {
			return (int) $matches[1];
		}

		return 120;
	}

	private function get_deposit_product_id() {
		$options = get_option(self::SETTINGS_KEY, array());
		return isset($options['deposit_product_id']) ? absint($options['deposit_product_id']) : 0;
	}

	private function build_reserve_url($post_id) {
		$type_terms = get_the_terms($post_id, self::TAXONOMY);
		$type_slug  = (!empty($type_terms) && !is_wp_error($type_terms)) ? $type_terms[0]->slug : '';

		if ('spa' === $type_slug) {
			if ( class_exists( 'RNTA_Reservations_Contact_Settings' ) ) {
				$whatsapp_url = RNTA_Reservations_Contact_Settings::whatsapp_url( get_the_title( $post_id ) );
				if ( '' !== $whatsapp_url ) {
					return $whatsapp_url;
				}
			}

			return '#';
		}

		$slug = get_post_field('post_name', $post_id);
		$args = array(
			'experience_id' => $post_id,
			'experience'    => $slug,
		);

		return add_query_arg($args, home_url('/book-now/'));
	}

	private function explode_lines($value) {
		if (empty($value)) {
			return array();
		}

		$lines = preg_split('/\r\n|\r|\n/', $value);
		$lines = array_map('trim', $lines);
		return array_values(array_filter($lines));
	}

	private function get_importable_fields() {
		return array(
			'type'                  => __('Required. party, spa, or addon.', 'rockntiara-experiences'),
			'title'                 => __('Required. Public experience name.', 'rockntiara-experiences'),
			'slug'                  => __('Optional. Used to update existing records safely.', 'rockntiara-experiences'),
			'status'                => __('Optional. publish, draft, pending, private. Defaults to publish when enabled.', 'rockntiara-experiences'),
			'menu_order'            => __('Optional. Controls display order.', 'rockntiara-experiences'),
			'badge_text'            => __('Internal/manual badge text. Optional.', 'rockntiara-experiences'),
			'age_label'             => __('Optional age or audience label.', 'rockntiara-experiences'),
			'display_price'         => __('Public-facing price text, e.g. From $820.', 'rockntiara-experiences'),
			'duration'              => __('Public duration text, e.g. 2 hours.', 'rockntiara-experiences'),
			'short_description'     => __('Short card/modal description.', 'rockntiara-experiences'),
			'includes'              => __('List of included items. Separate with | in CSV.', 'rockntiara-experiences'),
			'conditions'            => __('List of conditions. Separate with | in CSV.', 'rockntiara-experiences'),
			'reserve_label'         => __('Optional CTA text.', 'rockntiara-experiences'),
			'page_url'              => __('Optional page URL.', 'rockntiara-experiences'),
			'reservation_status'    => __('Optional internal status text.', 'rockntiara-experiences'),
			'featured'              => __('1/yes/true to feature.', 'rockntiara-experiences'),
			'base_price'            => __('Numeric party base price used by Book Now quotes.', 'rockntiara-experiences'),
			'included_guests'       => __('Numeric included guest count for parties.', 'rockntiara-experiences'),
			'max_guests'            => __('Numeric maximum guest count for parties.', 'rockntiara-experiences'),
			'extra_guest_price'     => __('Numeric price per additional guest.', 'rockntiara-experiences'),
			'auto_extra_time_threshold' => __('Guest count threshold after which Book Now auto-selects the configured extra-time addon. Example: 15 means 16+ guests.', 'rockntiara-experiences'),
			'auto_extra_time_addon' => __('Addon reference by addon slug, title, or ID to auto-select after the threshold. Example: additional-1-hour.', 'rockntiara-experiences'),
			'capacity_note'         => __('Optional capacity note.', 'rockntiara-experiences'),
			'allowed_addons'        => __('Party addon references by addon slug, title, or ID. Separate with |.', 'rockntiara-experiences'),
			'spa_services_included_count' => __('Number of spa services the host must select for this party.', 'rockntiara-experiences'),
			'spa_service_options'   => __('Atomic spa service options shown in Book Now. Separate with |.', 'rockntiara-experiences'),
			'allowed_spa_services'  => __('Party spa-service references by spa slug, title, or ID. Separate with |. Leave empty to allow all spa services.', 'rockntiara-experiences'),
			'compatible_parties'    => __('Addon party references by party slug, title, or ID. Separate with |.', 'rockntiara-experiences'),
			'quote_note'            => __('Optional quote note.', 'rockntiara-experiences'),
			'pricing_model'         => __('fixed, per_guest, or custom_quote.', 'rockntiara-experiences'),
			'requires_contact'      => __('1/yes/true when manual confirmation is required.', 'rockntiara-experiences'),
			'requires_extra_time'   => __('1/yes/true when extra time is required.', 'rockntiara-experiences'),
			'availability_note'     => __('Optional addon availability/pricing note.', 'rockntiara-experiences'),
			'image_url'             => __('Optional featured image URL. Media-library URLs are reused; remote URLs are sideloaded.', 'rockntiara-experiences'),
		);
	}

	private function parse_import_json($file_path, &$result) {
		$contents = file_get_contents($file_path);
		if (false === $contents) {
			$result['errors'][] = __('Could not read the uploaded JSON file.', 'rockntiara-experiences');
			return array();
		}

		$data = json_decode($contents, true);
		if (JSON_ERROR_NONE !== json_last_error()) {
			$result['errors'][] = sprintf(
				/* translators: %s: JSON error message. */
				__('Invalid JSON: %s', 'rockntiara-experiences'),
				json_last_error_msg()
			);
			return array();
		}

		if (isset($data['experiences']) && is_array($data['experiences'])) {
			return $data['experiences'];
		}

		$records = array();
		$group_map = array(
			'parties'       => 'party',
			'spa_services'  => 'spa',
			'spa'           => 'spa',
			'addons'        => 'addon',
		);

		foreach ($group_map as $group_key => $type) {
			if (empty($data[$group_key]) || !is_array($data[$group_key])) {
				continue;
			}
			foreach ($data[$group_key] as $record) {
				if (is_array($record) && empty($record['type'])) {
					$record['type'] = $type;
				}
				$records[] = $record;
			}
		}

		if (!empty($records)) {
			return $records;
		}

		return is_array($data) && array_is_list($data) ? $data : array();
	}

	private function parse_import_csv($file_path, &$result) {
		$handle = fopen($file_path, 'r');
		if (!$handle) {
			$result['errors'][] = __('Could not read the uploaded CSV file.', 'rockntiara-experiences');
			return array();
		}

		$headers = fgetcsv($handle);
		if (empty($headers)) {
			fclose($handle);
			return array();
		}

		$headers = array_map(
			function ($header) {
				$header = preg_replace('/^\xEF\xBB\xBF/', '', (string) $header);
				return sanitize_key(trim($header));
			},
			$headers
		);

		$records = array();
		$row = 1;
		while (($values = fgetcsv($handle)) !== false) {
			$row++;
			if (1 === count($values) && '' === trim((string) $values[0])) {
				continue;
			}

			$record = array();
			foreach ($headers as $index => $header) {
				if ('' === $header) {
					continue;
				}
				$record[$header] = isset($values[$index]) ? $values[$index] : '';
			}
			$record['_row'] = $row;
			$records[] = $record;
		}

		fclose($handle);
		return $records;
	}

	private function upsert_experience_record($record, $options, $row_number, &$result) {
		if (!is_array($record)) {
			$result['skipped']++;
			$result['errors'][] = sprintf(__('Row %d skipped: record is not an object/row.', 'rockntiara-experiences'), $row_number);
			return null;
		}

		$record = $this->normalize_import_record($record);
		$type = isset($record['type']) ? sanitize_key($record['type']) : '';
		$title = isset($record['title']) ? sanitize_text_field($record['title']) : '';

		if (!in_array($type, array('party', 'spa', 'addon'), true) || '' === $title) {
			$result['skipped']++;
			$result['errors'][] = sprintf(__('Row %d skipped: type and title are required. Type must be party, spa, or addon.', 'rockntiara-experiences'), $row_number);
			return null;
		}

		$slug = !empty($record['slug']) ? sanitize_title($record['slug']) : sanitize_title($title);
		$post_id = $this->find_experience_by_slug($slug);
		$created = false;

		if ($post_id && empty($options['update_existing'])) {
			$result['skipped']++;
			$result['errors'][] = sprintf(__('Row %d skipped: slug "%s" already exists.', 'rockntiara-experiences'), $row_number, $slug);
			return null;
		}

		$status = !empty($record['status']) ? sanitize_key($record['status']) : (!empty($options['publish_imported']) ? 'publish' : 'draft');
		if (!in_array($status, array('publish', 'draft', 'pending', 'private'), true)) {
			$status = !empty($options['publish_imported']) ? 'publish' : 'draft';
		}

		$post_data = array(
			'post_type'   => self::POST_TYPE,
			'post_title'  => $title,
			'post_name'   => $slug,
			'post_status' => $status,
			'menu_order'  => isset($record['menu_order']) ? absint($record['menu_order']) : 0,
		);

		if ($post_id) {
			$post_data['ID'] = $post_id;
			$save_result = wp_update_post($post_data, true);
		} else {
			$save_result = wp_insert_post($post_data, true);
			$created = true;
		}

		if (is_wp_error($save_result)) {
			$result['skipped']++;
			$result['errors'][] = sprintf(__('Row %1$d failed: %2$s', 'rockntiara-experiences'), $row_number, $save_result->get_error_message());
			return null;
		}

		$post_id = absint($save_result);
		wp_set_object_terms($post_id, $type, self::TAXONOMY, false);

		$fields = array(
			'badge_text'         => 'sanitize_text_field',
			'age_label'          => 'sanitize_text_field',
			'display_price'      => 'sanitize_text_field',
			'duration'           => 'sanitize_text_field',
			'short_description'  => 'sanitize_textarea_field',
			'conditions'         => 'sanitize_textarea_field',
			'includes'           => 'sanitize_textarea_field',
			'reserve_label'      => 'sanitize_text_field',
			'page_url'           => 'esc_url_raw',
			'reservation_status' => 'sanitize_text_field',
			'base_price'         => array($this, 'sanitize_decimal_string'),
			'included_guests'    => 'absint',
			'max_guests'         => 'absint',
			'extra_guest_price'  => array($this, 'sanitize_decimal_string'),
			'auto_extra_time_threshold' => 'absint',
			'auto_extra_time_addon' => 'absint',
			'capacity_note'      => 'sanitize_textarea_field',
			'spa_services_included_count' => 'absint',
			'spa_service_options' => 'sanitize_textarea_field',
			'quote_note'         => 'sanitize_textarea_field',
			'pricing_model'      => array($this, 'sanitize_pricing_model'),
			'availability_note'  => 'sanitize_textarea_field',
		);

		foreach ($fields as $field => $sanitizer) {
			if (!array_key_exists($field, $record)) {
				continue;
			}

			$value = $record[$field];
			if (in_array($field, array('conditions', 'includes', 'spa_service_options'), true)) {
				$value = $this->normalize_multiline_import_value($value);
			}
			update_post_meta($post_id, '_rnta_' . $field, call_user_func($sanitizer, $value));
		}

		if (array_key_exists('featured', $record)) {
			update_post_meta($post_id, '_rnta_featured', $this->truthy_import_value($record['featured']) ? '1' : '');
		}
		if (array_key_exists('requires_contact', $record)) {
			update_post_meta($post_id, '_rnta_requires_contact', $this->truthy_import_value($record['requires_contact']) ? '1' : '');
		}
		if (array_key_exists('requires_extra_time', $record)) {
			update_post_meta($post_id, '_rnta_requires_extra_time', $this->truthy_import_value($record['requires_extra_time']) ? '1' : '');
		}

		if (!empty($record['image_url'])) {
			$this->set_featured_image_from_url($post_id, esc_url_raw($record['image_url']), $result);
		}

		return array(
			'post_id'                => $post_id,
			'created'                => $created,
			'allowed_addons_raw'     => isset($record['allowed_addons']) ? $record['allowed_addons'] : '',
			'auto_extra_time_addon_raw' => isset($record['auto_extra_time_addon']) ? $record['auto_extra_time_addon'] : '',
			'allowed_spa_services_raw' => isset($record['allowed_spa_services']) ? $record['allowed_spa_services'] : '',
			'allowed_spa_services_provided' => array_key_exists('allowed_spa_services', $record),
			'compatible_parties_raw' => isset($record['compatible_parties']) ? $record['compatible_parties'] : '',
		);
	}

	private function normalize_import_record($record) {
		$normalized = array();

		foreach ($record as $key => $value) {
			$key = sanitize_key((string) $key);
			if ('_row' === $key || '' === $key) {
				continue;
			}
			$normalized[$key] = is_scalar($value) ? trim((string) $value) : $value;
		}

		return $normalized;
	}

	private function normalize_multiline_import_value($value) {
		if (is_array($value)) {
			$value = implode("\n", array_map('trim', $value));
		}

		$value = (string) $value;
		$value = str_replace(array("\r\n", "\r"), "\n", $value);
		$value = str_replace('|', "\n", $value);

		$lines = array_filter(array_map('trim', explode("\n", $value)));
		return implode("\n", $lines);
	}

	private function truthy_import_value($value) {
		if (is_bool($value)) {
			return $value;
		}

		return in_array(strtolower(trim((string) $value)), array('1', 'yes', 'true', 'y', 'si', 'sí', 'on'), true);
	}

	private function find_experience_by_slug($slug) {
		$post = get_page_by_path($slug, OBJECT, self::POST_TYPE);
		return $post ? absint($post->ID) : 0;
	}

	private function resolve_experience_references($raw_value, $type_slug) {
		$tokens = $this->split_import_reference_list($raw_value);
		$ids = array();

		foreach ($tokens as $token) {
			if (is_numeric($token)) {
				$post_id = absint($token);
				if ($post_id && self::POST_TYPE === get_post_type($post_id)) {
					$ids[] = $post_id;
				}
				continue;
			}

			$slug = sanitize_title($token);
			$post_id = $this->find_experience_by_slug($slug);
			if (!$post_id) {
				$query = new WP_Query(
					array(
						'post_type'      => self::POST_TYPE,
						'post_status'    => array('publish', 'draft', 'pending', 'private'),
						'title'          => sanitize_text_field($token),
						'posts_per_page' => 1,
						'fields'         => 'ids',
						'tax_query'      => array(
							array(
								'taxonomy' => self::TAXONOMY,
								'field'    => 'slug',
								'terms'    => $type_slug,
							),
						),
					)
				);
				$post_id = !empty($query->posts[0]) ? absint($query->posts[0]) : 0;
			}

			if ($post_id) {
				$ids[] = $post_id;
			}
		}

		return array_values(array_unique(array_filter($ids)));
	}

	private function split_import_reference_list($raw_value) {
		if (is_array($raw_value)) {
			$tokens = $raw_value;
		} else {
			$tokens = preg_split('/\s*[|,]\s*|\r\n|\r|\n/', (string) $raw_value);
		}

		return array_values(array_filter(array_map('trim', $tokens)));
	}

	private function set_featured_image_from_url($post_id, $image_url, &$result) {
		if (empty($image_url)) {
			return;
		}

		$attachment_id = attachment_url_to_postid($image_url);

		if (!$attachment_id && filter_var($image_url, FILTER_VALIDATE_URL)) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/media.php';
			require_once ABSPATH . 'wp-admin/includes/image.php';

			$sideloaded = media_sideload_image($image_url, $post_id, null, 'id');
			if (is_wp_error($sideloaded)) {
				$result['errors'][] = sprintf(
					__('Image import warning for post #%1$d: %2$s', 'rockntiara-experiences'),
					$post_id,
					$sideloaded->get_error_message()
				);
				return;
			}

			$attachment_id = absint($sideloaded);
		}

		if ($attachment_id) {
			set_post_thumbnail($post_id, $attachment_id);
		}
	}

	private function redirect_after_import($result) {
		set_transient('rnta_experiences_import_result_' . get_current_user_id(), $result, MINUTE_IN_SECONDS);
		wp_safe_redirect(admin_url('edit.php?post_type=' . self::POST_TYPE . '&page=rnta-experience-bulk-import&import_done=1'));
		exit;
	}

	private function sanitize_decimal_string($value) {
		$value = is_scalar($value) ? (string) $value : '';
		$value = preg_replace('/[^0-9.\-]/', '', $value);
		return '' !== $value ? $value : '';
	}

	private function sanitize_pricing_model($value) {
		$value = sanitize_key($value);
		$options = array_keys($this->get_pricing_model_options());
		return in_array($value, $options, true) ? $value : 'fixed';
	}

	private function sanitize_id_array($values) {
		if (!is_array($values)) {
			return array();
		}

		$values = array_filter(array_map('absint', $values));
		return array_values(array_unique($values));
	}

	private function get_experience_type_slug($post_id) {
		$terms = wp_get_post_terms(absint($post_id), self::TAXONOMY, array('fields' => 'slugs'));
		if (is_wp_error($terms) || empty($terms)) {
			return '';
		}

		return (string) reset($terms);
	}

	private function get_experience_posts_by_type($type_slug) {
		$posts = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'post_status'    => array('publish', 'draft', 'pending', 'future', 'private'),
				'posts_per_page' => -1,
				'orderby'        => array('menu_order' => 'ASC', 'title' => 'ASC'),
				'tax_query'      => array(
					array(
						'taxonomy' => self::TAXONOMY,
						'field'    => 'slug',
						'terms'    => $type_slug,
					),
				),
			)
		);

		$options = array();
		foreach ($posts as $post) {
			$options[$post->ID] = $post->post_title . ' (#' . $post->ID . ')';
		}

		return $options;
	}

	private function get_pricing_model_options() {
		return array(
			'fixed'        => __('Fixed price', 'rockntiara-experiences'),
			'per_guest'    => __('Per guest', 'rockntiara-experiences'),
			'custom_quote' => __('Custom quote', 'rockntiara-experiences'),
		);
	}

	private function get_pricing_model_label($value) {
		$options = $this->get_pricing_model_options();
		return isset($options[$value]) ? $options[$value] : $options['fixed'];
	}

	private function print_book_now_assets_once() {
		static $printed = false;
		if ($printed) {
			return;
		}
		$printed = true;
		?>
		<style>
			.rnta-book-now-builder,
			.rnta-book-now-builder * { box-sizing: border-box; }
			.rnta-book-now-builder {
				--rnta-pink: #ed4f8f;
				--rnta-plum: #452c35;
				--rnta-muted: #856b76;
				--rnta-border: rgba(237,79,143,.18);
				display: grid;
				gap: 24px;
				width: min(100% - 40px, 1200px);
				margin: 0 auto;
			}
			.rnta-book-now-builder__form { display:grid; gap:24px; }
			.rnta-book-now-builder__section {
				padding: clamp(22px, 3vw, 32px);
				border: 1px solid var(--rnta-border);
				border-radius: 30px;
				background: linear-gradient(180deg, rgba(255,255,255,.94), rgba(255,248,251,.92));
				box-shadow: 0 18px 40px rgba(69,44,53,.05);
			}
			.rnta-book-now-builder__heading { display:grid; gap:10px; margin-bottom:18px; }
			.rnta-book-now-builder__heading h3 {
				margin:0;
				color: var(--rnta-pink);
				font-family: var(--rt-font-script, "Great Vibes", "GreatVibes", cursive) !important;
				font-size: clamp(36px, 4vw, 58px);
				font-weight: 400;
				line-height: .98;
			}
			.rnta-book-now-builder__eyebrow {
				display:inline-flex;
				align-items:center;
				justify-content:center;
				width: fit-content;
				min-height: 38px;
				padding: 0 14px;
				border-radius: 999px;
				border: 1px solid rgba(237,79,143,.22);
				background: #fff6fa;
				color: var(--rnta-pink);
				font: 700 12px/1 "Quicksand", sans-serif;
				letter-spacing: .04em;
				text-transform: uppercase;
			}
			.rnta-book-now-builder__message {
				padding: 16px 18px;
				border-radius: 20px;
				font: 600 14px/1.5 "Quicksand", sans-serif;
			}
			.rnta-book-now-builder__message--success { background: #f2fff7; color: #2e7d4b; border: 1px solid #cbe8d7; }
			.rnta-book-now-builder__message--error { background: #fff6f8; color: #b53968; border: 1px solid #f3c9d8; }
			.rnta-book-now-builder__party-select label,
			.rnta-book-now-builder__field label {
				display:block;
				margin-bottom:8px;
				color: var(--rta-pink);
				font: 700 13px/1.2 "Quicksand", sans-serif;
				letter-spacing: .04em;
				text-transform: uppercase;
			}
			.rnta-book-now-builder select,
			.rnta-book-now-builder input,
			.rnta-book-now-builder textarea {
				width:100%;
				min-height: 56px;
				padding: 14px 16px;
				border: 1.5px solid rgba(237,79,143,.22);
				border-radius: 20px;
				background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(255,248,251,.98));
				color: var(--rnta-plum);
				font: 500 15px/1.45 "Quicksand", sans-serif;
				box-shadow: inset 0 1px 0 rgba(255,255,255,.72), 0 10px 24px rgba(69,44,53,.04);
			}
			.rnta-book-now-builder textarea { min-height: 150px; resize: vertical; }
			.rnta-book-now-builder__party-card {
				display:grid;
				grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
				gap: 24px;
				align-items: stretch;
			}
			.rnta-book-now-builder__party-media img {
				display:block; width:100%; height:100%; object-fit:cover; border-radius:24px;
				min-height: 280px;
			}
			.rnta-book-now-builder__party-content { display:grid; gap:14px; }
			.rnta-book-now-builder__party-includes {
				margin-top: 6px;
				padding: 16px 18px;
				background: rgba(237, 79, 143, 0.04);
				border: 1px solid rgba(237, 79, 143, 0.14);
				border-radius: 18px;
			}
			.rnta-book-now-builder__party-includes-title {
				margin: 0 0 10px;
				color: var(--rnta-plum);
				font: 700 13px/1.2 "Quicksand", sans-serif;
				letter-spacing: 0.05em;
				text-transform: uppercase;
			}
			.rnta-book-now-builder__party-includes-list {
				margin: 0;
				padding-left: 18px;
				display: grid;
				gap: 6px;
			}
			.rnta-book-now-builder__party-includes-list li {
				color: var(--rnta-muted);
				font: 600 14px/1.5 "Quicksand", sans-serif;
			}
			.rnta-book-now-builder__party-title {
				margin:0; color: var(--rnta-plum); font: 700 clamp(28px, 2.4vw, 38px)/1.02 "Quicksand", sans-serif; letter-spacing: -.04em;
			}
			.rnta-book-now-builder__party-copy,
			.rnta-book-now-builder__party-facts span,
			.rnta-book-now-builder__capacity-box,
			.rnta-book-now-builder__quote-box,
			.rnta-book-now-builder__addon-copy,
			.rnta-book-now-builder__validation {
				color: var(--rnta-muted);
				font: 500 15px/1.65 "Quicksand", sans-serif;
			}
			.rnta-book-now-builder__party-facts { display:grid; gap:6px; }
			.rnta-book-now-builder__party-facts strong,
			.rnta-book-now-builder__quote-box strong,
			.rnta-book-now-builder__addon-card strong { color: var(--rnta-plum); }
			.rnta-book-now-builder__guest-grid,
			.rnta-book-now-builder__details-grid {
				display:grid;
				grid-template-columns: repeat(2, minmax(0,1fr));
				gap: 18px;
			}
			.rnta-book-now-builder__details-stack{
				display:grid;
				gap:22px;
			}
			.rnta-book-now-builder__subsection{
				display:grid;
				gap:18px;
				padding:22px;
				border-radius:26px;
				border:1px solid rgba(237,79,143,.16);
				background:linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,249,251,.88));
				box-shadow:0 14px 32px rgba(69,44,53,.04);
			}
			.rnta-book-now-builder__subheading{
				display:grid;
				gap:8px;
			}
			.rnta-book-now-builder__subheading h4{
				margin:0;
				color:var(--rnta-plum);
				font:700 clamp(24px, 2.3vw, 34px)/1.02 "Quicksand", sans-serif;
				letter-spacing:-.03em;
			}
			.rnta-book-now-builder__subeyebrow{
				display:inline-flex;
				align-items:center;
				width:fit-content;
				min-height:34px;
				padding:0 14px;
				border-radius:999px;
				background:#fff6fa;
				border:1px solid rgba(237,79,143,.18);
				color:var(--rnta-pink);
				font:700 11px/1 "Quicksand", sans-serif;
				letter-spacing:.08em;
				text-transform:uppercase;
			}
			.rnta-book-now-builder__field--full { grid-column: 1 / -1; }
			.rnta-book-now-builder__availability-shell{
				display:grid;
				grid-template-columns:minmax(0, 600px) minmax(320px, 1fr);
				align-items:start;
				gap:24px;
			}
			.rnta-book-now-builder__availability {
				max-width:600px;
				padding-top: 8px;
			}
			.rnta-book-now-builder__availability-aside{
				grid-column:auto;
				align-self:start;
			}
			.rnta-book-now-builder__availability .rnta-availability {
				width: 100%;
				padding: 8px 0 0;
			}
			.rnta-book-now-builder .rnta-book-now-builder__availability .rnta-availability__header {
				display:none !important;
			}
			.rnta-book-now-builder__availability .rnta-availability__legend {
				justify-content: flex-start;
				margin-top:0;
			}
			.rnta-book-now-builder__availability .rnta-availability__months {
				grid-template-columns: 1fr;
			}
			.rnta-book-now-builder__slot-picker{
				display:grid;
				gap:16px;
				height:100%;
				padding:18px;
				border-radius:24px;
				border:1px solid rgba(237,79,143,.18);
				background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(255,247,250,.94));
				box-shadow:0 18px 40px rgba(237,79,143,.08);
			}
			.rnta-book-now-builder__slot-head{
				display:flex;
				flex-wrap:wrap;
				align-items:center;
				justify-content:space-between;
				gap:12px;
			}
			.rnta-book-now-builder__slot-head strong{
				color:var(--rnta-plum);
				font:700 15px/1.2 "Quicksand", sans-serif;
				letter-spacing:.02em;
			}
			.rnta-book-now-builder__slot-head span{
				display:inline-flex;
				align-items:center;
				min-height:40px;
				padding:0 16px;
				border-radius:999px;
				border:1px solid rgba(237,79,143,.18);
				background:rgba(255,255,255,.86);
				color:var(--rnta-pink);
				font:700 14px/1 "Quicksand", sans-serif;
			}
			.rnta-book-now-builder__slot-grid{
				display:grid;
				grid-template-columns:repeat(4, minmax(0, 1fr));
				gap:12px;
			}
			.rnta-book-now-builder__slot-btn{
				display:inline-flex;
				align-items:center;
				justify-content:center;
				min-height:52px;
				padding:0 14px;
				border-radius:18px;
				border:1.5px solid rgba(237,79,143,.22);
				background:rgba(255,255,255,.96);
				color:var(--rnta-plum);
				font:700 15px/1 "Quicksand", sans-serif;
				letter-spacing:.01em;
				cursor:pointer;
				transition:transform .18s ease, box-shadow .18s ease, background-color .18s ease, color .18s ease, border-color .18s ease;
				box-shadow:0 8px 24px rgba(69,44,53,.05);
			}
			.rnta-book-now-builder__slot-btn:hover{
				transform:translateY(-2px);
				border-color:rgba(237,79,143,.44);
				box-shadow:0 14px 30px rgba(237,79,143,.14);
			}
			.rnta-book-now-builder__slot-btn.is-selected{
				background:linear-gradient(135deg, #ed4f8f, #f467a2);
				border-color:transparent;
				color:#fff;
				box-shadow:0 16px 32px rgba(237,79,143,.26);
			}
			.rnta-book-now-builder__slot-message{
				margin:0;
				color:var(--rnta-muted);
				font:500 13px/1.6 "Quicksand", sans-serif;
			}
			.rnta-book-now-builder__birth-picker{
				display:grid;
				grid-template-columns:1.2fr .8fr .9fr;
				gap:12px;
			}
			.rnta-book-now-builder__field-hint{
				color:var(--rnta-muted);
				font:500 12px/1.4 "Quicksand", sans-serif;
				letter-spacing:0;
				text-transform:none;
			}
			.rnta-book-now-builder__capacity-box,
			.rnta-book-now-builder__quote-box {
				padding: 18px 20px;
				border-radius: 22px;
				background: rgba(255,255,255,.72);
				border: 1px solid var(--rnta-border);
			}
			.rnta-book-now-builder__validation { margin-top: 12px; font-weight: 700; color: #b53968; }
			.rnta-book-now-builder__addons-grid {
				display:grid;
				grid-template-columns: repeat(2, minmax(0,1fr));
				gap: 18px;
			}
			.rnta-book-now-builder__spa-services-grid {
				display:grid;
				grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
				gap: 12px;
				margin-top: 14px;
			}
			.rnta-book-now-builder__spa-service-card {
				position:relative;
				display:flex;
				align-items:center;
				gap:12px;
				min-height:64px;
				padding:12px 14px;
				border-radius:18px;
				border:1.5px solid rgba(237,79,143,.18);
				background:rgba(255,255,255,.82);
				box-shadow:0 10px 22px rgba(237,79,143,.06);
				cursor:pointer;
				transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease, background-color .18s ease;
			}
			.rnta-book-now-builder__spa-service-card:hover {
				transform:translateY(-2px);
				border-color:rgba(237,79,143,.36);
				box-shadow:0 20px 40px rgba(237,79,143,.12);
			}
			.rnta-book-now-builder__spa-service-card.is-selected {
				border-color:rgba(237,79,143,.62);
				background:linear-gradient(180deg, rgba(255,246,250,.98), rgba(255,255,255,.94));
				box-shadow:0 16px 34px rgba(237,79,143,.14);
			}
			.rnta-book-now-builder__spa-service-card.is-disabled {
				opacity:.48;
				cursor:not-allowed;
			}
			.rnta-book-now-builder__spa-service-card input {
				position:static;
				flex:0 0 auto;
				width:22px;
				min-height:22px;
				height:22px;
				accent-color:var(--rnta-pink);
			}
			.rnta-book-now-builder__spa-service-title {
				margin:0;
				padding-right:0;
				color:var(--rnta-plum);
				font:700 17px/1.15 "Quicksand", sans-serif;
				letter-spacing:-.015em;
			}
			.rnta-book-now-builder__spa-service-copy {
				margin:0;
				color:var(--rnta-muted);
				font:500 13px/1.45 "Quicksand", sans-serif;
			}
			.rnta-book-now-builder__addon-card {
				display:grid;
				grid-template-columns: 132px minmax(0,1fr);
				gap: 16px;
				align-items:stretch;
				padding: 12px;
				border-radius: 24px;
				border: 1px solid var(--rnta-border);
				background: rgba(255,255,255,.78);
				cursor:pointer;
				box-shadow: 0 16px 36px rgba(237,79,143,.08);
				transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background-color .18s ease;
			}
			.rnta-book-now-builder__addon-card:hover {
				transform: translateY(-2px);
				border-color: rgba(237,79,143,.36);
				box-shadow: 0 22px 44px rgba(237,79,143,.14);
				background: rgba(255,255,255,.92);
			}
			.rnta-book-now-builder__addon-card.is-selected {
				border-color: rgba(237,79,143,.58);
				background: rgba(255,246,250,.94);
				box-shadow: 0 22px 44px rgba(237,79,143,.16);
			}
			.rnta-book-now-builder__addon-card.is-disabled {
				cursor:not-allowed;
				opacity:.48;
				filter:saturate(.7);
				transform:none;
				box-shadow:none;
			}
			.rnta-book-now-builder__addon-card.is-disabled:hover {
				transform:none;
				border-color: var(--rnta-border);
				box-shadow:none;
				background: rgba(255,255,255,.78);
			}
			.rnta-book-now-builder__addon-media {
				position:relative;
				min-height: 132px;
				border-radius: 20px;
				overflow:hidden;
				background: linear-gradient(135deg, #ffe1ee, #fff7fb);
				border: 1px solid rgba(237,79,143,.14);
			}
			.rnta-book-now-builder__addon-media::after {
				content:"";
				position:absolute;
				inset:0;
				background: linear-gradient(180deg, rgba(69,44,53,0) 45%, rgba(69,44,53,.22));
				pointer-events:none;
			}
			.rnta-book-now-builder__addon-media img {
				display:block;
				width:100%;
				height:100%;
				object-fit:cover;
			}
			.rnta-book-now-builder__addon-fallback {
				display:flex;
				width:100%;
				height:100%;
				align-items:center;
				justify-content:center;
				color: var(--rnta-pink);
				font: 700 13px/1 "Quicksand", sans-serif;
				letter-spacing:.08em;
				text-transform:uppercase;
			}
			.rnta-book-now-builder__addon-check {
				position:absolute;
				top:10px;
				left:10px;
				z-index:2;
				display:inline-flex;
				align-items:center;
				justify-content:center;
				width:38px;
				height:38px;
				border-radius:999px;
				background: rgba(255,255,255,.9);
				box-shadow:0 10px 24px rgba(69,44,53,.12);
			}
			.rnta-book-now-builder__addon-body {
				display:grid;
				align-content:start;
				gap: 10px;
				padding: 8px 6px 8px 0;
			}
			.rnta-book-now-builder__addon-top {
				display:grid; gap:8px;
			}
			.rnta-book-now-builder__addon-card input[type="checkbox"] {
				width: 20px; min-height: 20px; height: 20px; margin: 0;
				accent-color: var(--rnta-pink);
			}
			.rnta-book-now-builder__addon-title {
				margin:0; color: var(--rnta-plum); font: 700 23px/1.06 "Quicksand", sans-serif; letter-spacing: -.03em;
			}
			.rnta-book-now-builder__addon-tags { display:flex; flex-wrap:wrap; gap:8px; }
			.rnta-book-now-builder__addon-tag {
				display:inline-flex; min-height:30px; align-items:center; padding:0 10px; border-radius:999px;
				border:1px solid rgba(237,79,143,.18); background:#fff6fa; color: var(--rnta-pink);
				font:700 11px/1 "Quicksand", sans-serif; letter-spacing:.04em; text-transform:uppercase;
			}
			.rnta-book-now-builder__actions { display:flex; flex-wrap:wrap; gap:14px; margin-top: 18px; }
			.rnta-book-now-builder__btn {
				display:inline-flex; align-items:center; justify-content:center; min-height:56px; padding:0 24px;
				border-radius:999px; border:2px solid var(--rnta-pink); text-decoration:none;
				font:800 14px/1 "Quicksand", sans-serif; letter-spacing:.08em; text-transform:uppercase; cursor:pointer;
				transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease, color .18s ease;
			}
			.rnta-book-now-builder__btn:hover { transform: translateY(-2px); }
			.rnta-book-now-builder__btn--primary { background: linear-gradient(135deg, #ed4f8f, #f467a2); color:#fff; box-shadow:0 18px 34px rgba(237,79,143,.24); }
			.rnta-book-now-builder__btn--secondary { background: #fff; color: var(--rnta-pink); }
			.rnta-book-now-builder__quote-list { display:grid; gap:8px; margin:0; }
			.rnta-book-now-builder__quote-row { display:flex; justify-content:space-between; gap:18px; }
			.rnta-book-now-builder__quote-total { padding-top:10px; margin-top:12px; border-top:1px solid rgba(237,79,143,.14); }
			.rnta-book-now-builder__quote-note { margin-top:14px; }
			@media (max-width: 900px) {
				.rnta-book-now-builder__party-card,
				.rnta-book-now-builder__guest-grid,
				.rnta-book-now-builder__details-grid,
				.rnta-book-now-builder__addons-grid,
				.rnta-book-now-builder__spa-services-grid,
				.rnta-book-now-builder__availability-shell { grid-template-columns: 1fr; }
			}
			@media (max-width: 767px) {
				.rnta-book-now-builder { width:min(100% - 28px, 1200px); }
				.rnta-book-now-builder__section { padding: 20px; border-radius: 24px; }
				.rnta-book-now-builder__heading h3 { font-size: clamp(34px, 10vw, 48px); }
				.rnta-book-now-builder__actions { display:grid; }
				.rnta-book-now-builder__btn { width:100%; }
				.rnta-book-now-builder__slot-head{ align-items:flex-start; }
				.rnta-book-now-builder__slot-head span{ width:100%; justify-content:center; }
				.rnta-book-now-builder__slot-grid{ grid-template-columns:repeat(2, minmax(0, 1fr)); }
				.rnta-book-now-builder__birth-picker{ grid-template-columns:1fr; }
				.rnta-book-now-builder__availability{ max-width:none; }
				.rnta-book-now-builder__addon-card { grid-template-columns: 104px minmax(0,1fr); gap: 12px; padding: 10px; border-radius: 22px; }
				.rnta-book-now-builder__addon-media { min-height: 112px; border-radius: 18px; }
				.rnta-book-now-builder__addon-body { padding: 4px 2px 4px 0; }
				.rnta-book-now-builder__addon-title { font-size: 20px; }
			}
			@media (max-width: 460px) {
				.rnta-book-now-builder__addon-card { grid-template-columns: 1fr; }
				.rnta-book-now-builder__addon-media { min-height: 170px; }
				.rnta-book-now-builder__addon-body { padding: 2px; }
			}
		</style>
		<script>
			(function () {
				if (window.__rntaBookNowBound) return;
				window.__rntaBookNowBound = true;

				const currency = (value) => {
					const number = Number(value || 0);
					return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
				};

				const renderBuilder = (root) => {
					const parties = JSON.parse(root.dataset.parties || '{}');
					const addons = JSON.parse(root.dataset.addons || '{}');
					const spaServices = JSON.parse(root.dataset.spaServices || '{}');
					const selector = root.querySelector('[data-rnta-party-selector]');
					const selectedPartyInput = root.querySelector('[data-rnta-selected-party-input]');
					const selectedSpaServicesInput = root.querySelector('[data-rnta-selected-spa-services-input]');
					const guestInput = root.querySelector('[data-rnta-guest-count]');
					const partyCard = root.querySelector('[data-rnta-party-card]');
					const capacityBox = root.querySelector('[data-rnta-capacity-box]');
					const validationBox = root.querySelector('[data-rnta-guest-validation]');
					const spaServicesSection = root.querySelector('[data-rnta-spa-services-section]');
					const spaServicesGrid = root.querySelector('[data-rnta-spa-services-grid]');
					const spaServicesNote = root.querySelector('[data-rnta-spa-services-note]');
					const spaServicesValidation = root.querySelector('[data-rnta-spa-services-validation]');
					const addonsGrid = root.querySelector('[data-rnta-addons-grid]');
					const quoteBox = root.querySelector('[data-rnta-quote-box]');
					const estimatedInput = root.querySelector('[data-rnta-estimated-total]');
					const extraGuestTotalInput = root.querySelector('[data-rnta-extra-guest-total]');
					const extraGuestCountInput = root.querySelector('[data-rnta-extra-guest-count]');
					const hiddenTimeInput = root.querySelector('[data-rnta-time-hidden]');
					const preferredDateInput = root.querySelector('#rnta_preferred_party_date');
					const birthdateHiddenInput = root.querySelector('[data-rnta-birth-hidden]');
					const birthMonthSelect = root.querySelector('[data-rnta-birth-month]');
					const birthDaySelect = root.querySelector('[data-rnta-birth-day]');
					const birthYearSelect = root.querySelector('[data-rnta-birth-year]');
					const availabilityRoot = root.querySelector('.rnta-book-now-builder__availability [data-rnta-availability]');
					const slotGrid = root.querySelector('[data-rnta-slot-grid]');
					const slotMessage = root.querySelector('[data-rnta-slot-message]');
					const slotSelected = root.querySelector('[data-rnta-slot-selected]');
					const form = root.querySelector('form');
					const availabilityData = (() => {
						if (!availabilityRoot || !availabilityRoot.dataset.rntaAvailability) return {};
						try {
							return JSON.parse(availabilityRoot.dataset.rntaAvailability);
						} catch (error) {
							return {};
						}
					})();
					const isBeforeMinimumBookableDate = (date) => {
						const minimumBookableDate = availabilityData.minimum_bookable_date || '';
						return Boolean(minimumBookableDate && date && date < minimumBookableDate);
					};
					const isPartyDay = (date) => {
						if (!date) return false;
						const parsedDate = new Date(`${date}T12:00:00`);
						if (Number.isNaN(parsedDate.getTime())) return false;
						const day = parsedDate.getDay();
						return day === 5 || day === 6 || day === 0;
					};
					const getMinimumBookableMessage = () => {
						const leadDays = Number(availabilityData.minimum_lead_days || 12);
						const minimumBookableDate = availabilityData.minimum_bookable_date || '';
						return minimumBookableDate
							? `Rock N Tiara requires at least ${leadDays} days notice. Please choose ${minimumBookableDate} or later.`
							: `Rock N Tiara requires at least ${leadDays} days notice.`;
					};

					const getSelectedParty = () => parties[selector.value] || null;

					const syncBirthdate = () => {
						if (!birthdateHiddenInput || !birthMonthSelect || !birthDaySelect || !birthYearSelect) return;
						const month = birthMonthSelect.value;
						const day = birthDaySelect.value;
						const year = birthYearSelect.value;
						if (!month || !day || !year) {
							birthdateHiddenInput.value = '';
							if (root.querySelector('#rnta_child_age')) {
								root.querySelector('#rnta_child_age').value = '';
							}
							return;
						}
						birthdateHiddenInput.value = `${year}-${month}-${day}`;
						syncChildAgeFromBirthdate();
					};

					const syncChildAgeFromBirthdate = () => {
						const ageInput = root.querySelector('#rnta_child_age');
						if (!ageInput || !birthdateHiddenInput || !birthdateHiddenInput.value) return;

						const parts = birthdateHiddenInput.value.split('-');
						if (parts.length !== 3) {
							ageInput.value = '';
							return;
						}

						const birthYear = parseInt(parts[0], 10);
						const birthMonth = parseInt(parts[1], 10);
						const birthDay = parseInt(parts[2], 10);

						if ([birthYear, birthMonth, birthDay].some((value) => Number.isNaN(value))) {
							ageInput.value = '';
							return;
						}

						const today = new Date();
						let age = today.getFullYear() - birthYear;
						const monthDiff = (today.getMonth() + 1) - birthMonth;
						const dayDiff = today.getDate() - birthDay;

						if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
							age -= 1;
						}

						ageInput.value = age > 0 ? age : '';
					};

					const timeToMinutes = (time) => {
						if (!time || typeof time !== 'string' || time.indexOf(':') === -1) return null;
						const parts = time.split(':');
						const hours = parseInt(parts[0], 10);
						const minutes = parseInt(parts[1], 10);
						if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
						return (hours * 60) + minutes;
					};

					const minutesToTime = (minutes) => {
						const normalized = Math.max(0, Number(minutes || 0));
						const hours = Math.floor(normalized / 60);
						const mins = normalized % 60;
						return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
					};

					const getAddonExtraTimeMinutes = (addon) => {
						const text = `${addon?.title || ''} ${addon?.slug || ''}`.toLowerCase();
						if (text.includes('additional 1 hour') || text.includes('additional-1-hour') || text.includes('additional 60') || text.includes('additional-60') || text.includes('60 minutes') || text.includes('1 hour')) {
							return 60;
						}
						if (text.includes('additional 30') || text.includes('additional-30') || text.includes('30 minutes') || text.includes('30-minutes')) {
							return 30;
						}
						return 0;
					};

					const formatTimeLabel = (minutes) => {
						let hours = Math.floor(minutes / 60);
						const mins = minutes % 60;
						const meridiem = hours >= 12 ? 'PM' : 'AM';
						hours = hours % 12;
						if (hours === 0) hours = 12;
						if (mins === 0) {
							return `${hours} ${meridiem}`;
						}
						return `${hours}:${String(mins).padStart(2, '0')} ${meridiem}`;
					};

					const getPartyDurationMinutes = () => {
						const party = getSelectedParty();
						const guestCount = Number(guestInput ? guestInput.value : 1);
						const baseDuration = Number(availabilityData.party_duration_minutes || party?.duration_minutes || 120);
						const threshold = Number(party?.auto_extra_time_threshold || 0);
						const autoAddonId = String(party?.auto_extra_time_addon || '');
						const addon = autoAddonId ? addons[autoAddonId] : null;
						const requiresAutomaticExtraHour = threshold > 0 && autoAddonId && addon && guestCount > threshold;
						let extraTimeMinutes = requiresAutomaticExtraHour ? getAddonExtraTimeMinutes(addon) : 0;
						root.querySelectorAll('[data-rnta-addon-checkbox]:checked').forEach((checkbox) => {
							const selectedAddon = addons[checkbox.value];
							extraTimeMinutes = Math.max(extraTimeMinutes, getAddonExtraTimeMinutes(selectedAddon));
						});
						const duration = baseDuration + extraTimeMinutes;
						return duration > 0 ? duration : 120;
					};

					const getOperationalBuffers = () => {
						const buffers = availabilityData.operational_buffers || {};
						return {
							setup: Math.max(0, Number(buffers.setup || 0)),
							cleanup: Math.max(0, Number(buffers.cleanup || 30)),
						};
					};

					const getAvailableSlotsForDate = (date) => {
						const fixedTimes = Array.isArray(availabilityData.fixed_party_start_times) && availabilityData.fixed_party_start_times.length
							? availabilityData.fixed_party_start_times
							: ['10:00', '13:00', '16:00', '19:00'];
						const durationMinutes = getPartyDurationMinutes();
						const buffers = getOperationalBuffers();
						const blocksByDate = availabilityData.blocks_by_date || {};
						const blocks = Array.isArray(blocksByDate[date]) ? blocksByDate[date] : [];
						const slots = [];

						if (isBeforeMinimumBookableDate(date)) {
							return slots;
						}

						if (!isPartyDay(date)) {
							return slots;
						}

						fixedTimes.forEach((time) => {
							const current = timeToMinutes(time);
							if (current === null) return;
							const blockStartCandidate = current - buffers.setup;
							const blockEndCandidate = current + durationMinutes + buffers.cleanup;
							const isBlocked = blocks.some((block) => {
								const blockStart = timeToMinutes(block.start || '00:00');
								const blockEnd = timeToMinutes(block.end || '23:59');
								if (blockStart === null || blockEnd === null) return false;
								return blockStartCandidate < blockEnd && blockEndCandidate > blockStart;
							});

							slots.push({
								value: minutesToTime(current),
								label: formatTimeLabel(current),
								isBlocked: isBlocked,
							});
						});

						return slots;
					};

					const restoreSelectedDateSlots = () => {
						if (preferredDateInput && preferredDateInput.value) {
							renderSlotsForDate(preferredDateInput.value, true, false);
						}
					};

					const renderSlotsForDate = (date, persistDate = true, allowPreviewCopy = false) => {
						if (!slotGrid || !slotMessage || !slotSelected || !hiddenTimeInput) return;

						if (!date) {
							slotGrid.innerHTML = '';
							slotSelected.textContent = 'Choose a date first';
							slotMessage.textContent = 'Tap a date on the calendar to load available start times.';
							hiddenTimeInput.value = '';
							return;
						}

						const slots = getAvailableSlotsForDate(date);
						const isPreview = !persistDate && allowPreviewCopy;
						const activeTimeValue = persistDate ? hiddenTimeInput.value : '';

						if (persistDate && preferredDateInput && preferredDateInput.value !== date) {
							preferredDateInput.value = date;
						}

						if (!slots.length) {
							slotGrid.innerHTML = '';
							if (persistDate) {
								hiddenTimeInput.value = '';
								slotSelected.textContent = 'No start times available';
								slotMessage.textContent = isBeforeMinimumBookableDate(date)
									? getMinimumBookableMessage()
									: !isPartyDay(date)
										? 'Parties are available Friday, Saturday, and Sunday only.'
										: 'This date is fully booked or blocked for the selected package duration.';
							} else {
								slotSelected.textContent = 'Preview unavailable';
								slotMessage.textContent = isBeforeMinimumBookableDate(date)
									? getMinimumBookableMessage()
									: !isPartyDay(date)
										? 'Parties are available Friday, Saturday, and Sunday only.'
										: `No available start times on ${date}.`;
							}
							return;
						}

						slotGrid.innerHTML = slots.map((slot) => {
							if (slot.isBlocked) {
								return `<button type="button" disabled class="rnta-book-now-builder__slot-btn is-taken" title="${slot.label} start time is already booked or unavailable">Booked</button>`;
							}
							return `<button type="button" class="rnta-book-now-builder__slot-btn ${activeTimeValue === slot.value ? 'is-selected' : ''}" data-rnta-slot-btn data-slot-value="${slot.value}">${slot.label}</button>`;
						}).join('');

						if (persistDate) {
							const stillSelected = slots.some((slot) => slot.value === hiddenTimeInput.value);
							if (!stillSelected) {
								hiddenTimeInput.value = slots[0].value;
								slotGrid.querySelector('[data-slot-value="' + slots[0].value + '"]')?.classList.add('is-selected');
							}
							const selectedSlot = slots.find((slot) => slot.value === hiddenTimeInput.value) || slots[0];
							slotSelected.textContent = `${date} — ${selectedSlot.label}`;
							slotMessage.textContent = 'Available start times are fixed at 10:00 AM, 1:00 PM, 4:00 PM, and 7:00 PM on Friday, Saturday, and Sunday. Confirmed reservations, temporary 48-hour holds, manual blocks, and cleanup time are respected.';
						} else {
							slotSelected.textContent = `Preview for ${date}`;
							slotMessage.textContent = `${slots.length} start time${slots.length === 1 ? '' : 's'} available on this date.`;
						}
					};

					const addonTags = (addon) => {
						const tags = [];
						if (addon.pricing_model === 'per_guest') tags.push('Per Guest');
						if (addon.pricing_model === 'custom_quote') tags.push('Custom Quote');
						if (addon.requires_contact) tags.push('Contact Required');
						if (addon.requires_extra_time) tags.push('Needs Extra Time');
						return tags.map(tag => '<span class="rnta-book-now-builder__addon-tag">' + tag + '</span>').join('');
					};

					const getAddonMutualExclusionGroup = (addon) => {
						if (getAddonExtraTimeMinutes(addon) > 0) {
							return 'party-extra-time';
						}
						return '';
					};

					const updateAddonSelectionState = () => {
						const party = getSelectedParty();
						const guestCount = Number(guestInput ? guestInput.value : 1);
						const threshold = Number(party?.auto_extra_time_threshold || 0);
						const autoAddonId = String(party?.auto_extra_time_addon || '');
						const autoAddon = autoAddonId ? addons[autoAddonId] : null;
						const shouldForceAutoExtraTime = threshold > 0 && autoAddon && guestCount > threshold;

						if (shouldForceAutoExtraTime) {
							const autoGroup = getAddonMutualExclusionGroup(autoAddon);
							root.querySelectorAll('[data-rnta-addon-checkbox]').forEach((checkbox) => {
								const addon = addons[checkbox.value];
								if (!addon) return;
								const group = getAddonMutualExclusionGroup(addon);
								checkbox.checked = String(checkbox.value) === autoAddonId || (!!autoGroup && group !== autoGroup && checkbox.checked);
							});
						}

						const checkedGroups = new Set();
						root.querySelectorAll('[data-rnta-addon-checkbox]:checked').forEach((checkbox) => {
							const addon = addons[checkbox.value];
							const group = getAddonMutualExclusionGroup(addon);
							if (group) checkedGroups.add(group);
						});

						root.querySelectorAll('[data-rnta-addon-checkbox]').forEach((checkbox) => {
							const addon = addons[checkbox.value];
							const group = getAddonMutualExclusionGroup(addon);
							const card = checkbox.closest('.rnta-book-now-builder__addon-card');
							const forcedAuto = shouldForceAutoExtraTime && String(checkbox.value) === autoAddonId;
							const disabled = (!!group && checkedGroups.has(group) && !checkbox.checked) || forcedAuto;
							checkbox.disabled = disabled;
							if (forcedAuto) {
								checkbox.checked = true;
							}
							if (card) {
								card.classList.toggle('is-selected', checkbox.checked);
								card.classList.toggle('is-disabled', disabled);
								if (disabled) {
									card.setAttribute('aria-disabled', 'true');
									card.setAttribute('title', forcedAuto ? 'Additional 1 Hour is required automatically for this guest count.' : 'Choose either Additional 30 Minutes or Additional 1 Hour, not both.');
								} else {
									card.removeAttribute('aria-disabled');
									card.removeAttribute('title');
								}
							}
						});
					};

					const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

					const renderParty = () => {
						const party = getSelectedParty();
						if (!party) return;
						selectedPartyInput.value = party.id;
						const includesHtml = Array.isArray(party.includes) && party.includes.length > 0
							? `<div class="rnta-book-now-builder__party-includes">
									<h5 class="rnta-book-now-builder__party-includes-title">What's Included</h5>
									<ul class="rnta-book-now-builder__party-includes-list">
										${party.includes.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
									</ul>
							   </div>`
							: '';
						partyCard.innerHTML = `
							<div class="rnta-book-now-builder__party-media"><img src="${party.image}" alt="${party.title}"></div>
							<div class="rnta-book-now-builder__party-content">
								<div class="rnta-book-now-builder__party-facts">
									<span><strong>Package:</strong> ${party.title}</span>
									${party.display_price ? `<span><strong>Display price:</strong> ${party.display_price}</span>` : ''}
									${party.duration ? `<span><strong>Duration:</strong> ${party.duration}</span>` : ''}
									${party.included_guests ? `<span><strong>Guests included:</strong> up to ${party.included_guests} guests</span>` : ''}
									${party.max_guests ? `<span><strong>Maximum:</strong> ${party.max_guests} guests</span>` : ''}
									${party.extra_guest_price ? `<span><strong>Additional guests:</strong> ${currency(party.extra_guest_price)} each</span>` : ''}
								</div>
								<h4 class="rnta-book-now-builder__party-title">${party.title}</h4>
								${party.short_description ? `<p class="rnta-book-now-builder__party-copy">${party.short_description}</p>` : ''}
								${party.capacity_note ? `<p class="rnta-book-now-builder__party-copy">${party.capacity_note}</p>` : ''}
								${includesHtml}
							</div>
						`;
					};

					const renderAddons = () => {
						const party = getSelectedParty();
						if (!party) return;
						const allowed = Array.isArray(party.allowed_addons) ? party.allowed_addons.map(String) : [];
						const autoAddonId = String(party.auto_extra_time_addon || '');
						const includedAddons = Array.isArray(party.included_addons) ? party.included_addons.map(String) : [];
						const visibleAddons = Object.values(addons).filter(addon => allowed.length === 0 || allowed.includes(String(addon.id)) || includedAddons.includes(String(addon.id)) || (autoAddonId && String(addon.id) === autoAddonId));
						addonsGrid.innerHTML = visibleAddons.map(addon => {
							const isIncluded = includedAddons.includes(String(addon.id));
							return `
							<label class="rnta-book-now-builder__addon-card${isIncluded ? ' is-included' : ''}">
								<div class="rnta-book-now-builder__addon-media">
									<span class="rnta-book-now-builder__addon-check">
										<input type="checkbox" name="rnta_selected_addons[]" value="${addon.id}" ${isIncluded ? 'checked' : ''} data-rnta-addon-checkbox>
									</span>
									${addon.image ? `<img src="${addon.image}" alt="${addon.title}">` : `<span class="rnta-book-now-builder__addon-fallback">Add-on</span>`}
								</div>
								<div class="rnta-book-now-builder__addon-body">
									<div class="rnta-book-now-builder__addon-top">
										<h4 class="rnta-book-now-builder__addon-title">${addon.title}${isIncluded ? '<span class="rnta-book-now-builder__addon-included-badge">Included</span>' : ''}</h4>
										<div class="rnta-book-now-builder__addon-tags">${addonTags(addon)}</div>
									</div>
									${addon.short_description ? `<p class="rnta-book-now-builder__addon-copy">${addon.short_description}</p>` : ''}
									<p class="rnta-book-now-builder__addon-copy"><strong>${isIncluded ? 'Included in Package ($0)' : (addon.display_price || currency(addon.price_number || 0))}</strong></p>
									${addon.availability_note ? `<p class="rnta-book-now-builder__addon-copy">${addon.availability_note}</p>` : ''}
								</div>
							</label>
						`;}).join('');
						updateAddonSelectionState();
					};

					const getAllowedSpaServices = (party) => {
						if (!party || !party.enable_internal_service_choices) {
							return [];
						}

						const allowed = Array.isArray(party.allowed_spa_services) ? party.allowed_spa_services.map(String) : [];
						if (allowed.length) {
							return Object.values(spaServices).filter((service) => allowed.includes(String(service.id)));
						}

						if (Array.isArray(party.spa_service_options) && party.spa_service_options.length) {
							return party.spa_service_options.map((title, index) => ({
								id: `option-${index}`,
								title,
								short_description: '',
								duration: '',
								is_option: true,
							}));
						}
						return [];
					};

					const getSpaServiceSelectionError = () => {
						const party = getSelectedParty();
						const requiredCount = Number(party && party.enable_internal_service_choices && party.spa_services_included_count ? party.spa_services_included_count : 0);
						if (!requiredCount) return '';

						const visibleSpaServices = getAllowedSpaServices(party);
						const checkedCount = root.querySelectorAll('[data-rnta-spa-service-checkbox]:checked').length;
						if (visibleSpaServices.length < requiredCount) {
							return `This party is configured to require ${requiredCount} spa services, but only ${visibleSpaServices.length} option${visibleSpaServices.length === 1 ? '' : 's'} are available. Please review the Experience setup.`;
						}
						if (checkedCount !== requiredCount) {
							return `Please choose exactly ${requiredCount} spa service${requiredCount === 1 ? '' : 's'} for this party.`;
						}
						return '';
					};

					const updateSpaServiceSelectionState = () => {
						const party = getSelectedParty();
						const requiredCount = Number(party && party.enable_internal_service_choices && party.spa_services_included_count ? party.spa_services_included_count : 0);
						const checked = Array.from(root.querySelectorAll('[data-rnta-spa-service-checkbox]:checked'));
						const selectedNames = checked.map((checkbox) => {
							const service = spaServices[checkbox.value];
							return service ? service.title : checkbox.value;
						}).filter(Boolean);

						if (selectedSpaServicesInput) {
							selectedSpaServicesInput.value = selectedNames.join('|');
						}

						root.querySelectorAll('[data-rnta-spa-service-card]').forEach((card) => {
							const checkbox = card.querySelector('[data-rnta-spa-service-checkbox]');
							const selected = !!(checkbox && checkbox.checked);
							card.classList.toggle('is-selected', selected);
							card.classList.toggle('is-disabled', requiredCount > 0 && checked.length >= requiredCount && !selected);
							if (checkbox) {
								checkbox.disabled = requiredCount > 0 && checked.length >= requiredCount && !selected;
							}
						});

						if (spaServicesNote) {
							if (requiredCount > 0) {
								spaServicesNote.innerHTML = `<strong>${checked.length} of ${requiredCount} spa services selected.</strong> These choices are included in the selected party package and do not add to the quote.`;
							} else {
								spaServicesNote.innerHTML = 'This party does not require included spa service choices.';
							}
						}

						if (spaServicesValidation) {
							const spaError = getSpaServiceSelectionError();
							if (spaError) {
								spaServicesValidation.textContent = spaError;
							} else {
								spaServicesValidation.textContent = selectedNames.length ? `Selected: ${selectedNames.join(', ')}` : '';
							}
						}

						computeQuote();
					};

					const renderSpaServices = () => {
						const party = getSelectedParty();
						if (!party || !spaServicesSection || !spaServicesGrid) return;
						const requiredCount = Number(party.enable_internal_service_choices && party.spa_services_included_count ? party.spa_services_included_count : 0);
						const visibleSpaServices = getAllowedSpaServices(party);

						if (!requiredCount || !visibleSpaServices.length) {
							spaServicesSection.style.display = 'none';
							spaServicesGrid.innerHTML = '';
							if (selectedSpaServicesInput) selectedSpaServicesInput.value = '';
							if (spaServicesValidation) spaServicesValidation.textContent = '';
							return;
						}

						spaServicesSection.style.display = '';
						spaServicesGrid.innerHTML = visibleSpaServices.map((service) => `
							<label class="rnta-book-now-builder__spa-service-card" data-rnta-spa-service-card>
								<input type="checkbox" name="${service.is_option ? 'rnta_selected_spa_service_names[]' : 'rnta_selected_spa_service_ids[]'}" value="${service.is_option ? service.title : service.id}" data-rnta-spa-service-checkbox>
								<div>
									<h4 class="rnta-book-now-builder__spa-service-title">${service.title}</h4>
									${!service.is_option && service.short_description ? `<p class="rnta-book-now-builder__spa-service-copy">${service.short_description}</p>` : ''}
									${!service.is_option && service.duration ? `<p class="rnta-book-now-builder__spa-service-copy"><strong>Duration:</strong> ${service.duration}</p>` : ''}
								</div>
							</label>
						`).join('');
						updateSpaServiceSelectionState();
					};

					const computeQuote = () => {
						const party = getSelectedParty();
						if (!party) return;
						const guestCount = Math.max(1, parseInt(guestInput.value || '1', 10));
						const included = Number(party.included_guests || 0);
						const maxGuests = Number(party.max_guests || 0);
						const extraPrice = Number(party.extra_guest_price || 0);
						const basePrice = Number(party.base_price || 0);
						const extraGuestCount = Math.max(0, guestCount - included);
						const extraGuestTotal = extraGuestCount * extraPrice;

						let error = '';
						if (maxGuests && guestCount > maxGuests) {
							error = `This package allows a maximum of ${maxGuests} guests.`;
						}
						validationBox.textContent = error;

						capacityBox.innerHTML = `
							<div class="rnta-book-now-builder__quote-list">
								<div class="rnta-book-now-builder__quote-row"><span>Girls included in package</span><strong>${included || 0}</strong></div>
								<div class="rnta-book-now-builder__quote-row"><span>Guest count selected</span><strong>${guestCount}</strong></div>
								<div class="rnta-book-now-builder__quote-row"><span>Additional guests charged</span><strong>${extraGuestCount}</strong></div>
								<div class="rnta-book-now-builder__quote-row"><span>Additional guest rate</span><strong>${extraPrice ? currency(extraPrice) + ' each' : 'Included'}</strong></div>
								<div class="rnta-book-now-builder__quote-row"><span>Maximum guests allowed</span><strong>${maxGuests || 'N/A'}</strong></div>
							</div>
						`;

						let addonsTotal = 0;
						let customQuoteCount = 0;
						const selectedAddons = [];
						const includedAddons = Array.isArray(party.included_addons) ? party.included_addons.map(String) : [];
						root.querySelectorAll('[data-rnta-addon-checkbox]:checked').forEach((checkbox) => {
							const addon = addons[checkbox.value];
							if (!addon) return;
							selectedAddons.push(addon);
							const isIncluded = includedAddons.includes(String(addon.id));
							if (isIncluded) {
								// Included in package base price
							} else if (addon.pricing_model === 'per_guest') {
								addonsTotal += Number(addon.price_number || 0) * guestCount;
							} else if (addon.pricing_model === 'fixed') {
								addonsTotal += Number(addon.price_number || 0);
							} else {
								customQuoteCount += 1;
							}
						});

						const estimatedTotal = basePrice + extraGuestTotal + addonsTotal;
						const spaSelectionError = getSpaServiceSelectionError();
						estimatedInput.value = estimatedTotal.toFixed(2);
						extraGuestTotalInput.value = extraGuestTotal.toFixed(2);
						extraGuestCountInput.value = extraGuestCount;

						const addonRows = selectedAddons.map((addon) => {
							const isIncluded = includedAddons.includes(String(addon.id));
							let value = '';
							if (isIncluded) value = 'Included ($0)';
							else if (addon.pricing_model === 'per_guest') value = `${currency(Number(addon.price_number || 0) * guestCount)}`;
							else if (addon.pricing_model === 'fixed') value = `${currency(Number(addon.price_number || 0))}`;
							else value = 'Quoted separately';
							return `<div class="rnta-book-now-builder__quote-row"><span>${addon.title}</span><strong>${value}</strong></div>`;
						}).join('');

						quoteBox.innerHTML = `
							<div class="rnta-book-now-builder__quote-list">
								<div class="rnta-book-now-builder__quote-row"><span>Party base</span><strong>${currency(basePrice)}</strong></div>
								<div class="rnta-book-now-builder__quote-row"><span>Additional guests</span><strong>${currency(extraGuestTotal)}</strong></div>
								${addonRows}
								<div class="rnta-book-now-builder__quote-row rnta-book-now-builder__quote-total"><span>Estimated celebration total</span><strong>${currency(estimatedTotal)}</strong></div>
							</div>
							<p class="rnta-book-now-builder__quote-note">The $200 deposit is applied at the next step and is not included in this estimated celebration total. Your requested date remains on temporary hold for up to 48 hours while payment proof is reviewed. Final balance is confirmed offline by Rock N Tiara. Gratuity is not required, but it is always appreciated for the party team who helps make the celebration special. ${customQuoteCount ? 'Some selected addons require manual confirmation and may change the final total.' : ''}</p>
						`;

						root.querySelectorAll('[data-rnta-submit-action]').forEach((button) => {
							button.disabled = !!error || !!spaSelectionError;
							button.style.opacity = (error || spaSelectionError) ? '.6' : '1';
						});
					};

					selector.addEventListener('change', () => {
						
					const getBookingValidationErrors = () => {
						const errors = [];
						const party = getSelectedParty();
						if (!party) {
							errors.push('Party package selection is required.');
						}
						const guestCount = Number(guestInput ? guestInput.value : 0);
						const maxGuests = Number(party?.max_guests || 0);
						if (!guestCount || guestCount < 1) {
							errors.push('Guest count (number of girls) is required.');
						} else if (maxGuests && guestCount > maxGuests) {
							errors.push(`Guest count (${guestCount}) exceeds maximum allowed (${maxGuests}) for this package.`);
						}

						const spaError = getSpaServiceSelectionError();
						if (spaError) {
							errors.push(spaError);
						}

						const hostFirstName = root.querySelector('#rnta_host_first_name')?.value?.trim();
						const hostLastName = root.querySelector('#rnta_host_last_name')?.value?.trim();
						const hostEmail = root.querySelector('#rnta_host_email')?.value?.trim();
						const hostPhone = root.querySelector('#rnta_host_phone')?.value?.trim();
						const childName = root.querySelector('#rnta_child_name')?.value?.trim();
						const childBirthdate = birthdateHiddenInput?.value?.trim();
						const preferredDate = preferredDateInput?.value?.trim();
						const preferredTime = hiddenTimeInput?.value?.trim();

						if (!hostFirstName) errors.push('Host First Name is required.');
						if (!hostLastName) errors.push('Host Last Name is required.');
						if (!hostEmail) errors.push('Host Email is required.');
						if (!hostPhone) errors.push('Host Phone is required.');
						if (!childName) errors.push('Child Name is required.');
						if (!childBirthdate) errors.push('Birthday date (Month, Day, Year) is required.');
						if (!preferredDate) errors.push('Preferred party date on calendar is required.');
						if (!preferredTime) errors.push('Available start time selection is required.');

						return errors;
					};

					form.addEventListener('submit', (event) => {
						const validationErrors = getBookingValidationErrors();
						const validationSummary = root.querySelector('[data-rnta-booking-validation-summary]');
						if (validationErrors.length > 0) {
							event.preventDefault();
							if (validationSummary) {
								validationSummary.innerHTML = `
									<div class="rnta-book-now-builder__validation-box" style="padding: 16px; border: 1px solid #f5c6cb; background-color: #f8d7da; color: #721c24; border-radius: 8px; margin-top: 16px;">
										<strong style="display: block; margin-bottom: 8px; font-size: 15px;">Please complete the following required fields to proceed:</strong>
										<ul style="margin: 0; padding-left: 20px;">
											${validationErrors.map((err) => `<li>${err}</li>`).join('')}
										</ul>
									</div>
								`;
								validationSummary.style.display = '';
								validationSummary.scrollIntoView({ behavior: 'smooth', block: 'center' });
							}
						} else if (validationSummary) {
							validationSummary.style.display = 'none';
							validationSummary.innerHTML = '';
						}
					});

					renderParty();
						renderSpaServices();
						renderAddons();
						restoreSelectedDateSlots();
						computeQuote();
					});

					root.addEventListener('change', (event) => {
						if (event.target.matches('[data-rnta-addon-checkbox], [data-rnta-guest-count]')) {
							updateAddonSelectionState();
							restoreSelectedDateSlots();
							computeQuote();
						}
						if (event.target.matches('[data-rnta-spa-service-checkbox]')) {
							updateSpaServiceSelectionState();
						}
					});

					root.addEventListener('input', (event) => {
						if (event.target.matches('[data-rnta-guest-count]')) {
							updateAddonSelectionState();
							restoreSelectedDateSlots();
							computeQuote();
						}
					});

					root.addEventListener('change', (event) => {
						if (event.target === preferredDateInput) {
							renderSlotsForDate(preferredDateInput.value, true, false);
						}

						if (event.target === birthMonthSelect || event.target === birthDaySelect || event.target === birthYearSelect) {
							syncBirthdate();
						}
					});

					root.addEventListener('click', (event) => {
						const slotButton = event.target.closest('[data-rnta-slot-btn]');
						if (slotButton && hiddenTimeInput) {
							hiddenTimeInput.value = slotButton.dataset.slotValue || '';
							slotGrid.querySelectorAll('[data-rnta-slot-btn]').forEach((button) => button.classList.remove('is-selected'));
							slotButton.classList.add('is-selected');
							if (preferredDateInput && preferredDateInput.value) {
								slotSelected.textContent = `${preferredDateInput.value} — ${slotButton.textContent.trim()}`;
							} else {
								slotSelected.textContent = slotButton.textContent.trim();
							}
							slotMessage.textContent = 'Start time selected. Rock N Tiara will review availability before confirming the reservation.';
							return;
						}

						const dateButton = event.target.closest('[data-rnta-available-date]');
						if (dateButton && preferredDateInput) {
							const dateValue = dateButton.dataset.rntaAvailableDate || '';
							if (dateValue) {
								window.requestAnimationFrame(() => {
									renderSlotsForDate(preferredDateInput.value || dateValue, true, false);
								});
							}
						}
					});

					root.addEventListener('mouseover', (event) => {
						const dateButton = event.target.closest('[data-rnta-available-date]');
						if (!dateButton || window.innerWidth < 992) return;
						const dateValue = dateButton.dataset.rntaAvailableDate || '';
						if (dateValue) {
							renderSlotsForDate(dateValue, false, true);
						}
					});

					root.addEventListener('mouseout', (event) => {
						const dateButton = event.target.closest('[data-rnta-available-date]');
						if (!dateButton || window.innerWidth < 992) return;
						restoreSelectedDateSlots();
					});

					root.querySelectorAll('[data-rnta-submit-action]').forEach((button) => {
						button.addEventListener('click', () => {
							form.querySelector('[name="rnta_book_now_action"]').value = button.dataset.rntaSubmitAction;
						});
					});

					form.addEventListener('submit', (event) => {
						const party = getSelectedParty();
						const requiredCount = Number(party && party.spa_services_included_count ? party.spa_services_included_count : 0);
						if (requiredCount > 0) {
							const spaError = getSpaServiceSelectionError();
							if (spaError) {
								event.preventDefault();
								updateSpaServiceSelectionState();
								if (spaServicesValidation) {
									spaServicesValidation.textContent = spaError;
								}
								if (spaServicesValidation) {
									spaServicesValidation.scrollIntoView({ behavior: 'smooth', block: 'center' });
								}
							}
						}
					});

					renderParty();
					renderSpaServices();
					renderAddons();
					syncBirthdate();
					syncChildAgeFromBirthdate();
					renderSlotsForDate(preferredDateInput ? preferredDateInput.value : '', true, false);
					computeQuote();
				};

				document.addEventListener('DOMContentLoaded', function () {
					document.querySelectorAll('[data-rnta-book-now]').forEach(renderBuilder);
				});
			})();
		</script>
		<?php
	}

	private function print_assets_once() {
		if (self::$assets_printed) {
			return;
		}
		self::$assets_printed = true;
		?>
		<style>
			.rnta-experiences-grid,
			.rnta-experiences-browser,
			.rnta-experiences-browser *,
			.rnta-experiences-grid * { box-sizing: border-box; }
			.rnta-experiences-browser {
				--rnta-pink: #ed4f8f;
				--rnta-plum: #452c35;
				--rnta-muted: #856b76;
				--rnta-border: rgba(237, 79, 143, 0.18);
				display: grid;
				gap: 22px;
			}
			.rnta-experiences-browser__toolbar {
				display: grid;
				grid-template-columns: minmax(0, 1fr) auto;
				gap: 16px;
				align-items: end;
				padding: 18px;
				border: 1px solid var(--rnta-border);
				border-radius: 28px;
				background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,247,250,0.94));
				box-shadow: 0 18px 40px rgba(69, 44, 53, 0.05);
			}
			.rnta-experiences-browser__search {
				display: grid;
				gap: 9px;
				margin: 0;
			}
			.rnta-experiences-browser__search span {
				color: var(--rnta-pink);
				font: 700 12px/1 "Quicksand", system-ui, sans-serif;
				letter-spacing: 0.08em;
				text-transform: uppercase;
			}
			.rnta-experiences-browser__search input {
				width: 100%;
				min-height: 54px;
				padding: 0 20px;
				border: 1px solid rgba(237,79,143,0.24);
				border-radius: 999px;
				background: rgba(255,255,255,0.86);
				color: var(--rnta-plum);
				font: 500 16px/1.35 "Quicksand", system-ui, sans-serif;
				outline: none;
				box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
				transition: border-color 180ms ease, box-shadow 180ms ease;
			}
			.rnta-experiences-browser__search input:focus {
				border-color: rgba(237,79,143,0.62);
				box-shadow: 0 0 0 4px rgba(237,79,143,0.10);
			}
			.rnta-experiences-browser__summary {
				justify-self: end;
				min-height: 40px;
				display: inline-flex;
				align-items: center;
				padding: 0 14px;
				border: 1px solid rgba(237,79,143,0.18);
				border-radius: 999px;
				background: rgba(255,255,255,0.72);
				color: var(--rnta-muted);
				font: 700 13px/1 "Quicksand", system-ui, sans-serif;
				white-space: nowrap;
			}
			.rnta-experiences-grid {
				--rnta-pink: #ed4f8f;
				--rnta-plum: #452c35;
				--rnta-muted: #856b76;
				--rnta-border: rgba(237, 79, 143, 0.18);
				display: grid;
				gap: 24px;
			}
			.rnta-experience-card[hidden] { display: none !important; }
			.rnta-experiences-grid--cols-1 { grid-template-columns: 1fr; }
			.rnta-experiences-grid--cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
			.rnta-experiences-grid--cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
			.rnta-experiences-grid--cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

			.rnta-experience-card {
				display: flex;
				flex-direction: column;
				min-height: 100%;
				border: 1px solid var(--rnta-border);
				border-radius: 28px;
				background:
					radial-gradient(circle at 88% 14%, rgba(237, 79, 143, 0.08), transparent 24%),
					#ffffff;
				box-shadow: 0 18px 40px rgba(69, 44, 53, 0.06);
				overflow: hidden;
			}

			.rnta-experience-card__media {
				aspect-ratio: 16 / 11;
				overflow: hidden;
				background: #fff5f9;
			}

			.rnta-experience-card__media img {
				display:block;
				width:100%;
				height:100%;
				object-fit:cover;
			}

			.rnta-experience-card__body {
				display:flex;
				flex:1 1 auto;
				flex-direction:column;
				gap:16px;
				padding:24px;
			}

			.rnta-experience-card__meta,
			.rnta-experience-modal-card__meta {
				display:flex;
				flex-wrap:wrap;
				gap:10px;
				align-items:center;
			}

			.rnta-experience-card__badge,
			.rnta-experience-card__type {
				display:inline-flex;
				align-items:center;
				min-height:32px;
				padding:0 12px;
				border:1px solid rgba(237, 79, 143, 0.18);
				border-radius:999px;
				font:700 12px/1 "Quicksand", system-ui, sans-serif;
				letter-spacing:0.02em;
			}

			.rnta-experience-card__badge { color:var(--rnta-pink); background:#fff5f9; }
			.rnta-experience-card__type { color:rgba(69,44,53,0.82); background:rgba(255,255,255,0.82); }

			.rnta-experience-card__title,
			.rnta-experience-modal-card__title {
				margin:0;
				color:var(--rnta-plum);
				font:700 clamp(26px, 2vw, 34px)/1.02 "Quicksand", system-ui, sans-serif;
				letter-spacing:-0.04em;
			}

			.rnta-experience-card__description,
			.rnta-experience-card__facts span,
			.rnta-experience-card__group li,
			.rnta-experience-modal-card__description,
			.rnta-experience-modal-card__facts span,
			.rnta-experience-modal-card__group li {
				color:var(--rnta-muted);
				font:500 15px/1.65 "Quicksand", system-ui, sans-serif;
				letter-spacing:-0.01em;
			}

			.rnta-experience-card__description,
			.rnta-experience-modal-card__description { margin:0; }

			.rnta-experience-card__facts,
			.rnta-experience-modal-card__facts {
				display:grid;
				gap:6px;
			}

			.rnta-experience-card__facts strong,
			.rnta-experience-modal-card__facts strong { color:var(--rnta-plum); font-weight:700; }

			.rnta-experience-card__details,
			.rnta-experience-modal-card__group {
				display:grid;
				gap:14px;
			}

			.rnta-experience-card__group h4,
			.rnta-experience-modal-card__group h4 {
				margin:0 0 8px;
				color:var(--rnta-plum);
				font:700 14px/1.2 "Quicksand", system-ui, sans-serif;
				letter-spacing:0.04em;
				text-transform:uppercase;
			}

			.rnta-experience-card__group ul,
			.rnta-experience-modal-card__group ul {
				margin:0;
				padding-left:18px;
				display:grid;
				gap:5px;
			}

			.rnta-experience-card__actions,
			.rnta-experience-modal-card__actions {
				display:flex;
				flex-wrap:wrap;
				gap:12px;
				margin-top:auto;
				padding-top:6px;
			}

			.rnta-experience-card__btn {
				display:inline-flex;
				align-items:center;
				justify-content:center;
				min-height:52px;
				padding:0 22px;
				border-radius:999px;
				border:2px solid var(--rnta-pink);
				text-decoration:none;
				font:700 14px/1 "Quicksand", system-ui, sans-serif;
				letter-spacing:0.06em;
				text-transform:uppercase;
				cursor:pointer;
				transition:transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, color 180ms ease;
			}

			.rnta-experience-card__btn:hover { transform:translateY(-2px); }
			.rnta-experience-card__btn--primary {
				color:#ffffff;
				background:linear-gradient(135deg, #ed4f8f, #f467a2);
				box-shadow:0 14px 26px rgba(237,79,143,0.24);
			}
			.rnta-experience-card__btn--secondary {
				color:var(--rnta-pink);
				background:rgba(255,255,255,0.74);
			}

			.rnta-experience-card--compact .rnta-experience-card__body { gap:14px; }
			.rnta-experience-card--compact .rnta-experience-card__title { font-size: clamp(24px, 1.9vw, 31px); }

			.rnta-experiences-browser__empty {
				padding: 22px 24px;
				border: 1px dashed rgba(237,79,143,0.26);
				border-radius: 24px;
				background: rgba(255,255,255,0.72);
				color: var(--rnta-muted);
				font: 600 15px/1.55 "Quicksand", system-ui, sans-serif;
				text-align: center;
			}
			.rnta-experiences-browser__pager {
				display: flex;
				flex-wrap: wrap;
				gap: 12px;
				align-items: center;
				justify-content: center;
				padding-top: 4px;
			}
			.rnta-experiences-browser__pager-btn {
				min-height: 48px;
				padding: 0 22px;
				border: 2px solid var(--rnta-pink);
				border-radius: 999px;
				background: rgba(255,255,255,0.78);
				color: var(--rnta-pink);
				font: 700 13px/1 "Quicksand", system-ui, sans-serif;
				letter-spacing: 0.06em;
				text-transform: uppercase;
				cursor: pointer;
				transition: transform 180ms ease, background-color 180ms ease, color 180ms ease, opacity 180ms ease;
			}
			.rnta-experiences-browser__pager-btn:hover:not(:disabled) {
				transform: translateY(-2px);
				background: var(--rnta-pink);
				color: #fff;
			}
			.rnta-experiences-browser__pager-btn:disabled {
				opacity: 0.42;
				cursor: not-allowed;
			}
			.rnta-experiences-browser__pager-status {
				min-height: 40px;
				display: inline-flex;
				align-items: center;
				padding: 0 16px;
				border-radius: 999px;
				background: rgba(237,79,143,0.10);
				color: var(--rnta-muted);
				font: 700 13px/1 "Quicksand", system-ui, sans-serif;
			}

			.rnta-experience-modal-root[hidden] { display:none !important; }
			.rnta-experience-modal-root {
				position: fixed;
				inset: 0;
				z-index: 1500;
				display: flex;
				align-items: center;
				justify-content: center;
				padding: 20px;
			}

			.rnta-experience-modal-backdrop {
				position:absolute;
				inset:0;
				background: rgba(69, 44, 53, 0.36);
				backdrop-filter: blur(10px);
				-webkit-backdrop-filter: blur(10px);
			}

			.rnta-experience-modal-shell {
				position:relative;
				z-index:1;
				width: min(100%, 980px);
				max-height: min(92vh, 920px);
				overflow:auto;
				border:1px solid rgba(237,79,143,0.16);
				border-radius: 32px;
				background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,248,251,0.98));
				box-shadow: 0 28px 60px rgba(69, 44, 53, 0.16);
			}

			.rnta-experience-modal-close {
				position:absolute;
				top:18px;
				right:18px;
				z-index:2;
				width:46px;
				height:46px;
				border:1px solid rgba(237,79,143,0.18);
				border-radius:999px;
				background: rgba(255,255,255,0.88);
				color: var(--rnta-pink);
				font: 500 26px/1 "Quicksand", system-ui, sans-serif;
				cursor:pointer;
			}

			.rnta-experience-modal-card {
				display:grid;
				grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
				min-height: 100%;
			}

			.rnta-experience-modal-card__media {
				min-height: 100%;
				background:#fff1f6;
			}

			.rnta-experience-modal-card__media img {
				display:block;
				width:100%;
				height:100%;
				object-fit:cover;
			}

			.rnta-experience-modal-card__body {
				display:grid;
				gap:18px;
				padding:38px 34px 34px;
				align-content:start;
			}

			@media (max-width: 1024px) {
				.rnta-experiences-grid--cols-3,
				.rnta-experiences-grid--cols-4 {
					grid-template-columns: repeat(2, minmax(0, 1fr));
				}
			}

			@media (max-width: 767px) {
				.rnta-experiences-browser { gap: 18px; }
				.rnta-experiences-browser__toolbar {
					grid-template-columns: 1fr;
					padding: 14px;
					border-radius: 22px;
				}
				.rnta-experiences-browser__summary {
					justify-self: stretch;
					justify-content: center;
				}
				.rnta-experiences-grid--cols-2,
				.rnta-experiences-grid--cols-3,
				.rnta-experiences-grid--cols-4 {
					grid-template-columns: 1fr;
				}
				.rnta-experience-card { border-radius:24px; }
				.rnta-experience-card__body { padding:20px; }
				.rnta-experience-card__actions,
				.rnta-experience-modal-card__actions { display:grid; }
				.rnta-experience-card__btn { width:100%; }
				.rnta-experiences-browser__pager {
					display: grid;
					grid-template-columns: 1fr;
				}
				.rnta-experiences-browser__pager-btn,
				.rnta-experiences-browser__pager-status {
					width: 100%;
					justify-content: center;
				}
				.rnta-experience-modal-root {
					padding: 10px;
					align-items: center;
					justify-content: center;
				}
				.rnta-experience-modal-shell {
					width: 100%;
					max-height: calc(100vh - 20px);
					border-radius: 22px;
				}
				.rnta-experience-modal-card {
					grid-template-columns: 1fr;
				}
				.rnta-experience-modal-card__media {
					aspect-ratio: 4 / 3;
				}
				.rnta-experience-modal-card__body {
					padding:22px 18px 20px;
					gap: 16px;
				}
				.rnta-experience-modal-card__title {
					font-size: clamp(30px, 8vw, 40px);
				}
				.rnta-experience-modal-card__description,
				.rnta-experience-modal-card__facts span,
				.rnta-experience-modal-card__group li {
					font-size: 15px;
					line-height: 1.6;
				}
				.rnta-experience-modal-close {
					top: 14px;
					right: 14px;
					width: 42px;
					height: 42px;
					font-size: 24px;
				}
			}
		</style>
		<script>
			(function () {
				if (window.__rntaExperiencesModalBound) return;
				window.__rntaExperiencesModalBound = true;

				const closeModal = () => {
					document.querySelectorAll('[data-rnta-modal-root]').forEach((root) => {
						root.hidden = true;
						const content = root.querySelector('[data-rnta-modal-content]');
						if (content) content.innerHTML = '';
					});
					document.documentElement.classList.remove('rnta-modal-open');
					document.body.classList.remove('rnta-modal-open');
				};

				document.addEventListener('click', function (event) {
					const openBtn = event.target.closest('[data-rnta-modal-open]');
					if (openBtn) {
						const id = openBtn.getAttribute('data-rnta-modal-open');
						const section = openBtn.closest('[data-rnta-experiences-browser], .elementor-widget, body');
						const template = (section ? section.querySelector('[data-rnta-modal-template="' + id + '"]') : null) || document.querySelector('[data-rnta-modal-template="' + id + '"]');
						const root = (section ? section.querySelector('[data-rnta-modal-root]') : null) || document.querySelector('[data-rnta-modal-root]');
						const content = root ? root.querySelector('[data-rnta-modal-content]') : null;
						if (!template || !root || !content) return;
						content.innerHTML = template.innerHTML;
						root.hidden = false;
						document.documentElement.classList.add('rnta-modal-open');
						document.body.classList.add('rnta-modal-open');
						return;
					}

					if (event.target.closest('[data-rnta-modal-close]')) {
						closeModal();
						return;
					}
				});

				document.addEventListener('keydown', function (event) {
					if (event.key === 'Escape') closeModal();
				});

				const normalize = (value) => {
					return (value || '')
						.toString()
						.toLowerCase()
						.normalize('NFD')
						.replace(/[\u0300-\u036f]/g, '')
						.trim();
				};

				const initBrowser = (browser) => {
					if (!browser || browser.dataset.rntaBrowserReady === '1') return;
					browser.dataset.rntaBrowserReady = '1';

					const perPage = Math.max(0, parseInt(browser.getAttribute('data-rnta-per-page') || '0', 10));
					const cards = Array.from(browser.querySelectorAll('[data-rnta-filter-text]'));
					const search = browser.querySelector('[data-rnta-experiences-search]');
					const summary = browser.querySelector('[data-rnta-experiences-summary]');
					const empty = browser.querySelector('[data-rnta-experiences-empty]');
					const pager = browser.querySelector('[data-rnta-experiences-pager]');
					const prev = browser.querySelector('[data-rnta-experiences-prev]');
					const next = browser.querySelector('[data-rnta-experiences-next]');
					const pageStatus = browser.querySelector('[data-rnta-experiences-page-status]');
					let page = 0;

					const render = () => {
						const keyword = normalize(search ? search.value : '');
						const matched = cards.filter((card) => {
							const haystack = normalize(card.getAttribute('data-rnta-filter-text'));
							return !keyword || haystack.indexOf(keyword) !== -1;
						});
						const totalPages = perPage > 0 ? Math.max(1, Math.ceil(matched.length / perPage)) : 1;
						page = Math.min(page, totalPages - 1);
						const start = perPage > 0 ? page * perPage : 0;
						const end = perPage > 0 ? start + perPage : matched.length;

						cards.forEach((card) => {
							card.hidden = true;
						});
						matched.slice(start, end).forEach((card) => {
							card.hidden = false;
						});

						if (empty) empty.hidden = matched.length > 0;
						if (summary) {
							summary.textContent = matched.length === 1 ? '1 result' : matched.length + ' results';
						}
						if (pager) {
							const shouldShowPager = perPage > 0 && matched.length > perPage;
							pager.hidden = !shouldShowPager;
							if (prev) prev.disabled = page <= 0;
							if (next) next.disabled = page >= totalPages - 1;
							if (pageStatus) pageStatus.textContent = 'Page ' + (page + 1) + ' of ' + totalPages;
						}
					};

					if (search) {
						search.addEventListener('input', () => {
							page = 0;
							render();
						});
					}
					if (prev) {
						prev.addEventListener('click', () => {
							page = Math.max(0, page - 1);
							render();
							browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
						});
					}
					if (next) {
						next.addEventListener('click', () => {
							page += 1;
							render();
							browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
						});
					}

					render();
				};

				const initBrowsers = () => {
					document.querySelectorAll('[data-rnta-experiences-browser]').forEach(initBrowser);
				};

				if (document.readyState === 'loading') {
					document.addEventListener('DOMContentLoaded', initBrowsers);
				} else {
					initBrowsers();
				}
			})();
		</script>
		<?php
	}

	public function admin_columns($columns) {
		$columns['experience_type'] = __('Type', 'rockntiara-experiences');
		$columns['display_price']   = __('Price', 'rockntiara-experiences');
		$columns['duration']        = __('Duration', 'rockntiara-experiences');
		$columns['launch_ready']    = __('Launch Ready', 'rockntiara-experiences');
		$columns['featured']        = __('Featured', 'rockntiara-experiences');
		return $columns;
	}

	public function admin_column_content($column, $post_id) {
		switch ($column) {
			case 'experience_type':
				$terms = get_the_terms($post_id, self::TAXONOMY);
				if (!empty($terms) && !is_wp_error($terms)) {
					echo esc_html(implode(', ', wp_list_pluck($terms, 'name')));
				}
				break;
			case 'display_price':
				echo esc_html(get_post_meta($post_id, '_rnta_display_price', true));
				break;
			case 'duration':
				echo esc_html(get_post_meta($post_id, '_rnta_duration', true));
				break;
			case 'launch_ready':
				$this->render_launch_readiness_column($post_id);
				break;
			case 'featured':
				echo get_post_meta($post_id, '_rnta_featured', true) ? '&#10003;' : '&mdash;';
				break;
		}
	}

	public function render_admin_filters($post_type) {
		if (self::POST_TYPE !== $post_type) {
			return;
		}

		$current_type      = isset($_GET['rnta_experience_type_filter']) ? sanitize_text_field(wp_unslash($_GET['rnta_experience_type_filter'])) : '';
		$current_readiness = isset($_GET['rnta_launch_ready_filter']) ? sanitize_text_field(wp_unslash($_GET['rnta_launch_ready_filter'])) : '';
		$terms             = get_terms(array(
			'taxonomy'   => self::TAXONOMY,
			'hide_empty' => false,
		));
		?>
		<select name="rnta_experience_type_filter">
			<option value=""><?php esc_html_e('All experience types', 'rockntiara-experiences'); ?></option>
			<?php if (!is_wp_error($terms)) : ?>
				<?php foreach ($terms as $term) : ?>
					<option value="<?php echo esc_attr($term->slug); ?>" <?php selected($current_type, $term->slug); ?>><?php echo esc_html($term->name); ?></option>
				<?php endforeach; ?>
			<?php endif; ?>
		</select>
		<select name="rnta_launch_ready_filter">
			<option value=""><?php esc_html_e('All launch readiness', 'rockntiara-experiences'); ?></option>
			<option value="ready" <?php selected($current_readiness, 'ready'); ?>><?php esc_html_e('Ready', 'rockntiara-experiences'); ?></option>
			<option value="needs_review" <?php selected($current_readiness, 'needs_review'); ?>><?php esc_html_e('Needs Review', 'rockntiara-experiences'); ?></option>
		</select>
		<?php
	}

	public function apply_admin_filters($query) {
		if (!is_admin() || !$query->is_main_query() || self::POST_TYPE !== $query->get('post_type')) {
			return;
		}

		$type_filter = isset($_GET['rnta_experience_type_filter']) ? sanitize_text_field(wp_unslash($_GET['rnta_experience_type_filter'])) : '';
		if ('' !== $type_filter) {
			$query->set(
				'tax_query',
				array(
					array(
						'taxonomy' => self::TAXONOMY,
						'field'    => 'slug',
						'terms'    => $type_filter,
					),
				)
			);
		}

		$readiness_filter = isset($_GET['rnta_launch_ready_filter']) ? sanitize_text_field(wp_unslash($_GET['rnta_launch_ready_filter'])) : '';
		if (!in_array($readiness_filter, array('ready', 'needs_review'), true)) {
			return;
		}

		$matching_ids = $this->get_experience_ids_by_readiness('ready' === $readiness_filter);
		$query->set('post__in', !empty($matching_ids) ? $matching_ids : array(0));
	}

	private function render_launch_readiness_column($post_id) {
		$missing = $this->get_launch_readiness_missing_fields($post_id);

		if (empty($missing)) {
			echo '<span style="display:inline-flex;align-items:center;min-height:26px;padding:0 10px;border-radius:999px;background:#ecfdf3;color:#027a48;border:1px solid #abefc6;font-weight:700;">' . esc_html__('Ready', 'rockntiara-experiences') . '</span>';
			return;
		}

		echo '<span style="display:inline-flex;align-items:center;min-height:26px;padding:0 10px;border-radius:999px;background:#fff4e5;color:#b54708;border:1px solid #fedf89;font-weight:700;">' . esc_html__('Needs Review', 'rockntiara-experiences') . '</span>';
		echo '<br><small style="display:block;margin-top:6px;color:#646970;">' . esc_html(implode(', ', $missing)) . '</small>';
	}

	private function get_launch_readiness_missing_fields($post_id) {
		$meta    = $this->get_meta($post_id);
		$terms   = get_the_terms($post_id, self::TAXONOMY);
		$type    = (!empty($terms) && !is_wp_error($terms)) ? $terms[0]->slug : '';
		$missing = array();

		if (!has_post_thumbnail($post_id)) {
			$missing[] = __('image', 'rockntiara-experiences');
		}
		if ('' === trim((string) $meta['display_price'])) {
			$missing[] = __('display price', 'rockntiara-experiences');
		}
		if ('' === trim((string) $meta['duration'])) {
			$missing[] = __('duration', 'rockntiara-experiences');
		}
		if ('' === trim((string) $meta['short_description'])) {
			$missing[] = __('description', 'rockntiara-experiences');
		}

		if ('party' === $type) {
			if ('' === trim((string) $meta['base_price'])) {
				$missing[] = __('base price', 'rockntiara-experiences');
			}
			if ('' === trim((string) $meta['included_guests'])) {
				$missing[] = __('included guests', 'rockntiara-experiences');
			}
			if ('' === trim((string) $meta['max_guests'])) {
				$missing[] = __('max guests', 'rockntiara-experiences');
			}
			if ('' === trim((string) $meta['extra_guest_price'])) {
				$missing[] = __('extra guest price', 'rockntiara-experiences');
			}
		}

		if ('addon' === $type && '' === trim((string) $meta['pricing_model'])) {
			$missing[] = __('pricing model', 'rockntiara-experiences');
		}

		if ('' === $type) {
			$missing[] = __('type', 'rockntiara-experiences');
		}

		return $missing;
	}

	private function get_experience_ids_by_readiness($ready) {
		$query = new WP_Query(array(
			'post_type'      => self::POST_TYPE,
			'post_status'    => array('publish', 'draft', 'pending', 'future', 'private'),
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'no_found_rows'  => true,
		));
		$ids = array();

		foreach ($query->posts as $post_id) {
			$is_ready = empty($this->get_launch_readiness_missing_fields($post_id));
			if ((bool) $ready === $is_ready) {
				$ids[] = absint($post_id);
			}
		}

		return $ids;
	}
}

register_activation_hook(__FILE__, array('RockNTiara_Experiences_Single_File', 'activate'));
register_deactivation_hook(__FILE__, array('RockNTiara_Experiences_Single_File', 'deactivate'));

RockNTiara_Experiences_Single_File::instance();
