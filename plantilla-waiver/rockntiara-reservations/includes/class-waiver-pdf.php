<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Generates dependency-free PDF snapshots for signed waivers.
 */
final class RNTA_Reservations_Waiver_PDF {
	private $pages = array();
	private $page_index = -1;
	private $cursor_y = 0;
	private $signature_image = null;

	public function generate( $reservation, $waiver_data, $guest = null ) {
		$uploads = wp_upload_dir();

		if ( ! empty( $uploads['error'] ) ) {
			return new WP_Error( 'rnta_waiver_uploads', $uploads['error'] );
		}

		$event_date = ! empty( $reservation['confirmed_party_date'] ) ? $reservation['confirmed_party_date'] : $reservation['requested_party_date'];
		$year       = current_time( 'Y' );
		$month      = current_time( 'm' );

		if ( preg_match( '/^(\d{4})-(\d{2})-\d{2}$/', (string) $event_date, $date_parts ) ) {
			$year  = $date_parts[1];
			$month = $date_parts[2];
		}

		$waivers_directory = trailingslashit( $uploads['basedir'] ) . 'waivers';
		$directory         = trailingslashit( $waivers_directory ) . $year . '/' . $month;
		if ( ! wp_mkdir_p( $directory ) ) {
			return new WP_Error( 'rnta_waiver_directory', __( 'The secure waiver PDF directory could not be created.', 'rockntiara-reservations' ) );
		}

		$this->protect_directory( $waivers_directory );

		$birthday_child = $this->normalize_name_for_filename( $reservation['child_name'], 'birthdaychild' );
		$invited_child  = $guest
			? $this->normalize_name_for_filename( $guest['guest_name'], 'guest' )
			: 'host';
		$filename = wp_unique_filename(
			$directory,
			$birthday_child . '-' . $invited_child . '.pdf'
		);
		$absolute_path = trailingslashit( $directory ) . $filename;
		$pdf           = $this->build_document( $reservation, $waiver_data, $guest );

		if ( false === file_put_contents( $absolute_path, $pdf, LOCK_EX ) ) {
			return new WP_Error( 'rnta_waiver_pdf_write', __( 'The signed waiver PDF could not be written.', 'rockntiara-reservations' ) );
		}

		chmod( $absolute_path, 0640 );

		return array(
			'absolute_path' => $absolute_path,
			'relative_path' => 'waivers/' . $year . '/' . $month . '/' . $filename,
			'hash'          => hash_file( 'sha256', $absolute_path ),
		);
	}

	private function normalize_name_for_filename( $name, $fallback ) {
		$name = remove_accents( wp_strip_all_tags( (string) $name ) );
		$name = strtolower( $name );
		$name = preg_replace( '/[^a-z0-9]+/', '', $name );

		return '' !== $name ? $name : $fallback;
	}

	private function protect_directory( $directory ) {
		$index_path = trailingslashit( $directory ) . 'index.php';
		if ( ! file_exists( $index_path ) ) {
			file_put_contents( $index_path, "<?php\n// Silence is golden.\n", LOCK_EX );
		}

		$htaccess_path = trailingslashit( $directory ) . '.htaccess';
		if ( ! file_exists( $htaccess_path ) ) {
			$rules = "Options -Indexes\n<FilesMatch \"\\.pdf$\">\nRequire all denied\nDeny from all\n</FilesMatch>\n";
			file_put_contents( $htaccess_path, $rules, LOCK_EX );
		}

		$web_config_path = trailingslashit( $directory ) . 'web.config';
		if ( ! file_exists( $web_config_path ) ) {
			$rules = '<?xml version="1.0" encoding="UTF-8"?><configuration><system.webServer><security><requestFiltering><fileExtensions><add fileExtension=".pdf" allowed="false" /></fileExtensions></requestFiltering><directoryBrowse enabled="false" /></system.webServer></configuration>';
			file_put_contents( $web_config_path, $rules, LOCK_EX );
		}
	}

