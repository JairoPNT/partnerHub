<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RNTA_Reservations_Waiver_PDF_Download {
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		add_action( 'admin_post_rnta_download_waiver_pdf', array( $this, 'handle_download' ) );
	}

	public function get_download_url( $record_type, $record_id ) {
		$record_type = in_array( $record_type, array( 'host', 'guest', 'party' ), true ) ? $record_type : '';
		$record_id   = absint( $record_id );

		if ( ! $record_type || ! $record_id ) {
			return '';
		}

		return wp_nonce_url(
			add_query_arg(
				array(
					'action' => 'rnta_download_waiver_pdf',
					'type'   => $record_type,
					'id'     => $record_id,
				),
				admin_url( 'admin-post.php' )
			),
			'rnta_download_waiver_pdf_' . $record_type . '_' . $record_id
		);
	}

	public function handle_download() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'You are not allowed to download waiver records.', 'rockntiara-reservations' ), '', array( 'response' => 403 ) );
		}

		$record_type = isset( $_GET['type'] ) ? sanitize_key( wp_unslash( $_GET['type'] ) ) : '';
		$record_id   = isset( $_GET['id'] ) ? absint( wp_unslash( $_GET['id'] ) ) : 0;

		if ( ! in_array( $record_type, array( 'host', 'guest', 'party' ), true ) || ! $record_id ) {
			wp_die( esc_html__( 'Invalid waiver PDF request.', 'rockntiara-reservations' ), '', array( 'response' => 400 ) );
		}

		check_admin_referer( 'rnta_download_waiver_pdf_' . $record_type . '_' . $record_id );

		$uploads     = wp_upload_dir();
		$waivers_dir = realpath( trailingslashit( $uploads['basedir'] ) . 'waivers' );
		$secure_root = $waivers_dir ? trailingslashit( wp_normalize_path( $waivers_dir ) ) : '';

		if ( 'party' === $record_type ) {
			$this->handle_party_zip_download( $record_id, $uploads, $secure_root );
			return;
		}

		$record = 'guest' === $record_type
			? RNTA_Reservations_Guest_Repository::instance()->get_by_id( $record_id )
			: RNTA_Reservations_Waiver_Repository::instance()->get_by_reservation_id( $record_id );

		if ( ! $record || empty( $record['waiver_pdf_path'] ) ) {
			wp_die( esc_html__( 'No PDF is available for this waiver.', 'rockntiara-reservations' ), '', array( 'response' => 404 ) );
		}

		$file_path   = realpath( trailingslashit( $uploads['basedir'] ) . ltrim( $record['waiver_pdf_path'], '/\\' ) );
		$secure_file = $file_path ? wp_normalize_path( $file_path ) : '';

		if (
			! $secure_root ||
			! $secure_file ||
			0 !== strpos( $secure_file, $secure_root ) ||
			'pdf' !== strtolower( pathinfo( $secure_file, PATHINFO_EXTENSION ) ) ||
			! is_readable( $file_path )
		) {
			wp_die( esc_html__( 'The waiver PDF could not be found securely.', 'rockntiara-reservations' ), '', array( 'response' => 404 ) );
		}

		while ( ob_get_level() ) {
			ob_end_clean();
		}

		nocache_headers();
		header( 'Content-Type: application/pdf' );
		header( 'Content-Disposition: attachment; filename="' . sanitize_file_name( basename( $file_path ) ) . '"' );
		header( 'Content-Length: ' . filesize( $file_path ) );
		header( 'X-Content-Type-Options: nosniff' );
		readfile( $file_path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile
		exit;
	}

	private function handle_party_zip_download( $reservation_id, $uploads, $secure_root ) {
		$reservation   = RNTA_Reservations_Repository::instance()->get_by_id( $reservation_id );
		$host_waiver   = RNTA_Reservations_Waiver_Repository::instance()->get_by_reservation_id( $reservation_id );
		$guest_waivers = RNTA_Reservations_Guest_Repository::instance()->get_by_reservation_id( $reservation_id );

		if ( ! $reservation ) {
			wp_die( esc_html__( 'Reservation not found.', 'rockntiara-reservations' ), '', array( 'response' => 404 ) );
		}

		$files_to_zip = array();

		if ( $host_waiver && ! empty( $host_waiver['waiver_pdf_path'] ) ) {
			$file_path   = realpath( trailingslashit( $uploads['basedir'] ) . ltrim( $host_waiver['waiver_pdf_path'], '/\\' ) );
			$secure_file = $file_path ? wp_normalize_path( $file_path ) : '';
			if ( $secure_root && $secure_file && 0 === strpos( $secure_file, $secure_root ) && is_readable( $file_path ) ) {
				$files_to_zip[] = array(
					'path' => $file_path,
					'name' => 'Host-Waiver-' . sanitize_file_name( $host_waiver['child_name'] ? $host_waiver['child_name'] : 'Host' ) . '.pdf',
				);
			}
		}

		foreach ( $guest_waivers as $guest ) {
			if ( ! empty( $guest['waiver_pdf_path'] ) && 'signed' === $guest['waiver_status'] ) {
				$file_path   = realpath( trailingslashit( $uploads['basedir'] ) . ltrim( $guest['waiver_pdf_path'], '/\\' ) );
				$secure_file = $file_path ? wp_normalize_path( $file_path ) : '';
				if ( $secure_root && $secure_file && 0 === strpos( $secure_file, $secure_root ) && is_readable( $file_path ) ) {
					$files_to_zip[] = array(
						'path' => $file_path,
						'name' => 'Guest-Waiver-' . sanitize_file_name( $guest['guest_name'] ? $guest['guest_name'] : 'Guest-' . $guest['id'] ) . '.pdf',
					);
				}
			}
		}

		if ( empty( $files_to_zip ) ) {
			wp_die( esc_html__( 'No signed waiver PDFs are available for this party.', 'rockntiara-reservations' ), '', array( 'response' => 404 ) );
		}

		$child_name_slug = ! empty( $reservation['child_name'] ) ? sanitize_file_name( $reservation['child_name'] ) : 'Party-' . $reservation_id;
		$zip_filename    = 'Fiesta-' . $child_name_slug . '-Waivers.zip';

		$zip_bytes = $this->build_zip_archive( $files_to_zip );

		while ( ob_get_level() ) {
			ob_end_clean();
		}

		nocache_headers();
		header( 'Content-Type: application/zip' );
		header( 'Content-Disposition: attachment; filename="' . $zip_filename . '"' );
		header( 'Content-Length: ' . strlen( $zip_bytes ) );
		header( 'X-Content-Type-Options: nosniff' );
		echo $zip_bytes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		exit;
	}

	private function build_zip_archive( $files ) {
		$zip_data = '';
		$cd_data  = '';
		$offset   = 0;

		foreach ( $files as $file ) {
			if ( ! file_exists( $file['path'] ) ) {
				continue;
			}

			$content  = file_get_contents( $file['path'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$name     = $file['name'];
			$crc      = crc32( $content );
			$unc_len  = strlen( $content );
			$comp_len = $unc_len;
			$name_len = strlen( $name );

			$local_header = "\x50\x4b\x03\x04" .
				"\x10\x00" .
				"\x00\x00" .
				"\x00\x00" .
				"\x00\x00\x00\x00" .
				pack( 'V', $crc ) .
				pack( 'V', $comp_len ) .
				pack( 'V', $unc_len ) .
				pack( 'v', $name_len ) .
				"\x00\x00" .
				$name;

			$zip_data .= $local_header . $content;

			$cd_header = "\x50\x4b\x01\x02" .
				"\x14\x00" .
				"\x10\x00" .
				"\x00\x00" .
				"\x00\x00" .
				"\x00\x00\x00\x00" .
				pack( 'V', $crc ) .
				pack( 'V', $comp_len ) .
				pack( 'V', $unc_len ) .
				pack( 'v', $name_len ) .
				"\x00\x00" .
				"\x00\x00" .
				"\x00\x00" .
				"\x00\x00" .
				"\x20\x00\x00\x00" .
				pack( 'V', $offset ) .
				$name;

			$cd_data .= $cd_header;
			$offset   = strlen( $zip_data );
		}

		$cd_offset = strlen( $zip_data );
		$cd_size   = strlen( $cd_data );
		$eocd      = "\x50\x4b\x05\x06" .
			"\x00\x00" .
			"\x00\x00" .
			pack( 'v', count( $files ) ) .
			pack( 'v', count( $files ) ) .
			pack( 'V', $cd_size ) .
			pack( 'V', $cd_offset ) .
			"\x00\x00";

		return $zip_data . $cd_data . $eocd;
	}
}
