@props(['problems', 'plan', 'scenes'])

{{-- The lesson's problems, grouped by scene (LessonProblems), in the one inspector panel. A row
     opens its scene; its button fixes that step. "Fix all" says first what it will do and what it
     spends: narration is billed per character, pictures per picture. --}}
@php $byScene = collect($problems)->groupBy('scene_id'); @endphp
<div class="space-y-4" data-problems-view>
    <div class="flex items-center justify-between gap-3">
        <p class="font-semibold text-primary">{{ __('Problems') }}</p>
        @if ($plan['scenes'] > 0)
            <div x-data="{ asking: false }" class="relative">
                <button type="button" x-on:click="asking = true" data-fix-all class="btn btn-primary btn-sm">{{ __('Fix all') }}</button>
                <div x-show="asking" x-cloak x-on:keydown.escape.window="asking = false" x-on:click.outside="asking = false"
                     class="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-700 bg-base-300 p-3 text-xs" data-fix-all-confirm>
                    <ul class="space-y-1 text-slate-300">
                        @if ($plan['narrations'])
                            <li>{{ trans_choice('{1} Re-narrate 1 scene (about :chars characters).|[2,*] Re-narrate :count scenes (about :chars characters).', $plan['narrations'], ['count' => $plan['narrations'], 'chars' => number_format($plan['characters'], 0, ',', '.')]) }}</li>
                        @endif
                        @if ($plan['pictures'])
                            <li>{{ trans_choice('{1} Make 1 picture again.|[2,*] Make :count pictures again.', $plan['pictures'], ['count' => $plan['pictures']]) }}</li>
                        @endif
                        @if ($plan['scripts'])
                            <li>{{ trans_choice('{1} Write 1 script again.|[2,*] Write :count scripts again.', $plan['scripts'], ['count' => $plan['scripts']]) }}</li>
                        @endif
                        @if ($plan['manual'])
                            <li class="text-panel-hint">{{ trans_choice('{1} 1 problem needs you.|[2,*] :count problems need you.', $plan['manual'], ['count' => $plan['manual']]) }}</li>
                        @endif
                    </ul>
                    <div class="mt-3 flex justify-end gap-2">
                        <button type="button" x-on:click="asking = false" class="btn btn-ghost btn-xs">{{ __('Cancel') }}</button>
                        <button type="button" x-on:click="asking = false; $wire.fixAllProblems()" data-fix-all-go class="btn btn-primary btn-xs">{{ __('Fix all') }}</button>
                    </div>
                </div>
            </div>
        @endif
    </div>

    @forelse ($byScene as $sceneId => $rows)
        <div class="space-y-1.5">
            <p class="text-prose uppercase tracking-widest text-panel-hint">{{ __('Scene') }} {{ $rows->first()['order'] }}</p>
            @foreach ($rows as $problem)
                <x-lesson.scene-problem-row :problem="$problem" :scene="$scenes->firstWhere('id', $sceneId)" jump />
            @endforeach
        </div>
    @empty
        <p class="text-xs text-panel-hint">{{ __('No problems.') }}</p>
    @endforelse
</div>