	private function build_document( $reservation, $waiver_data, $guest ) {
		$this->pages           = array();
		$this->page_index      = -1;
		$this->signature_image = $this->prepare_signature_image( $waiver_data['drawn_signature'] );
		$this->new_page();

		$participant = $guest ? $guest['guest_name'] : $waiver_data['child_name'];
		$guardian    = $waiver_data['signer_name'];
		$date        = ! empty( $reservation['confirmed_party_date'] ) ? $reservation['confirmed_party_date'] : $reservation['requested_party_date'];
		$time        = ! empty( $reservation['confirmed_start_time'] ) ? $reservation['confirmed_start_time'] : $reservation['requested_start_time'];
		$signed_at   = current_time( 'F j, Y g:i A' );

		$this->write_centered( 'Rock N Tiara', 31, 'F3', array( 0.88, 0.25, 0.49 ), 40 );
		$this->write_centered( 'SIGNED PARTICIPATION WAIVER', 11, 'F2', array( 0.72, 0.25, 0.45 ), 20 );
		$this->write_centered( 'Kids Spa & Birthday Celebrations', 10, 'F1', array( 0.44, 0.32, 0.37 ), 26 );
		$this->draw_rule();

		$this->write_heading( 'Celebration details' );
		$this->write_detail( 'Reservation', '#' . absint( $reservation['woo_order_id'] ) );
		$this->write_detail( 'Participant', $participant );
		$this->write_detail( 'Birthday child', $reservation['child_name'] );
		$this->write_detail( 'Party package', $reservation['party_name'] );
		$this->write_detail( 'Date and time', trim( $date . ' ' . $time ) );
		$this->write_detail( 'Location', RNTA_RESERVATIONS_VENUE_LABEL );

		$this->write_heading( 'Parent or guardian consent' );
		$this->write_paragraph(
			$guest
				? sprintf( 'By completing this consent, %s accepted the birthday invitation for %s and authorized participation in this celebration.', $guardian, $participant )
				: sprintf( '%s completed and signed this consent as the parent, legal guardian, or authorized adult for %s.', $guardian, $participant )
		);

		if ( $guest && ! empty( $guest['guest_birthdate'] ) ) {
			$this->write_detail( 'Participant birthday', $guest['guest_birthdate'] );
		}

		if ( $guest && ! empty( $guest['guest_age'] ) ) {
			$this->write_detail( 'Participant age', $guest['guest_age'] );
		}

		$this->write_heading( 'Waiver and release terms' );
		$sections = preg_split( '/\R{2,}/', trim( wp_strip_all_tags( $waiver_data['waiver_text_snapshot'] ) ) );
		foreach ( $sections as $section ) {
			$section = trim( $section );
			if ( '' === $section ) {
				continue;
			}

			$parts = explode( ': ', $section, 2 );
			if ( 2 === count( $parts ) && strlen( $parts[0] ) < 90 ) {
				$this->write_subheading( $parts[0] );
				$this->write_paragraph( $parts[1] );
			} else {
				$this->write_paragraph( $section );
			}
		}

		$this->ensure_space( $this->signature_image ? 245 : 145 );
		$this->write_heading( 'Electronic signatures' );
		$this->write_detail( 'Signer', $guardian );
		$this->write_detail( 'Relationship', $waiver_data['signer_relationship'] );
		if ( $guest ) {
			$this->write_detail( 'Consent method', 'Checkbox acceptance without guest signature' );
		} else {
			$this->write_detail( 'Typed signature', $waiver_data['typed_signature'] );
		}
		$this->write_detail( 'Signed', $signed_at );
		$this->write_detail( 'Waiver version', $waiver_data['waiver_text_version'] );
		$this->write_detail( 'IP address', $waiver_data['ip_address'] );

		if ( $this->signature_image ) {
			$this->ensure_space( 125 );
			$this->write_subheading( 'Hand-drawn signature' );
			$this->draw_signature_image();
		} elseif ( ! $guest ) {
			$this->write_paragraph( 'The hand-drawn signature is retained in the signed WordPress waiver record.' );
		}

		return $this->compile_pdf();
	}

	private function new_page() {
		$this->pages[]   = '';
		$this->page_index++;
		$this->cursor_y  = 744;
		$this->append( "q 0.95 0.48 0.67 rg 0 778 612 14 re f Q\n" );
	}

	private function ensure_space( $height ) {
		if ( $this->cursor_y - $height < 58 ) {
			$this->new_page();
		}
	}

