<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use Tests\TestCase;

/**
 * The auth pages share one guest layout. It declares the white-on-navy sign-in surface with
 * data-surface="auth" on <html>, which re-points the primary token to white (resources/css/app.css).
 * The logo is the only mark, so the amber "History Portal" wordmark text must not come back.
 */
class SignInSurfaceTest extends TestCase
{
    private const MARKER = 'data-surface="auth"';

    private const AMBER_WORDMARK = 'font-cinzel text-2xl font-bold tracking-wide text-primary';

    public function test_the_sign_in_page_is_the_auth_surface(): void
    {
        $this->get('/login')->assertOk()->assertSee(self::MARKER, false);
    }

    public function test_the_forgot_password_page_is_the_auth_surface(): void
    {
        $this->get('/forgot-password')->assertOk()->assertSee(self::MARKER, false);
    }

    public function test_the_reset_password_page_is_the_auth_surface(): void
    {
        $this->get('/reset-password/sample-token?email=teacher@school.edu')
            ->assertOk()
            ->assertSee(self::MARKER, false);
    }

    public function test_the_sign_in_page_has_no_amber_wordmark_above_the_card(): void
    {
        $this->get('/login')->assertOk()->assertDontSee(self::AMBER_WORDMARK, false);
    }

    public function test_the_logo_link_keeps_an_accessible_name_without_the_wordmark(): void
    {
        $this->get('/login')->assertOk()->assertSee('aria-label="History Portal"', false);
    }

    public function test_the_sign_in_button_uses_the_white_action_colour(): void
    {
        $this->get('/login')->assertOk()->assertSee('class="btn btn-primary w-full"', false);
    }
}
