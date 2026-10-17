<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** curriculum:sync's report: what it applied, and what needs a person. */
class CurriculumChangedMail extends Mailable
{
    /**
     * @param  list<string>  $applied
     * @param  list<string>  $problems
     */
    public function __construct(public array $applied, public array $problems) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->problems === []
            ? 'Curriculum updated from the official sources'
            : 'Curriculum: official sources need a look');
    }

    public function content(): Content
    {
        $section = fn (string $heading, array $lines): string => $lines === []
            ? ''
            : '<h3>'.e($heading).'</h3><ul>'.implode('', array_map(fn (string $line) => '<li>'.e($line).'</li>', $lines)).'</ul>';

        return new Content(htmlString: '<p>History Portal compared its curriculum with the official sources.</p>'
            .$section('Applied', $this->applied)
            .$section('Needs a person (not applied)', $this->problems));
    }
}
