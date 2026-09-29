<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * An invitation to come and try History Portal.
 *
 * Deliberately NOT tied to a User row. An invitation goes to someone who does not have an account
 * yet, which is the whole point of it, so it takes an address and a destination and nothing else.
 * The account is created when they follow the link and sign up.
 *
 * The greeting is a separate value rather than derived from a name here, because "Hello Brenda" and
 * "You are invited to History Portal" are both correct openings depending on whether we know who we
 * are writing to, and a mailable guessing at that is how you get "Hello ,".
 */
class InvitationMail extends Mailable
{
    public function __construct(
        public readonly string $url,
        public readonly string $greeting,
        public readonly string $senderName,
        public readonly string $helpUrl,
        /** Overrides the default subject. An invitation from a person reads better with one. */
        public readonly ?string $subjectLine = null,
    ) {
    }

    /**
     * No emoji and no em dash in the subject, unlike LowAiCreditsMail which predates that rule.
     * This one is read by a teacher who has never heard of us, so it is the first impression.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectLine
                ?? __('Your invitation to :app', ['app' => config('app.name') ?: 'History Portal']),
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.invitation');
    }
}
