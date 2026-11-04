<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Under what right a library track may play in class.
 *
 * There is deliberately no "Suno free plan": since Suno's terms of 2026-09-03, songs made or
 * downloaded on the free plan are for personal use only, and History Portal is a paid product.
 */
enum MusicLicence: string
{
    case SunoPaid = 'suno_paid';   // downloaded from Suno on Pro or Premier
    case Own = 'own';              // made or commissioned by us
    case Cc0 = 'cc0';
    case CcBy = 'cc_by';           // attribution goes in licence_note
    case Other = 'other';          // a written licence; details in licence_note

    public function label(): string
    {
        return match ($this) {
            self::SunoPaid => __('Suno, paid plan'),
            self::Own => __('Our own music'),
            self::Cc0 => 'CC0',
            self::CcBy => 'CC BY',
            self::Other => __('Other licence'),
        };
    }
}
