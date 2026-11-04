@props(['scene'])

{{-- 2D or 3D (Figma 2409:1825, "scene-type"): a flat grid and a floor grid in perspective, the names as tooltips, on top of a story scene's inspector. 2D is the comic stage: pictures,
     panels, Ken Burns. 3D is the painted stage with its camera. Panorama, 3D World and Parallax are gone. --}}
<x-ui.segmented panel class="mb-3 w-full" name="scene-mode-{{ $scene->id }}" tab-class="flex-1" data-scene-mode
                :value="$scene->kind === 'stage25d' ? '3d' : '2d'"
                :options="[
                    ['2d', __('2D'), 'M4 4h16v16H4zM4 9.33h16M4 14.67h16M9.33 4v16M14.67 4v16'],
                    ['3d', __('3D'), 'M12 5.5 22 12l-10 6.5L2 12zM7 8.75l10 6.5M17 8.75l-10 6.5'],
                ]"
                on-change="$wire.setSceneMode($event.target.value)" />
