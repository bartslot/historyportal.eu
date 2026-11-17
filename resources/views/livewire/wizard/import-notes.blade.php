<div>
    @if ($report)
        {{-- Shown once after an import, over the stage's bottom edge; Close keeps it closed. --}}
        <div class="fixed bottom-6 left-1/2 z-70 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-base-content/15 bg-base-200 p-4 text-sm text-base-content"
             role="status" data-import-notes>
            <div class="flex items-start gap-3">
                <div class="min-w-0 flex-1">
                    <p class="font-semibold">{{ __('Imported from Twine: :scenes scenes, :decisions Decision points.', ['scenes' => $report['scenes'] ?? 0, 'decisions' => $report['decisions'] ?? 0]) }}</p>
                    @if (! empty($report['notes']))
                        <ul class="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-base-content/80">
                            @foreach ($report['notes'] as $note)
                                <li>{{ $note }}</li>
                            @endforeach
                        </ul>
                    @endif
                </div>
                <button type="button" wire:click="dismiss" class="btn btn-ghost btn-sm" data-import-notes-close>{{ __('Close') }}</button>
            </div>
        </div>
    @endif
</div>