	private function write_centered( $text, $size, $font, $color, $leading ) {
		$this->ensure_space( $leading );
		$width = strlen( $this->encode_text( $text ) ) * $size * 0.5;
		$x     = max( 54, ( 612 - $width ) / 2 );
		$this->draw_text( $text, $x, $this->cursor_y, $size, $font, $color );
		$this->cursor_y -= $leading;
	}

	private function write_heading( $text ) {
		$this->ensure_space( 40 );
		$this->cursor_y -= 8;
		$this->draw_text( $text, 54, $this->cursor_y, 16, 'F2', array( 0.86, 0.25, 0.48 ) );
		$this->cursor_y -= 25;
	}

	private function write_subheading( $text ) {
		$this->ensure_space( 30 );
		$this->draw_text( $text, 54, $this->cursor_y, 10, 'F2', array( 0.28, 0.20, 0.23 ) );
		$this->cursor_y -= 16;
	}

	private function write_detail( $label, $value ) {
		$this->ensure_space( 23 );
		$this->draw_text( $label . ':', 54, $this->cursor_y, 9, 'F2', array( 0.55, 0.39, 0.46 ) );
		$lines = $this->wrap_text( $value, 70 );
		foreach ( $lines as $index => $line ) {
			$this->draw_text( $line, 150, $this->cursor_y, 10, 'F1', array( 0.25, 0.18, 0.21 ) );
			if ( $index < count( $lines ) - 1 ) {
				$this->cursor_y -= 14;
				$this->ensure_space( 18 );
			}
		}
		$this->cursor_y -= 18;
	}

	private function write_paragraph( $text ) {
		$lines = $this->wrap_text( $text, 94 );
		$this->ensure_space( min( 72, count( $lines ) * 15 + 9 ) );
		foreach ( $lines as $line ) {
			$this->ensure_space( 18 );
			$this->draw_text( $line, 54, $this->cursor_y, 9.5, 'F1', array( 0.32, 0.24, 0.28 ) );
			$this->cursor_y -= 14;
		}
		$this->cursor_y -= 7;
	}

	private function draw_rule() {
		$this->ensure_space( 20 );
		$this->append( sprintf( "q 0.91 0.69 0.77 RG 0.8 w 190 %.2F m 422 %.2F l S Q\n", $this->cursor_y, $this->cursor_y ) );
		$this->cursor_y -= 18;
	}

	private function draw_signature_image() {
		$image = $this->signature_image;
		$scale = min( 250 / $image['width'], 82 / $image['height'], 1 );
		$width = $image['width'] * $scale;
		$height = $image['height'] * $scale;
		$y = $this->cursor_y - $height;
		$this->append( sprintf( "q %.2F 0 0 %.2F 54 %.2F cm /Im1 Do Q\n", $width, $height, $y ) );
		$this->append( sprintf( "q 0.91 0.69 0.77 RG 0.7 w 54 %.2F m %.2F %.2F l S Q\n", $y - 4, 54 + $width, $y - 4 ) );
		$this->cursor_y = $y - 18;
	}

	private function draw_text( $text, $x, $y, $size, $font, $color ) {
		$encoded = $this->escape_pdf_string( $this->encode_text( $text ) );
		$this->append(
			sprintf(
				"BT /%s %.2F Tf %.3F %.3F %.3F rg 1 0 0 1 %.2F %.2F Tm (%s) Tj ET\n",
				$font,
				$size,
				$color[0],
				$color[1],
				$color[2],
				$x,
				$y,
				$encoded
			)
		);
	}

	private function append( $operations ) {
		$this->pages[ $this->page_index ] .= $operations;
	}

	private function wrap_text( $text, $line_length ) {
		$text = html_entity_decode( wp_strip_all_tags( (string) $text ), ENT_QUOTES, 'UTF-8' );
		$text = preg_replace( '/\s+/u', ' ', trim( $text ) );
		return explode( "\n", wordwrap( $text, $line_length, "\n", true ) );
	}

	private function encode_text( $text ) {
		if ( function_exists( 'iconv' ) ) {
			$encoded = iconv( 'UTF-8', 'Windows-1252//TRANSLIT//IGNORE', (string) $text );
			if ( false !== $encoded ) {
				return $encoded;
			}
		}

		return preg_replace( '/[^\x20-\x7E]/', '', (string) $text );
	}

