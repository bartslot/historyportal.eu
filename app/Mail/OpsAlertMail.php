<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** ops:check found prod broken: what, in plain lines. */
class OpsAlertMail extends Mailable
{
    /** @param  list<string>  $problems */
    public function __construct(public array $problems) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'History Portal: something needs a look on prod');
    }

    public function content(): Content
    {
        return new Content(htmlString: '<p>ops:check found this on historyportal.eu:</p><ul>'
            .implode('', array_map(fn (string $line) => '<li>'.nl2br(e($line)).'</li>', $this->problems))
            .'</ul><p>Server log: storage/logs/laravel.log. Failed jobs: <code>php artisan queue:failed</code>.</p>');
    }
}
