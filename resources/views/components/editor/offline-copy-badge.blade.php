@props(['lesson'])

{{-- On a laptop: this lesson is an offline copy of a live one. A link to Offline lessons, where it goes back
     online (App\Livewire\OfflineLessons). Nothing on the live site, which keeps no copies. --}}
@if (config('offline_sync.remote') !== '' && \App\Models\OfflineCopy::query()->where('lesson_id', $lesson->id)->exists())
    <a href="{{ route('teacher.offline', ['lesson' => $lesson->id]) }}" class="btn btn-ghost btn-sm self-center" data-offline-copy-badge
       title="{{ __('Bring this lesson back online') }}">
        <span class="badge badge-outline badge-sm">{{ __('Offline copy') }}</span>
    </a>
@endif
