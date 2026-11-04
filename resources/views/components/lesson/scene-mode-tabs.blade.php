@props(['scene'])

{{-- 2D or 3D (Figma 2409:1825, "scene-type"): the flat grid and the floor tiles drawn there, the names as
     tooltips, on top of a story scene's inspector. 2D is the comic stage: pictures, panels, Ken Burns.
     3D is the painted stage with its camera. Panorama, 3D World and Parallax are gone. --}}
<x-ui.segmented panel class="mb-3 w-full" name="scene-mode-{{ $scene->id }}" tab-class="flex-1" data-scene-mode
                :value="$scene->kind === 'stage25d' ? '3d' : '2d'"
                :options="[['2d', __('2D'), \App\Support\TabIcons::FLAT], ['3d', __('3D'), \App\Support\TabIcons::FLOOR]]"
                on-change="$wire.setSceneMode($event.target.value)" />
