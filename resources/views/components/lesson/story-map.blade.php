{{-- The story map: the lesson's scenes as cards, each Choices layer as a card of its own, and a line to wherever the class goes
     next (Bart, 2026-11-24). Drag a card to move it, drag a dot onto a scene to rewire, click a card for its settings.
     Everything is drawn by resources/js/editor/story-map.js from $wire.storyMap() and saved through the editor's own
     methods (EditsSceneLinks, EditsStoryMap), so it is wire:ignore: the editor's re-renders never touch it.
     Monochrome like the rest of the editor chrome (history-portal-ui): the selected card is the one light card. --}}
<div wire:ignore data-story-map
     x-data="{ async boot () {
         if (this.$refs.host.firstElementChild) return;
         window.storyMap = (await window.loadStoryMap()).storyMap;
         this.$refs.host.appendChild(this.$refs.map.content.cloneNode(true));
     } }"
     x-on:story-map-open.window="boot()">
    {{-- The map's code is fetched the first time it opens, so the editor does not carry it until then. Once it is
         in, the map listens for the button itself and opens on its own the first time (x-init). --}}
    <div x-ref="host" class="contents"></div>
    <template x-ref="map">
<div x-data="storyMap()" x-init="show()"
     x-on:story-map-open.window="show()"
     x-on:keydown.window.capture="keydown($event)">
    <div x-show="open" x-cloak
         class="fixed inset-0 z-[200] flex flex-col bg-card-surface"
         role="dialog" aria-modal="true" aria-label="{{ __('Story map') }}">

        <header class="flex h-14 shrink-0 items-center gap-1 border-b border-panel-hairline px-2">
            <button type="button" x-on:click="close()" data-story-map-close
                    class="grid h-11 w-11 place-items-center rounded-xl text-panel-icon transition hover:bg-base-200 hover:text-primary"
                    data-tooltip="{{ __('Back to the scene') }}" aria-label="{{ __('Back to the scene') }}">
                <x-ui.icon name="back" class="h-6 w-6" />
            </button>
            <h2 class="px-1 text-sm font-semibold text-panel-value">{{ __('Story map') }}</h2>

            <div class="ml-auto flex items-center gap-1">
                {{-- Every change saves at once: this says so, and says when one did not. --}}
                <span data-story-map-saved :data-state="saveState" aria-live="polite"
                      class="mr-2 flex h-8 items-center gap-2 rounded-full border border-panel-hairline px-3 text-xs text-panel-hint">
                    <span class="h-1.5 w-1.5 rounded-full"
                          :class="saveState === 'failed' ? 'bg-error' : (saveState === 'saving' ? 'bg-panel-label animate-pulse' : 'bg-panel-value')"></span>
                    <span x-show="saveState === 'saved'">{{ __('Saved') }}</span>
                    <span x-show="saveState === 'saving'" x-cloak>{{ __('Saving') }}</span>
                    <span x-show="saveState === 'failed'" x-cloak>{{ __('Not saved') }}</span>
                </span>
                <button type="button" class="btn btn-ghost btn-sm" x-on:click="tidy()" data-story-map-tidy
                        data-tooltip="{{ __('Lay the whole story out again') }}">{{ __('Tidy up') }}</button>
                <button type="button" class="btn btn-ghost btn-sm btn-square" x-on:click="zoomBy(1 / 1.25)"
                        data-tooltip="{{ __('Zoom out') }}" aria-label="{{ __('Zoom out') }}">
                    <x-ui.icon name="zoom-out" class="h-5 w-5" />
                </button>
                <button type="button" class="btn btn-ghost btn-sm btn-square" x-on:click="zoomBy(1.25)"
                        data-tooltip="{{ __('Zoom in') }}" aria-label="{{ __('Zoom in') }}">
                    <x-ui.icon name="zoom-in" class="h-5 w-5" />
                </button>
                <button type="button" class="btn btn-ghost btn-sm w-16 tabular-nums" x-on:click="zoomTo(1)" x-text="zoomLabel" data-story-map-zoom
                        data-tooltip="{{ __('Full size (0)') }}" aria-label="{{ __('Full size') }}"></button>
                <button type="button" class="btn btn-ghost btn-sm" x-on:click="fit()" data-story-map-fit
                        data-tooltip="{{ __('Show the whole story (F)') }}">{{ __('Fit') }}</button>
            </div>
        </header>

        <div class="relative min-h-0 flex-1 overflow-hidden">
            <div x-ref="viewport" data-story-map-viewport
                 class="story-map-grid absolute inset-0 touch-none select-none"
                 :class="wiring ? 'is-wiring cursor-crosshair' : 'cursor-grab active:cursor-grabbing'"
                 :style="gridStyle"
                 x-on:pointerdown="panStart($event)"
                 x-on:pointermove="pointerMove($event)"
                 x-on:pointerup="pointerUp($event)"
                 x-on:pointercancel="pointerUp($event)"
                 x-on:wheel.prevent="wheel($event)"
                 x-on:resize.window="measure()">
                <div class="absolute left-0 top-0 origin-top-left" :style="planeStyle">
                    {{-- The lines: SVG markup built from the links (no teacher text in it). --}}
                    <div class="pointer-events-none absolute left-0 top-0" x-effect="$el.innerHTML = edgesMarkup"></div>

                    {{-- The box a shift-drag draws: every card it touches is picked. --}}
                    <div x-show="marquee" x-cloak class="story-map-marquee pointer-events-none absolute left-0 top-0" :style="marqueeStyle"></div>

                    {{-- Scene cards --}}
                    <template x-for="scene in scenes" :key="'s' + scene.id">
                        <div class="absolute left-0 top-0 flex cursor-pointer items-center gap-3 rounded-xl border px-2 transition-colors"
                             :class="[isSelected('scene', scene.id) ? 'border-selected bg-selected text-card-action-label' : 'border-panel-hairline bg-panel-tile text-panel-value hover:border-panel-label',
                                      wiring && wiring.over === scene.id ? 'is-target ring-2 ring-panel-value' : '',
                                      isPicked('scene', scene.id) ? 'ring-2 ring-panel-label' : '']"
                             :style="nodeStyle('scene', scene.id)"
                             :data-map-scene="scene.id"
                             role="button" tabindex="0"
                             :aria-label="@js(__('Scene')) + ' ' + scene.number + ', ' + scene.name"
                             :aria-pressed="isSelected('scene', scene.id) ? 'true' : 'false'"
                             x-on:pointerdown="nodeStart($event, 'scene', scene.id)"
                             x-on:keydown.enter.stop="selected = { type: 'scene', id: scene.id }"
                             x-on:dblclick="openScene(scene.id)">
                            <span class="story-map-dot is-in -left-4" aria-hidden="true"></span>
                            <div class="relative aspect-video w-20 shrink-0 overflow-hidden rounded-md bg-panel-tile-active">
                                <img x-show="scene.image" :src="scene.image || ''" alt="" loading="lazy" decoding="async"
                                     class="h-full w-full object-cover" x-on:error="$el.style.display = 'none'" />
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="lp-card-label truncate" :class="isSelected('scene', scene.id) ? 'text-card-action-label' : 'text-panel-label'">
                                    <span x-text="@js(__('Scene')) + ' ' + scene.number"></span><span x-show="scene.ending">{{ ' · '.__('End') }}</span>
                                </p>
                                <p class="truncate text-prose leading-snug" x-text="scene.name"></p>
                            </div>
                            {{-- A new option: dragged onto a scene, it adds a choice at the end of this scene that goes there. --}}
                            <button type="button" class="story-map-dot -right-4" data-story-map-new-option
                                    x-on:pointerdown.stop="portStart($event, { type: 'scene', id: scene.id })"
                                    data-tooltip="{{ __('Drag onto a scene to add a choice that goes there') }}"
                                    aria-label="{{ __('Drag onto a scene to add a choice that goes there') }}"></button>
                        </div>
                    </template>

                    {{-- Choice cards: the Choices layer of a scene, one row per button. --}}
                    <template x-for="scene in choiceScenes" :key="'c' + scene.id">
                        <div class="absolute left-0 top-0 cursor-pointer rounded-xl border transition-colors"
                             :class="[isSelected('choice', scene.id) ? 'border-selected bg-selected text-card-action-label' : 'border-panel-hairline bg-panel-tile text-panel-value hover:border-panel-label',
                                      isPicked('choice', scene.id) ? 'ring-2 ring-panel-label' : '']"
                             :style="nodeStyle('choice', scene.id)"
                             :data-map-choices="scene.id"
                             role="button" tabindex="0"
                             :aria-label="@js(__('Choices')) + ', ' + @js(__('Scene')) + ' ' + scene.number"
                             :aria-pressed="isSelected('choice', scene.id) ? 'true' : 'false'"
                             x-on:pointerdown="nodeStart($event, 'choice', scene.id)"
                             x-on:keydown.enter.stop="selected = { type: 'choice', id: scene.id }">
                            <span class="story-map-dot is-in -left-4" :style="'top:' + (SIZE.choiceHead / 2) + 'px'" aria-hidden="true"></span>
                            <div class="flex flex-col justify-center px-3" :style="'height:' + SIZE.choiceHead + 'px'">
                                <p class="lp-card-label flex items-center gap-1.5" :class="isSelected('choice', scene.id) ? 'text-card-action-label' : 'text-panel-label'">
                                    <x-ui.icon name="layer-choices" class="h-4 w-4" />{{ __('Choices') }}
                                </p>
                                <p class="truncate text-xs leading-snug" x-text="scene.prompt || @js(__('What would you choose?'))"></p>
                            </div>
                            <template x-for="(link, i) in scene.links" :key="i">
                                <div class="relative flex items-center border-t px-3 text-prose"
                                     :class="isSelected('choice', scene.id) ? 'border-card-action-label/15' : 'border-panel-hairline'"
                                     :style="'height:' + SIZE.rowH + 'px'" :data-map-choice-row="i">
                                    <span class="min-w-0 flex-1 truncate" :class="link.label ? '' : 'opacity-60'"
                                          x-text="link.label || (link.to != null ? sceneLabel(link.to) : @js(__('Choice')) + ' ' + (i + 1))"></span>
                                    <span x-show="link.to == null" class="ml-2 shrink-0 text-xs opacity-70">{{ __('Not linked') }}</span>
                                    <button type="button" class="story-map-dot -right-4"
                                            x-on:pointerdown.stop="portStart($event, { type: 'choice', id: scene.id, index: i })"
                                            data-tooltip="{{ __('Drag onto the scene this choice leads to') }}"
                                            aria-label="{{ __('Drag onto the scene this choice leads to') }}"></button>
                                </div>
                            </template>
                        </div>
                    </template>
                </div>
            </div>

            <p class="pointer-events-none absolute bottom-3 left-3 flex h-8 items-center gap-2 rounded-full border border-panel-hairline bg-card-surface px-3 text-xs text-panel-hint">
                <span x-show="!edge && !picked.length">{{ __('Drag from a scene to add a choice, or from a choice to change where it goes') }}</span>
                <span x-show="edge" x-cloak>{{ __('Delete removes this line') }}</span>
                <span x-show="picked.length" x-cloak>{{ __('Drag one of the picked cards to move them together') }}</span>
            </p>

            {{-- The minimap: the whole story small, with the part on screen framed. Click or drag it to go there. --}}
            <div class="story-map-minimap absolute bottom-3 right-3 cursor-pointer overflow-hidden rounded-xl border border-panel-hairline bg-card-surface"
                 data-story-map-minimap
                 x-show="scenes.length" x-cloak
                 x-on:pointerdown="miniStart($event)"
                 x-on:pointermove="miniMove($event)"
                 x-on:pointerup="miniEnd()"
                 x-on:pointercancel="miniEnd()"
                 x-effect="$el.innerHTML = minimapMarkup"></div>

            {{-- The inspector: the selected card's settings, saved on change. --}}
            <aside x-show="sel" x-cloak data-story-map-inspector
                   class="absolute right-3 top-3 max-h-[calc(100%-11rem)] w-80 space-y-3 overflow-y-auto rounded-xl border border-panel-hairline bg-card-surface-raised p-3"
                   x-on:pointerdown.stop>
                <template x-if="sel && selected.type === 'scene'">
                    <div class="space-y-3">
                        <div>
                            <p class="lp-card-label text-panel-label" x-text="@js(__('Scene')) + ' ' + sel.number"></p>
                            <p class="text-prose text-panel-value" x-text="sel.name"></p>
                        </div>
                        <img x-show="sel.image" :src="sel.image || ''" alt="" class="aspect-video w-full rounded-md object-cover" />

                        <template x-if="!hasButtons(sel)">
                            <label class="block space-y-1">
                                <span class="lp-card-label text-panel-label">{{ __('Goes on to') }}</span>
                                <select class="select select-sm select-bordered w-full" data-story-map-next
                                        x-on:change="setNext(sel.id, $event.target.value)">
                                    <option value="next" :selected="nextOf(sel) === 'next'">{{ __('The next scene in the list') }}</option>
                                    <template x-for="s in scenes.filter((s) => s.id !== sel.id)" :key="s.id">
                                        <option :value="s.id" :selected="nextOf(sel) === s.id" x-text="s.number + '. ' + s.name"></option>
                                    </template>
                                    <option value="end" :selected="nextOf(sel) === 'end'">{{ __('The lesson ends here') }}</option>
                                </select>
                            </label>
                        </template>

                        <div class="flex flex-wrap gap-2">
                            <button type="button" class="btn btn-sm" x-on:click="openScene(sel.id)" data-story-map-open-scene>{{ __('Open scene') }}</button>
                            <button type="button" class="btn btn-ghost btn-sm" x-on:click="playFrom(sel.id)">{{ __('Play from here') }}</button>
                            <button type="button" class="btn btn-ghost btn-sm" x-show="sel.canChoose && !hasButtons(sel)"
                                    x-on:click="addChoices(sel.id)" data-story-map-add-choices>{{ __('Add choices') }}</button>
                            <button type="button" class="btn btn-ghost btn-sm" x-show="hasButtons(sel)"
                                    x-on:click="selected = { type: 'choice', id: sel.id }">{{ __('Edit choices') }}</button>
                        </div>
                    </div>
                </template>

                <template x-if="sel && selected.type === 'choice'">
                    <div class="space-y-3">
                        <p class="lp-card-label text-panel-label" x-text="@js(__('Choices')) + ' · ' + @js(__('Scene')) + ' ' + sel.number"></p>
                        <textarea rows="2" class="textarea textarea-sm textarea-bordered w-full resize-none leading-snug"
                                  maxlength="{{ \App\Services\Lessons\ChoicePrompt::MAX }}"
                                  x-show="sel.links.length >= 2" :value="sel.prompt"
                                  x-on:change="setPrompt(sel.id, $event.target.value)"
                                  placeholder="{{ __('What the narrator asks') }}" aria-label="{{ __('What the narrator asks') }}"></textarea>

                        <template x-for="(link, i) in sel.links" :key="sel.id + '-' + i + '-' + sel.links.length">
                            <div class="space-y-1" data-story-map-choice>
                                <div class="flex items-center gap-1">
                                    <input type="text" maxlength="{{ \App\Services\Lessons\SceneLinks::LABEL_MAX }}"
                                           :value="link.label" x-on:change="setLabel(sel.id, i, $event.target.value)"
                                           placeholder="{{ __('Button text') }}" aria-label="{{ __('Button text') }}"
                                           class="input input-sm input-bordered min-w-0 flex-1" />
                                    <button type="button" class="btn btn-ghost btn-sm btn-square text-panel-hint"
                                            x-on:click="removeChoice(sel.id, i)"
                                            data-tooltip="{{ __('Remove choice') }}" aria-label="{{ __('Remove choice') }}">
                                        <x-ui.icon name="close" class="h-4 w-4" />
                                    </button>
                                </div>
                                <select class="select select-sm select-bordered w-full" aria-label="{{ __('Goes to') }}"
                                        x-on:change="setTarget(sel.id, i, $event.target.value)">
                                    <option value="" :selected="link.to == null">{{ __('Pick a scene') }}</option>
                                    <template x-for="s in scenes" :key="s.id">
                                        <option :value="s.id" :selected="link.to === s.id" x-text="s.number + '. ' + s.name"></option>
                                    </template>
                                </select>
                            </div>
                        </template>

                        <div class="flex flex-wrap gap-2">
                            <button type="button" class="btn btn-sm" x-show="sel.links.length < {{ \App\Services\Lessons\SceneLinks::MAX_LINKS }}"
                                    x-on:click="addChoice(sel.id)" data-story-map-add-choice>{{ __('Add choice') }}</button>
                            <button type="button" class="btn btn-ghost btn-sm" x-on:click="removeChoices(sel.id)">{{ __('Remove choices') }}</button>
                        </div>
                    </div>
                </template>
            </aside>
        </div>
    </div>
</div>
    </template>
</div>
