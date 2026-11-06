{{-- What happens in an hour with a lesson: one real frame from a real lesson, then what the class and
     the teacher do. The words stay on the page, not behind a hover: a phone has no hover. --}}
@php
    use App\Support\DemoLesson;
    use App\Support\HelpMedia;
    use App\Support\ProductTour;
    use App\Support\Seo;

    $scene = HelpMedia::find('tour-scene', null, ProductTour::EXTENSION);
    $moments = [
        [__('The lesson stops and asks'), __('Questions appear while it plays, and the class answers on their own screens. You see where the room stands before you carry on.')],
        [__('Then the game starts'), __('Teams of three or four take a role, make a call, and live with what it costs. This is the part they are still arguing about at the door.')],
        [__('You see who got stuck'), __('Every answer is kept, so you can find the one question that lost half the class and reteach that, instead of the whole hour.')],
        [__('Nothing is fixed'), __('Rewrite a line, swap a painting, retake a voice. And nothing reaches your students until you publish it yourself.')],
    ];
@endphp

<section id="features" data-reveal-section class="border-t border-white/10 py-16 sm:py-24">
    <div class="section-container">
        <h2 data-reveal="heading" class="font-history text-3xl tracking-tight text-white md:text-4xl">{{ __('What the hour actually looks like') }}</h2>

        @if ($scene)
            <img src="{{ asset($scene['relative']) }}" alt="{{ __('A scene from the lesson about Abel Tasman') }}"
                 width="2880" height="1800" loading="lazy" decoding="async"
                 data-reveal="cards" class="mt-8 h-auto w-full rounded-xl">
        @endif

        <dl data-reveal="text" class="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            @foreach ($moments as [$moment, $what])
                <div>
                    <dt class="text-lg font-semibold text-white">{{ $moment }}</dt>
                    <dd class="mt-2 leading-relaxed text-base-content/70">{{ $what }}</dd>
                </div>
            @endforeach
        </dl>

        <h2 data-reveal="heading" class="mt-20 max-w-4xl font-history text-4xl leading-tight text-white md:text-6xl">
            {{ __('They will ask you to play the next one.') }}
        </h2>

        <div data-reveal="cta" class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="{{ DemoLesson::resolve() ? route('demo.configure') : '/login' }}" rel="nofollow" class="btn btn-primary">{{ __('Try it yourself') }}</a>
            <a href="{{ Seo::url('about') }}#how-it-works" class="link link-hover text-base-content">{{ __('See how it works') }}</a>
        </div>
    </div>
</section>
