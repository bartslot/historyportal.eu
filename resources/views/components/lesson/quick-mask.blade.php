@props(['aid', 'url', 'title' => ''])

{{-- Quick mask (Keynote's Instant Alpha) for a picture layer: press on a colour and drag to grow the
     selection, release to cut it out, Alt+press to bring a cut back. Saves a copy for this scene;
     the original picture stays as it is. Algorithm: resources/js/scene/quick-mask.js --}}
<div x-data="{
        open: false, busy: false, tol: null, canUndo: false, mask: null,
        async start() {
            this.open = true;
            this.$refs.dlg.showModal();
            const { mountQuickMask } = await window.loadQuickMask();
            this.mask = await mountQuickMask(this.$refs.art, this.$refs.film, @js($url),
                (s) => { this.tol = s.tolerance; this.canUndo = s.canUndo; });
        },
        close() { this.mask?.destroy(); this.mask = null; this.open = false; this.$refs.dlg.close(); },
        async save() {
            if (!this.mask || this.busy) return;
            this.busy = true;
            const blob = await this.mask.toBlob();
            const file = new File([blob], blob.type === 'image/webp' ? 'mask.webp' : 'mask.png', { type: blob.type });
            $wire.upload('maskedImage', file,
                () => { this.close(); this.busy = false; $wire.saveMaskedLayer({{ (int) $aid }}); },
                () => {
                    this.busy = false;
                    window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error',
                        message: @js(__('The mask could not be uploaded. Try again, or use a smaller picture.')) } }));
                });
        },
     }" wire:ignore>
    <button type="button" x-on:click="start()"
            class="btn btn-ghost btn-xs btn-square text-slate-500 hover:text-primary"
            aria-label="{{ __('Quick mask') }}"
            data-tooltip="{{ __('Quick mask: press on a colour and drag to cut it out. Alt+press brings it back.') }}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m7.848 8.25 1.536.887M7.848 8.25a3 3 0 1 1-5.196-3 3 3 0 0 1 5.196 3Zm1.536.887a2.165 2.165 0 0 1 1.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 1 1-5.196 3 3 3 0 0 1 5.196-3Zm1.536-.887a2.165 2.165 0 0 0 1.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863 2.077-1.199m0-3.328a4.323 4.323 0 0 1 2.068-1.379l5.325-1.628a4.5 4.5 0 0 1 2.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.33 4.33 0 0 0 10.607 12m3.736 0 7.794 4.5-.802.215a4.5 4.5 0 0 1-2.48-.043l-5.326-1.629a4.324 4.324 0 0 1-2.068-1.379M14.343 12l-2.882 1.664" />
        </svg>
    </button>

    <dialog x-ref="dlg" class="modal" x-on:close="open && close()">
        <div class="modal-box flex max-h-[92vh] w-[min(92vw,70rem)] max-w-none flex-col gap-3">
            <div class="flex items-center gap-3">
                <h3 class="flex-1 truncate font-semibold">{{ __('Quick mask') }} <span class="text-base-content/60">{{ $title }}</span></h3>
                <span class="text-xs tabular-nums text-base-content/60" x-show="tol !== null" x-text="'{{ __('Tolerance') }} ' + tol"></span>
                <button type="button" class="btn btn-ghost btn-sm btn-square" x-on:click="close()" aria-label="{{ __('Close') }}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {{-- Checkerboard shows what is transparent; the red film on top is the live selection. --}}
            <div class="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded"
                 style="background: repeating-conic-gradient(var(--color-base-300) 0 25%, var(--color-base-200) 0 50%) 0 0 / 20px 20px;">
                <div class="relative max-h-full max-w-full">
                    <canvas x-ref="art" class="block h-auto max-h-[70vh] w-auto max-w-full cursor-crosshair touch-none"></canvas>
                    <canvas x-ref="film" class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <button type="button" class="btn btn-ghost btn-sm" x-on:click="mask?.undo()" x-bind:disabled="!canUndo">{{ __('Undo') }}</button>
                <button type="button" class="btn btn-ghost btn-sm" x-on:click="mask?.reset()">{{ __('Reset') }}</button>
                <span class="flex-1"></span>
                <button type="button" class="btn btn-ghost btn-sm" x-on:click="close()">{{ __('Cancel') }}</button>
                <button type="button" class="btn btn-primary btn-sm" x-on:click="save()" x-bind:disabled="busy || !canUndo">
                    <span class="loading loading-spinner loading-xs" x-show="busy"></span>{{ __('Save') }}
                </button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>{{ __('Close') }}</button></form>
    </dialog>
</div>