	private function escape_pdf_string( $text ) {
		return str_replace( array( '\\', '(', ')', "\r", "\n" ), array( '\\\\', '\\(', '\\)', '', ' ' ), $text );
	}

	private function prepare_signature_image( $data_url ) {
		$parts = explode( ',', (string) $data_url, 2 );
		if ( 2 !== count( $parts ) ) {
			return null;
		}

		$binary = base64_decode( $parts[1], true );
		if ( ! $binary || "\x89PNG\r\n\x1a\n" !== substr( $binary, 0, 8 ) ) {
			return null;
		}

		$offset     = 8;
		$width      = 0;
		$height     = 0;
		$bit_depth  = 0;
		$color_type = -1;
		$idat       = '';
		$length     = strlen( $binary );

		while ( $offset + 12 <= $length ) {
			$chunk_length = unpack( 'N', substr( $binary, $offset, 4 ) )[1];
			$chunk_type   = substr( $binary, $offset + 4, 4 );
			$chunk_data   = substr( $binary, $offset + 8, $chunk_length );
			$offset      += 12 + $chunk_length;

			if ( 'IHDR' === $chunk_type && 13 === $chunk_length ) {
				$header     = unpack( 'Nwidth/Nheight/Cbit_depth/Ccolor_type', $chunk_data );
				$width      = $header['width'];
				$height     = $header['height'];
				$bit_depth  = $header['bit_depth'];
				$color_type = $header['color_type'];
			} elseif ( 'IDAT' === $chunk_type ) {
				$idat .= $chunk_data;
			} elseif ( 'IEND' === $chunk_type ) {
				break;
			}
		}

		$channels = array( 0 => 1, 2 => 3, 4 => 2, 6 => 4 );
		if ( ! $width || ! $height || 8 !== $bit_depth || ! isset( $channels[ $color_type ] ) || '' === $idat ) {
			return null;
		}

		$decoded = gzuncompress( $idat );
		if ( false === $decoded ) {
			return null;
		}

		$bytes_per_pixel = $channels[ $color_type ];
		$row_length      = $width * $bytes_per_pixel;
		$position        = 0;
		$previous        = array_fill( 0, $row_length, 0 );
		$rgb             = '';
		$alpha           = '';

		for ( $row = 0; $row < $height; $row++ ) {
			if ( $position + 1 + $row_length > strlen( $decoded ) ) {
				return null;
			}

			$filter = ord( $decoded[ $position++ ] );
			$current = array_values( unpack( 'C*', substr( $decoded, $position, $row_length ) ) );
			$position += $row_length;

			for ( $column = 0; $column < $row_length; $column++ ) {
				$left       = $column >= $bytes_per_pixel ? $current[ $column - $bytes_per_pixel ] : 0;
				$up         = $previous[ $column ];
				$upper_left = $column >= $bytes_per_pixel ? $previous[ $column - $bytes_per_pixel ] : 0;

				if ( 1 === $filter ) {
					$current[ $column ] = ( $current[ $column ] + $left ) & 0xff;
				} elseif ( 2 === $filter ) {
					$current[ $column ] = ( $current[ $column ] + $up ) & 0xff;
				} elseif ( 3 === $filter ) {
					$current[ $column ] = ( $current[ $column ] + floor( ( $left + $up ) / 2 ) ) & 0xff;
				} elseif ( 4 === $filter ) {
					$current[ $column ] = ( $current[ $column ] + $this->paeth_predictor( $left, $up, $upper_left ) ) & 0xff;
				} elseif ( 0 !== $filter ) {
					return null;
				}
			}

			for ( $pixel = 0; $pixel < $width; $pixel++ ) {
				$base = $pixel * $bytes_per_pixel;
				if ( 6 === $color_type ) {
					$rgb   .= chr( $current[ $base ] ) . chr( $current[ $base + 1 ] ) . chr( $current[ $base + 2 ] );
					$alpha .= chr( $current[ $base + 3 ] );
				} elseif ( 2 === $color_type ) {
					$rgb .= chr( $current[ $base ] ) . chr( $current[ $base + 1 ] ) . chr( $current[ $base + 2 ] );
				} elseif ( 4 === $color_type ) {
					$rgb   .= str_repeat( chr( $current[ $base ] ), 3 );
					$alpha .= chr( $current[ $base + 1 ] );
				} else {
					$rgb .= str_repeat( chr( $current[ $base ] ), 3 );
				}
			}

			$previous = $current;
		}

		return array(
			'data'       => gzcompress( $rgb, 9 ),
			'alpha_data' => '' !== $alpha ? gzcompress( $alpha, 9 ) : '',
			'width'      => $width,
			'height'     => $height,
		);
	}

