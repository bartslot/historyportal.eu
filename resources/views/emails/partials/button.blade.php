{{-- Bulletproof branded email button, fully rounded.
     Usage: @include('emails.partials.button', ['url' => 'https://…', 'label' => 'Click me'])

     TWO buttons, one shown per client, because Outlook on Windows renders through Word and ignores
     border-radius outright. Without the VML half, "fully rounded" would silently mean "rounded
     except for the school half of the audience", which is where Outlook still lives.

     - Everywhere else: a table cell with a pill radius. 999px rather than a computed half-height,
       so the shape survives anyone changing the padding later.
     - Outlook: v:roundrect with arcsize="50%", which is VML's way of saying pill.

     VML needs an explicit width, so it is estimated from the label: 15px bold Helvetica averages
     about 8.2px per character, plus the 28px padding either side. Only Outlook sees this number,
     and only its width is affected, so an imperfect estimate costs a little extra space rather
     than clipped text. The xmlns:v and xmlns:w declarations it relies on live on <html> in
     emails/layout.blade.php. --}}
@php($msoWidth = (int) round(56 + strlen($label) * 8.2))
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 24px auto;">
    <tr>
        <td align="center">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                         href="{{ $url }}" arcsize="50%" stroke="f" fillcolor="#fbbf24"
                         style="height: 44px; width: {{ $msoWidth }}px; v-text-anchor: middle;">
                <w:anchorlock/>
                <center style="color: #0f172a; font-family: Helvetica, Arial, sans-serif; font-size: 15px; font-weight: bold;">{{ $label }}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-- -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td align="center" bgcolor="#fbbf24" style="background-color: #fbbf24; border-radius: 999px;">
                        <a href="{{ $url }}" target="_blank" rel="noopener" style="display: inline-block; padding: 13px 30px; font-family: Helvetica, Arial, sans-serif; font-size: 15px; font-weight: bold; line-height: 1.2; color: #0f172a; text-decoration: none; border-radius: 999px;">{{ $label }}</a>
                    </td>
                </tr>
            </table>
            <!--<![endif]-->
        </td>
    </tr>
</table>
