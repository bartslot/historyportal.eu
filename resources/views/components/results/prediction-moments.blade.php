@props(['moments' => []])

{{-- Teacher Results, Predictions tab (App\Services\Predict\PredictionResults): per predict moment the
     levels of the WHY answers, then every answerer's prediction next to their why, the feedback they
     read, and the level. The teacher's level wins (overridePrediction). The prediction has no grade. --}}
@php
    $levelNames = [0 => __('No cause'), 1 => __('A factor'), 2 => __('The cause'), 3 => __('Cause and how')];
@endphp

<div class="space-y-4" data-prediction-results>
    @forelse ($moments as $moment)
        @php $total = array_sum($moment['levels']); @endphp
        <section class="rounded-xl border border-base-300 p-4 space-y-3" wire:key="predict-moment-{{ $moment['scene_id'] }}">
            <div>
                <p class="text-sm font-semibold">{{ $moment['question'] }}</p>
                @if ($moment['debrief'])
                    <p class="text-sm opacity-70">{{ $moment['debrief'] }}</p>
                @endif
            </div>

            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                @foreach ($moment['levels'] as $level => $count)
                    <div class="rounded-lg bg-base-200 p-2">
                        <div class="flex items-baseline justify-between gap-2">
                            <span class="text-xs opacity-70">{{ $level }} · {{ $levelNames[$level] }}</span>
                            <span class="font-bold tabular-nums">{{ $count }}</span>
                        </div>
                        <progress class="progress progress-primary w-full" value="{{ $count }}" max="{{ max(1, $total) }}"></progress>
                    </div>
                @endforeach
            </div>
            @if ($moment['ungraded'])
                <p class="text-xs text-warning">{{ trans_choice(':count answer needs your eye|:count answers need your eye', $moment['ungraded'], ['count' => $moment['ungraded']]) }}</p>
            @endif

            <div class="space-y-2">
                @foreach ($moment['rows'] as $row)
                    <div class="rounded-lg bg-base-200/60 px-3 py-2 text-sm">
                        <div class="flex flex-wrap items-start justify-between gap-2">
                            <span class="font-medium">{{ $row['name'] }}</span>
                            @if ($row['why_id'])
                                <label class="flex items-center gap-2 text-xs">
                                    <span class="opacity-70">{{ __('Level') }}</span>
                                    <select class="select select-xs select-bordered" aria-label="{{ __('Level for :name', ['name' => $row['name']]) }}"
                                            wire:change="overridePrediction({{ $row['why_id'] }}, $event.target.value)">
                                        <option value="">{{ $row['level'] !== null ? __('Grader: :level', ['level' => $row['level']]) : __('Not graded') }}</option>
                                        @foreach ($levelNames as $level => $name)
                                            <option value="{{ $level }}" @selected($row['override'] === $level)>{{ $level }} · {{ $name }}</option>
                                        @endforeach
                                    </select>
                                </label>
                            @endif
                        </div>
                        @if ($row['prediction'])
                            <p class="mt-1"><span class="opacity-60">{{ __('Prediction') }}:</span> {{ $row['prediction'] }}</p>
                        @endif
                        @if ($row['why'])
                            <p class="mt-1"><span class="opacity-60">{{ __('Why') }}:</span> {{ $row['why'] }}</p>
                        @endif
                        @if ($row['misconception'])
                            <p class="mt-1 text-xs text-warning">{{ __('Misconception') }}: {{ $row['misconception'] }}</p>
                        @endif
                        @if ($row['feedback'])
                            <p class="mt-1 border-l-2 border-primary/60 pl-2 text-xs opacity-80">{{ $row['feedback'] }}</p>
                        @endif
                        @if (in_array($row['status'], ['flagged', 'failed', 'pending'], true) && $row['override'] === null)
                            <span class="badge badge-sm badge-outline badge-warning mt-1">{{ $row['status'] === 'pending' ? __('Grading') : __('Read this one') }}</span>
                        @endif
                    </div>
                @endforeach
            </div>
        </section>
    @empty
        <p class="text-sm opacity-60">{{ __('No typed predictions yet. Paper answers are not stored.') }}</p>
    @endforelse
</div>
