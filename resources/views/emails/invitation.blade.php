{{-- V2 "Show the lesson", written for Brenda: a friend, and Bart's own French tutor of two years.

     No money anywhere, on Bart's instruction. Nothing free, no offer, no first-lesson-on-us. She is
     being asked to try something a friend built, and a price tag of any kind turns that into a
     pitch. For the same reason it is "I made it", not "a teacher made it".

     The navy band is FULL BLEED via the layout's hero slot, so it meets the sides of the message. --}}
@component('emails.layout')

    @slot('hero')
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0f172a" style="background-color: #0f172a; border-radius: 14px 14px 0 0;">
            <tr>
                <td bgcolor="#0f172a" style="background-color: #0f172a; padding: 34px 36px 32px 36px; border-radius: 14px 14px 0 0;">
                    <p style="margin: 0 0 14px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-style: italic; line-height: 1.42; color: #ffffff;">{{ __('“Enough is enough!” a politician shouts, slamming his fist on the wooden table.') }}</p>
                    <p style="margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #bae6fd;">{{ __('French flags hang beside Dutch symbols. Maps sprawl across the table. The future of the Republic hangs in the balance.') }}</p>
                </td>
            </tr>
        </table>
    @endslot

    <p style="margin: 0 0 16px 0;">{{ __(':greeting, that is how a lesson on the Batavian Republic opens. It is narrated aloud, the map moves behind it, and questions appear as it plays.', ['greeting' => $greeting]) }}</p>

    <p style="margin: 0 0 16px 0;">{{ __('I made it by typing in one topic. The script, the paintings and the voice were drafted in a few minutes, and then I edited them until they were right.') }}</p>

    <p style="margin: 0 0 8px 0;">{{ __('I would love you to have a go and tell me honestly what you think of it. Making one of your own takes about ten minutes.') }}</p>

    @include('emails.partials.button', ['url' => $url, 'label' => __('Explore History Portal')])

    <p style="margin: 0 0 4px 0; color: #475569; font-size: 14px;">{{ __('Thanks,') }}<br>{{ $senderName }}</p>
    <p style="margin: 0; color: #94a3b8; font-size: 13px;">{!! __('If anything gets in your way, just reply and tell me what broke. The :help covers each step too.', ['help' => '<a href="'.$helpUrl.'" style="color: #0369a1;">'.__('help centre').'</a>']) !!}</p>
@endcomponent