	private function paeth_predictor( $left, $up, $upper_left ) {
		$estimate = $left + $up - $upper_left;
		$left_distance = abs( $estimate - $left );
		$up_distance   = abs( $estimate - $up );
		$upper_distance = abs( $estimate - $upper_left );

		if ( $left_distance <= $up_distance && $left_distance <= $upper_distance ) {
			return $left;
		}

		return $up_distance <= $upper_distance ? $up : $upper_left;
	}

	private function compile_pdf() {
		foreach ( $this->pages as $index => $operations ) {
			$page_number = $index + 1;
			$operations .= sprintf( "BT /F1 8 Tf 0.52 0.40 0.45 rg 1 0 0 1 54 30 Tm (Rock N Tiara - Signed waiver) Tj ET\n" );
			$operations .= sprintf( "BT /F1 8 Tf 0.52 0.40 0.45 rg 1 0 0 1 520 30 Tm (Page %d) Tj ET\n", $page_number );
			$this->pages[ $index ] = $operations;
		}

		$objects = array(
			1 => '<< /Type /Catalog /Pages 2 0 R >>',
			2 => '',
			3 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
			4 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
			5 => '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>',
		);

		$next_id  = 6;
		$image_id = 0;
		if ( $this->signature_image ) {
			$image         = $this->signature_image;
			$alpha_id      = 0;
			if ( ! empty( $image['alpha_data'] ) ) {
				$alpha_id = $next_id++;
				$objects[ $alpha_id ] = '<< /Type /XObject /Subtype /Image /Width ' . absint( $image['width'] ) . ' /Height ' . absint( $image['height'] ) . ' /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ' . strlen( $image['alpha_data'] ) . ">>\nstream\n" . $image['alpha_data'] . "\nendstream";
			}

			$image_id = $next_id++;
			$smask    = $alpha_id ? ' /SMask ' . $alpha_id . ' 0 R' : '';
			$objects[ $image_id ] = '<< /Type /XObject /Subtype /Image /Width ' . absint( $image['width'] ) . ' /Height ' . absint( $image['height'] ) . ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode' . $smask . ' /Length ' . strlen( $image['data'] ) . ">>\nstream\n" . $image['data'] . "\nendstream";
		}

		$page_ids = array();
		foreach ( $this->pages as $content ) {
			$content_id = $next_id++;
			$page_id    = $next_id++;
			$objects[ $content_id ] = '<< /Length ' . strlen( $content ) . ">>\nstream\n" . $content . 'endstream';
			$resources = '<< /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>';
			if ( $image_id ) {
				$resources .= ' /XObject << /Im1 ' . $image_id . ' 0 R >>';
			}
			$resources .= ' >>';
			$objects[ $page_id ] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources ' . $resources . ' /Contents ' . $content_id . ' 0 R >>';
			$page_ids[] = $page_id;
		}

		$kids       = implode( ' ', array_map( function( $id ) { return $id . ' 0 R'; }, $page_ids ) );
		$objects[2] = '<< /Type /Pages /Kids [' . $kids . '] /Count ' . count( $page_ids ) . ' >>';
		ksort( $objects );

		$pdf     = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
		$offsets = array( 0 );
		foreach ( $objects as $id => $object ) {
			$offsets[ $id ] = strlen( $pdf );
			$pdf .= $id . " 0 obj\n" . $object . "\nendobj\n";
		}

		$xref = strlen( $pdf );
		$pdf .= 'xref' . "\n0 " . ( count( $objects ) + 1 ) . "\n";
		$pdf .= "0000000000 65535 f \n";
		for ( $id = 1; $id <= count( $objects ); $id++ ) {
			$pdf .= sprintf( "%010d 00000 n \n", $offsets[ $id ] );
		}

		$pdf .= 'trailer << /Size ' . ( count( $objects ) + 1 ) . ' /Root 1 0 R >>' . "\nstartxref\n" . $xref . "\n%%EOF";
		return $pdf;
	}
}
