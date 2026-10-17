{{-- One curriculum goal: its official text and the lessons that cover it. --}}
@php
    use App\Support\Seo;

    $title = $goal->label().': '.$goal->title;
    $description = \Illuminate\Support\Str::limit($goal->body ?: $goal->title, 155);
@endphp

<x-layouts.landing :title="$title">
    <x-slot:head>
        <x-seo :title="$title" :description="$description" />
    </x-slot:head>

    <x-landing.header />

    <main class="mx-auto max-w-4xl px-4 pb-16 pt-32 text-slate-300 sm:px-6">
        <nav class="text-xs" aria-label="Kruimelpad">
            <a href="{{ route('public.curriculum') }}" class="hover:text-primary">Curriculum</a>
            @if ($goal->parent)
                <span class="mx-2">/</span>
                <a href="{{ route('public.curriculum.goal', $goal->parent->slug) }}" class="hover:text-primary">{{ $goal->parent->label() }}</a>
            @endif
        </nav>

        <header class="mt-6">
            <p class="text-xs font-semibold uppercase tracking-eyebrow">{{ $goal->label() }}@if ($goal->period) · {{ $goal->period }}@endif</p>
            <h1 class="mt-3 font-history text-4xl font-light tracking-tight text-white sm:text-5xl">{{ $goal->title }}</h1>
        </header>

        @if ($goal->body)
            <div class="mt-8 space-y-4 text-lg leading-relaxed">
                @foreach (preg_split('/\n\s*\n/', $goal->body) as $paragraph)
                    <p>{{ $paragraph }}</p>
                @endforeach
            </div>
        @endif

        @if ($goal->source_url)
            <p class="mt-4 text-sm">
                Bron: <a href="{{ $goal->source_url }}" class="underline hover:text-white" rel="noreferrer" target="_blank">{{ parse_url($goal->source_url, PHP_URL_HOST) }}</a>
            </p>
        @endif

        @if ($goal->children->isNotEmpty())
            <section class="mt-12">
                <h2 class="font-history text-2xl font-light text-white">Kenmerkende aspecten</h2>
                <x-curriculum.goal-table class="mt-4" :goals="$goal->children" />
            </section>
        @endif

        <section class="mt-12">
            <h2 class="font-history text-2xl font-light text-white">Lessen</h2>
            @if ($lessons->isEmpty())
                <p class="mt-4">Er is nog geen les voor dit onderdeel.</p>
            @else
                <ul class="mt-4 grid gap-4 sm:grid-cols-2">
                    @foreach ($lessons as $lesson)
                        <li>
                            <a href="{{ Seo::url('lesson', ['slug' => Seo::lessonSlug($lesson)], Seo::lessonLocale($lesson)) }}"
                               class="block rounded-xl border border-slate-800 bg-slate-900/40 p-4 font-semibold transition hover:border-primary/40 hover:text-primary">
                                {{ $lesson->title ?: $lesson->topic }}
                            </a>
                        </li>
                    @endforeach
                </ul>
            @endif
        </section>
    </main>
</x-layouts.landing>
