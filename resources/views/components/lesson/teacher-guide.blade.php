{{-- What the class should learn from a lesson and how it fits the curriculum (lessons.teacher_guide).
     Content is in the lesson's own language and printed as written; only the labels go through __().
     Lives on the lesson's public page, never in the player: "not in the way of the experience". --}}
@props(['guide'])

@php
    $guide = (array) $guide;
    $label = 'text-xs font-semibold uppercase tracking-[0.2em] text-slate-500';
    $h2 = 'font-history text-2xl font-light text-white';
@endphp

<section id="teacher-guide" class="mt-12 space-y-12 text-base leading-relaxed text-slate-300">
    <div>
        <p class="{{ $label }}">{{ __('For the teacher') }}@if (! empty($guide['audience'])) · {{ $guide['audience'] }}@endif</p>
        <h2 class="{{ $h2 }} mt-3">{{ __('The main learning goal') }}</h2>
        <p class="mt-3 text-lg text-white">{{ $guide['goal'] }}</p>
    </div>

    @if (! empty($guide['objectives']))
        <div>
            <h2 class="{{ $h2 }}">{{ __('After the lesson, students can') }}</h2>
            <div class="mt-4 overflow-x-auto">
                <table class="table table-sm">
                    <thead>
                        <tr class="border-white/10 text-slate-500">
                            <th class="w-8">#</th>
                            <th>{{ __('Learning goal') }}</th>
                            <th>{{ __('What do they learn?') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($guide['objectives'] as $objective)
                            <tr class="border-white/10 align-top">
                                <td class="text-slate-500">{{ $loop->iteration }}</td>
                                <td class="font-semibold text-white">{{ $objective['question'] }}</td>
                                <td>{{ $objective['learn'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    @endif

    @if (! empty($guide['outcomes']))
        <div>
            <h2 class="{{ $h2 }}">{{ __('What they can do at the end') }}</h2>
            @if (! empty($guide['outcomes_intro']))
                <p class="mt-3">{{ $guide['outcomes_intro'] }}</p>
            @endif
            <div class="mt-6 grid gap-8 sm:grid-cols-3">
                @foreach ($guide['outcomes'] as $group)
                    <div class="border-t border-white/10 pt-4">
                        <h3 class="font-semibold text-white">{{ $group['heading'] }}</h3>
                        <ul class="mt-3 space-y-2 text-sm">
                            @foreach ($group['items'] as $item)
                                <li>{{ $item }}</li>
                            @endforeach
                        </ul>
                    </div>
                @endforeach
            </div>
        </div>
    @endif

    @if (! empty($guide['curriculum']))
        <div>
            <h2 class="{{ $h2 }}">{{ __('Curriculum') }}</h2>
            <div class="mt-4 overflow-x-auto">
                <table class="table table-sm">
                    <tbody>
                        @foreach ($guide['curriculum'] as $row)
                            <tr class="border-white/10">
                                <td class="font-semibold text-white">{{ $row['part'] }}</td>
                                <td>{{ $row['link'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @if (! empty($guide['curriculum_note']))
                <p class="mt-4 text-sm text-slate-400">
                    {{ $guide['curriculum_note'] }}
                    @if (! empty($guide['curriculum_source']))
                        <a href="{{ $guide['curriculum_source']['url'] }}" class="underline hover:text-white" rel="noreferrer" target="_blank">{{ $guide['curriculum_source']['label'] }}</a>
                    @endif
                </p>
            @endif
        </div>
    @endif

    @if (! empty($guide['guiding_questions']))
        <div>
            <h2 class="{{ $h2 }}">{{ __('The thread through the lesson') }}</h2>
            <ol class="mt-4 space-y-3">
                @foreach ($guide['guiding_questions'] as $question)
                    <li class="flex gap-4">
                        <span class="font-history text-2xl leading-none text-slate-500">{{ $loop->iteration }}</span>
                        <span class="text-white">{{ $question }}</span>
                    </li>
                @endforeach
            </ol>
            @foreach (['guiding_note', 'differentiation'] as $key)
                @if (! empty($guide[$key]))
                    <p class="mt-4">{{ $guide[$key] }}</p>
                @endif
            @endforeach
        </div>
    @endif

    @if (! empty($guide['faq']))
        <div>
            <h2 class="{{ $h2 }}">{{ __('Frequently asked questions') }}</h2>
            {{-- Same array as the FAQPage JSON-LD (Seo::lessonGraph), so markup and page cannot drift. --}}
            <div class="mt-4 border-t border-white/10">
                @foreach ($guide['faq'] as $item)
                    <div class="collapse collapse-arrow rounded-none border-b border-white/10">
                        <input type="checkbox" aria-label="{{ $item['q'] }}">
                        <div class="collapse-title px-0 font-semibold text-white">{{ $item['q'] }}</div>
                        <div class="collapse-content px-0"><p>{{ $item['a'] }}</p></div>
                    </div>
                @endforeach
            </div>
        </div>
    @endif
</section>
