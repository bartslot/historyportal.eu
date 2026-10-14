@props(['types', 'dark' => false])

{{-- The lesson-type badges on the title screen (Figma 2321:1423 / 1427 / 1431), only the ones
     App\Support\LessonTypes found true. Brand colours and geometry: .lp-type-badge in brand-kit.css. --}}
@if ($types !== [])
    <ul {{ $attributes->merge(['class' => 'flex gap-2 sm:gap-3']) }} data-lesson-types data-title-avoid data-title-piece="badges" data-badge-style="{{ $dark ? 'dark' : 'colour' }}" aria-label="{{ __('Lesson type') }}">
        @foreach ($types as $type)
            <li @class(['lp-type-badge w-16 sm:w-20 lg:w-24',
                        'bg-brand-ink' => $dark,
                        'bg-type-interactive' => ! $dark && $type === 'interactive',
                        'bg-type-comic' => ! $dark && $type === 'comic',
                        'bg-type-teams' => ! $dark && $type === 'teams'])
                data-type="{{ $type }}">
                <img src="{{ asset("images/lesson-types/{$type}.svg") }}" alt="">
                <span>{{ match ($type) { 'interactive' => __('Interactive'), 'comic' => __('Comic story'), 'teams' => __('Teams') } }}</span>
            </li>
        @endforeach
    </ul>
@endif
