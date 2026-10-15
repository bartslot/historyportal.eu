<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full" data-theme="learningportal">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $lesson->title }} — History Portal</title>
    {{-- lesson-map.js (+ the ~1 MB MapLibre/volcanoes chunk) is loaded on demand by
         lesson-player.js only when a lesson actually contains a map scene. --}}
    @vite(['resources/css/app.css', 'resources/js/app.js', 'resources/js/lesson-player.js'])
    <x-font-switch />
    <x-audio-manifest />
    <x-js-lang />
    @php
        // The title screen: a comic candidate's poster (TitlePoster), or null for the logo / plain title.
        $titleStyle = $lesson->titleStyle();
        $titlePoster = $lesson->titlePoster();
        $titleFont = $titlePoster['subtitle']['font'] ?? null;
    @endphp
    @if ($titleFont === 'comic' || ($titlePoster && $lesson->expect))
        {{-- The comic poster's subtitle lettering and the expect strip (Figma: Coming Soon). --}}
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Coming+Soon&display=swap">
    @endif
    @if ($titleFont === 'lettering')
        {{-- The comic cover's live subtitle is set in ComicRoma Lettering Bold (app.css @font-face);
             a cover whose recipe picks ComicRoma loads that face on demand. --}}
        <link rel="preload" href="{{ asset('fonts/comic-lettering/ComicRomaLettering-Bold.woff2') }}" as="font" type="font/woff2" crossorigin>
    @endif
    @if ($lesson->hasBalloons())
        {{-- Speech balloon lettering (app.css @font-face 'ComicRoma Balloon'). --}}
        <link rel="preload" href="{{ asset('fonts/balloon/ComicRomaBalloon-SemiBold.woff2') }}" as="font" type="font/woff2" crossorigin>
    @endif
</head>
<body class="h-full overflow-hidden bg-[#020617]">
{{-- LessonPlayerController switches the locale to the lesson's language when the interface ships
     it, so <html lang>, the chrome and the JS strings all speak the lesson's language. Content
     surfaces still carry the lesson language explicitly: for a lesson in a language the interface
     doesn't ship, the chrome stays in the visitor's locale while the content is read correctly. --}}
@php $contentLang = $lesson->language ?: str_replace('_', '-', app()->getLocale()); @endphp

{{-- ── Lesson data passed to JS ────────────────────────────────────────────── --}}
@php
    $lessonData = [
        'id'                    => $lesson->id,
        'title'                 => $lesson->title,
        'topic'                 => $lesson->topic,
        'subject'               => $lesson->subject,
        'grade_level'           => $lesson->grade_level,
        'historical_figure'     => $lesson->historical_figure,
        'script'                => $lesson->script,
        'duration_seconds'      => $lesson->duration_seconds,
        'audio_url'             => $lesson->audioUrl(),
        'visemes_url'           => $lesson->visemesUrl(),
        'portrait_url'          => $lesson->portraitUrl(),
        'slideshow_images'      => $lesson->slideshowImages(),
        'lesson_code'           => $lesson->lesson_code,
        'avatar_glb_url'        => null, // 3D avatar retired — avatars are a 2D image + ElevenLabs voice
        'avatar_gender'         => strtolower($lesson->narrator?->gender ?? 'male'),
        'narrator_welcome_url'      => $lesson->narrator?->welcomeVideoUrl(),
        'narrator_welcome_lite_url' => $lesson->narrator?->welcomeVideoLiteUrl(),
        'game_duration_seconds' => $lesson->strategyGame ? $lesson->strategyGame->duration_minutes * 60 : 600,
        'game_title'            => $lesson->strategyGame?->title,
        'game_instructions'     => $lesson->strategyGame?->instructions,
        'era'                   => $lesson->era,
        'region'                => $lesson->region,

        // Does this lesson start with the narration written along the bottom? The teacher sets the
        // starting state; the student can still toggle it (C) while it plays.
        'subtitles'             => (bool) $lesson->subtitles,
        // The Audio & Subtitles panel: narration languages (translation_group siblings) and the
        // subtitle languages, each in its own name. Other-language captions come from captions_url.
        'source_language'       => \App\Services\Captions\CaptionTranslator::sourceLanguage($lesson),
        'audio_languages'       => $audioLanguages ?? [],
        'caption_languages'     => collect(\App\Services\Captions\CaptionTranslator::LANGUAGES)
            ->map(fn ($name, $code) => ['code' => $code, 'name' => $name])->values(),
        'captions_url'          => $lesson->lesson_code
            ? route('lesson.captions', ['lessonCode' => $lesson->lesson_code, 'language' => '__LANG__'])
            : null,

        // Does a music bed play under the narration? Off unless the teacher turned it on — most
        // lessons run on a classroom speaker, where music under a voice is the last thing wanted.
        'background_music'      => (bool) $lesson->background_music,
        'include_game'          => (bool) $lesson->include_game,
        'game_type'             => $lesson->game_type,
        'game_config'           => $lesson->game_config,
        // DELIBERATE: correct_index ships to the client — grading is client-side by design
        // (low-stakes in-class quiz; mitigations = server score clamp + integrity telemetry
        // + teacher-eyes-only flags in QuizLeaderboardController). Server-side grading is
        // the v2 path if stakes rise.
        'quiz_questions'        => $lesson->quizQuestions->whereNull('scene_id')->map->only(['question', 'options', 'correct_index', 'asks_ahead', 'explanation'])->values(),
        'quiz_timing'           => $lesson->quiz_timing,
        'cover_image_url'       => $lesson->titleBgUrl() ?? $lesson->cardImageUrl(),
        // Where the lesson TEXT came from. The per-scene image credit rides on each scene below and
        // joins this on the same line, because a CC BY image has to say who made it.
        'source_attribution'    => $lesson->sourceAttribution(),
        'title_bg_url'          => $lesson->titleBgUrl(),
        // How the title screen draws the name (the teacher's choice or the series' default).
        // A series wordmark (public/lesson-logos/{translation_group}.svg) replaces the plain title's
        // lead-in; a comic candidate (public/lesson-titles/{translation_group}/{candidate}/poster.json)
        // replaces the whole picture. Each is null unless it is the style in use.
        'title_style'           => $titleStyle,
        'title_logo_url'        => $titleStyle === \App\Support\TitlePoster::LOGO ? $lesson->titleLogoUrl() : null,
        'title_poster'          => $titlePoster,
        // The lesson-type badges (LessonTypes), drawn on the title screen; [] when hidden.
        'lesson_types'          => $lesson->titleBadges(),
        // The join QR's place (auto, a corner, hidden; resources/js/title-qr.js) and the boxes a
        // logo/plain title picture keeps clear of it (% of the picture; a candidate has its own).
        'qr_position'           => $lesson->qrPosition(),
        'title_keep_clear'      => \App\Support\TitlePoster::keepClear($lesson->title_keep_clear),
        // "What you can expect": 1-3 short lines on the title screen.
        'expect'                => array_values((array) ($lesson->expect ?? [])),
        'intro_text'            => $lesson->outline['scene_briefs'][0]['scenePurpose']
                                    ?? $lesson->details
                                    ?? $lesson->topic,
        'scene_images'          => $lesson->relationLoaded('scenes')
            ? $lesson->scenes->where('image_path', '!=', null)->map(fn($s) => ['url' => \App\Support\MediaUrl::of($s->image_path)])->values()
            : [],
        'scenes'                => $lesson->relationLoaded('scenes')
            ? $lesson->scenes->map(fn($s) => [
                'id'          => $s->id,   // lets the teacher-preview "Edit scene" deep-link to this exact scene
                'order'       => $s->order,
                'kind'        => $s->kind,
                'config'      => $s->config,
                'diorama_assets' => \App\Services\Diorama\LibraryAssets::forScene($s),
                'chapter_name' => $s->chapterName(),
                'year'        => $s->year,
                'location'    => $s->location,
                'branch_group'        => $s->branch_group,
                'branch_role'         => $s->branch_role,
                'branch_choice_label' => $s->branch_choice_label,
                'game_type'   => $s->game_type,
                'scene_view'  => $s->scene_view,
                'audio_url'   => $s->audioUrl(),
                'script'      => $s->script_segment,
                'image_url'   => \App\Support\MediaUrl::of($s->image_path),
                // Attribution for a sourced painting or photograph. Commons images are mostly CC BY
                // or CC BY-SA, which oblige us to name the author wherever the image is shown.
                'image_credit' => $s->config['image_credit'] ?? null,
                'shots'       => collect($s->shots ?? [])->map(fn($shot) => [
                    'image_url'       => \App\Support\MediaUrl::of($shot['image_path'] ?? null),
                    // bg_url/hero_url (E3b story-pack shots): the player renders these as
                    // parallax layers when bg_url is present, flat image_url otherwise.
                    'bg_url'          => \App\Support\MediaUrl::of($shot['bg_path'] ?? null),
                    'hero_url'        => \App\Support\MediaUrl::of($shot['hero_path'] ?? null),
                    // Multiplane layers (E3c): [{path|url, depth, kind, scale, height, sway}] back→front.
                    'layers'          => collect($shot['layers'] ?? [])->map(fn($l) => [
                        'url'    => !empty($l['path']) ? \App\Support\MediaUrl::of($l['path']) : ($l['url'] ?? null),
                        // asset_id + x/y drive the free-positioned clipart overlay (voyage-map layers).
                        'asset_id' => isset($l['asset_id']) ? (int) $l['asset_id'] : null,
                        'x'      => isset($l['x']) ? (float) $l['x'] : null,
                        'y'      => isset($l['y']) ? (float) $l['y'] : null,
                        'depth'  => (float) ($l['depth'] ?? 1),
                        'kind'   => in_array($l['kind'] ?? 'cover', ['cover', 'figure', 'strip'], true) ? ($l['kind'] ?? 'cover') : 'cover',
                        'scale'  => (float) ($l['scale'] ?? 1),
                        'height' => isset($l['height']) ? (float) $l['height'] : null,
                        // Optional explicit width (the editor's unlocked aspect). The wizard payload
                        // already carried it; without it here a stretched sea strip played narrower
                        // in class than the teacher set it.
                        'width'  => isset($l['width']) ? (float) $l['width'] : null,
                        'sway'   => (bool) ($l['sway'] ?? false),
                        // Artistic controls (E3c-b): blur px, opacity 0-1, blend mode, wobble 0-2, z override.
                        'blur'    => isset($l['blur']) ? (float) $l['blur'] : null,
                        'opacity' => isset($l['opacity']) ? (float) $l['opacity'] : null,
                        'blend'   => in_array($l['blend'] ?? null, ['multiply', 'screen', 'overlay', 'darken', 'lighten'], true) ? $l['blend'] : null,
                        // Colour treatment — knock out the paper, drain the colour, recolour the
                        // ink. All three travel together: a tint without its white key would
                        // paint the paper back in, so the class would see something the teacher
                        // never set up.
                        'white_key' => isset($l['white_key']) ? (float) $l['white_key'] : null,
                        'grayscale' => ! empty($l['grayscale']),
                        'tint'    => preg_match('/^#[0-9a-fA-F]{6}$/', (string) ($l['tint'] ?? '')) ? $l['tint'] : null,
                        // Pinned to a place on the map beneath the stage, rather than to the stage.
                        'anchor'  => ($l['anchor'] ?? null) === 'map' ? 'map' : null,
                        'lng'     => isset($l['lng']) ? (float) $l['lng'] : null,
                        'lat'     => isset($l['lat']) ? (float) $l['lat'] : null,
                        'wobble'  => isset($l['wobble']) ? (int) $l['wobble'] : null,
                        'z'       => isset($l['z']) ? (int) $l['z'] : null,
                        // 3D / video layers ride as an iframe embed instead of an image.
                        'embed'   => isset($l['embed']) && is_array($l['embed']) ? $l['embed'] : null,
                        // Ambient motion (drift / breeze / bob / flutter), validated to the known vocabulary.
                        ...\App\Services\Support\LayerAmbient::payload($l),
                        // The angle and mirroring the teacher set (a tilt so two copies of one
                        // sprite never look like twins), and how the layer blends into the scene.
                        'rotation' => isset($l['rotation']) ? (float) $l['rotation'] : null,
                        'flip_x'  => ! empty($l['flip_x']),
                        'flip_y'  => ! empty($l['flip_y']),
                        ...\App\Services\Support\LayerSitIn::payload($l),
                        'occlude' => ! empty($l['occlude']),
                    ])->filter(fn($l) => $l['url'] || $l['embed'])->values()->all() ?: null,
                    'anchor_sentence' => $shot['anchor_sentence'] ?? null,
                    // The panel's own camera move and entry (resources/js/scene/camera.js).
                    'camera' => \App\Services\Support\ShotCamera::payload($shot['camera'] ?? null),
                    'entry' => \App\Services\Support\ShotCamera::entry($shot['entry'] ?? null),
                    // Keep a shot with EITHER a background image OR clipart layers — a voyage scene's
                    // shot is layer-only (the map is the backdrop), so it has no image_url.
                ])->filter(fn($shot) => $shot['image_url'] || !empty($shot['layers']))->values()->all() ?: null,
                'alignment'   => $s->audio_alignment ?: null,
                'duration_seconds' => $s->duration_seconds,
                // The chapter bar's segment: length, whether it is an estimate, and the label type.
                'timeline'    => $s->timelineSeconds(),
                'background_color' => $s->background_color,
                'background_gradient' => $s->config['background_gradient'] ?? null,
                // Same deliberate trade-off as lesson-level quiz_questions above:
                // correct_index is client-visible; grading stays client-side for v1.
                'quiz_questions' => $s->kind === 'game'
                    ? ($lesson->quizQuestions->where('scene_id', $s->id)->values()->whenEmpty(fn () => $lesson->quizQuestions->whereNull('scene_id')->values()))
                        ->map->only(['question', 'options', 'correct_index', 'asks_ahead', 'explanation'])->values()
                    : null,
                'quiz_shuffle' => $s->kind === 'game' ? (($s->config ?? [])['quiz_shuffle'] ?? 'per_player') : null,
                'kb_animated' => (bool) ($s->kb_animated ?? true),
                'kb_direction' => $s->kb_direction,
              ])->values()
            : [],
        'intel_drop_enabled'    => $lesson->intel_drop_enabled,
        'intel_drop_at_seconds' => $lesson->intel_drop_enabled ? ($lesson->intel_drop_at_minutes * 60) : null,
        'intel_drop_message'    => $lesson->intel_drop_script,
        'intel_drop_audio_url'  => $lesson->intel_drop_audio_path
            ? \Illuminate\Support\Facades\Storage::disk('public')->url($lesson->intel_drop_audio_path)
            : null,
        'leaderboard_url'       => route('lesson.leaderboard', ['lessonCode' => $lesson->lesson_code]),
        'quiz_score_url'        => route('lesson.quiz-score', ['lessonCode' => $lesson->lesson_code]),
        'has_classroom'         => $lesson->classrooms()->exists(),
        'estimated_minutes'     => $lesson->relationLoaded('scenes') ? $lesson->estimatedMinutes() : null,
        // A student can't skip a quiz question; the teacher testing their own lesson can.
        'can_skip_quiz'         => (bool) auth()->user()?->canManage($lesson),
        // Harbour race on the teams' phones (HarbourRace): only a lesson manager opens one.
        'race'                  => auth()->user()?->canManage($lesson) ? [
            'store_url'      => route('race.store', ['lessonCode' => $lesson->lesson_code]),
            'run_url'        => url('/races'),
            'device_url'     => url('/race'),
            'screen_poll_ms' => (int) config('race.screen_poll_ms'),
        ] : null,
    ];
@endphp
{{-- The lesson payload is the heaviest thing on this page (mostly per-character narration timings:
     ~740 KB on a six-scene lesson). Blade's bare @json also escapes every quote, apostrophe and
     ampersand as \u00XX, which inflates it ~2.5x for nothing: inside a <script> block the only
     sequence that can break out is "</script", so escaping < and > (JSON_HEX_TAG) is the part that
     actually matters for safety. Keeping HEX_TAG and dropping the rest cuts the page by ~450 KB
     with no change in behaviour. --}}
<script>
    window.LESSON = @json($lessonData, JSON_HEX_TAG | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
</script>

{{-- ── Full-screen game stage ──────────────────────────────────────────────── --}}
<div
    id="lesson-stage" x-cloak
    x-data="lessonGame(window.LESSON)"
    x-init="init()"
    class="relative w-screen h-screen overflow-hidden"
>

    {{-- ── LAYER 0: Background images (Ken Burns) ───────────────────────── --}}
    <div id="background-layer" class="absolute inset-0 z-0" aria-hidden="true">
        {{-- Populated by lesson-player.js --}}
    </div>

    {{-- Teacher text annotations per scene (links open an iframe modal). z-31: above the map stage
         (z-20) so text a teacher placed on a voyage/history map is visible, below the quiz overlay. --}}
    <div id="lesson-text-overlay" lang="{{ $contentLang }}" class="absolute inset-0 z-31 pointer-events-none"></div>
    {{-- Teacher clipart layers a scene carries ON TOP of the voyage map. z-30 (below text) by default,
         raised to z-32 when the teacher stacked clipart above text — mirrors the editor's ordering.
         Read-only in playback (pointer-events:none) so it never steals a map pan. --}}
    {{-- No z class here: the layer NODES carry the level (ArtworkOverlay.setStackLevels(30, 32)).
         A positioned host with a z-index is a stacking context, which would trap a layer's blend
         mode inside this overlay and leave Multiply with nothing to blend against. --}}
    <div id="lesson-voyage-art" class="absolute inset-0 pointer-events-none" style="display:none"></div>
    {{-- Speech balloons of a scene told in lines (BalloonLayer.js): above the figures and texts,
         below the subtitles and the player chrome. --}}
    <div id="lesson-balloons" lang="{{ $contentLang }}" class="absolute inset-0 pointer-events-none" style="z-index:33"></div>

    {{-- Quiz question cards (QuizOverlay mounts here during quiz segments). --}}
    <div id="lesson-game-overlay" lang="{{ $contentLang }}" class="absolute inset-0 z-30 pointer-events-none"></div>

    {{-- ── LAYER 0b: Title-screen background (Wikipedia lead image) ──────────
         Pinned during TITLE_SCREEN so the catalog topic's image is the hero backdrop,
         independent of the scene Ken Burns / 3D skybox engine. --}}
    <template x-if="lesson.title_bg_url">
        <div x-show="phase === 'TITLE_SCREEN'" x-transition.opacity
             class="absolute inset-0 z-1" aria-hidden="true">
            <div class="absolute inset-0 bg-cover bg-center"
                 :style="`background-image:url('${lesson.title_bg_url}')`"></div>
            {{-- Darken for title legibility --}}
            <div class="absolute inset-0 bg-black/55"></div>
            <span class="absolute bottom-2 right-3 text-2xs text-white/40">{{ __('Image: Wikimedia Commons') }}</span>
        </div>
    </template>

    {{-- ── Map block slide — full-bleed historical atlas, shown while a map scene plays. --}}
    <div id="lesson-map-stage" lang="{{ $contentLang }}" class="absolute inset-0 z-20" style="display:none" aria-hidden="true"></div>
    {{-- Stage slide (voyage landfall, gallery): a minimal auto-advance progress line; the slide
         moves on once its narration is done. Previous / next live in the deck, like every other scene. --}}
    <div x-show="showMapContinue && autoAdvanceProgress > 0" class="fixed inset-x-0 bottom-0 z-40 h-1 bg-white/10 pointer-events-none">
        <div class="h-full bg-primary/90" :style="`width: ${autoAdvanceProgress * 100}%`"></div>
    </div>

    {{-- ── Narrator welcome video ───────────────────────────────────────────
         Plays once, full-screen, right after "Start lesson" is clicked and before
         the first block. Dark-blue base + black vignette focuses the talking narrator;
         the player auto-advances to block 1 the moment it ends (see _endWelcomeVideo). --}}
    @if ($welcomeVideoUrl = $lesson->narrator?->welcomeVideoUrl())
        <div x-show="phase === 'WELCOME_VIDEO'" x-cloak
             class="absolute inset-0 z-60 flex items-center justify-center pointer-events-auto"
             style="background:#0f172a;">

            {{-- Black vignette --}}
            <div class="pointer-events-none absolute inset-0"
                 style="background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.92) 100%);"></div>

            {{-- src is chosen at runtime (full vs lite) by _welcomeSrc() based on connection/screen. --}}
            <video x-ref="welcomeVideo" playsinline preload="auto"
                   class="relative z-1 max-h-full max-w-full object-contain"></video>

            {{-- Skip — small, unobtrusive --}}
            <button @click="_endWelcomeVideo()"
                    class="absolute bottom-8 right-8 z-2 flex items-center gap-2 rounded-full border border-white/20
                           bg-black/40 px-5 py-2 text-sm font-semibold text-white/80 backdrop-blur-sm
                           transition hover:bg-black/60 hover:text-white active:scale-95">
                {{ __('Skip') }}
                <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M4 5v14l8-7zM13 5v14l8-7z"/></svg>
            </button>
        </div>
    @endif

    {{-- ── LAYER 1: Shadow gradient overlay ──────────────────────────────
         Shades paintings and photos; a line-art scene turns it off (backdropShade) so the paper stays
         white. Subtitles and the chrome carry their own scrims, so they stay legible either way. --}}
    <div class="absolute inset-0 z-10 pointer-events-none bg-linear-to-b from-black/50 to-[#0C2033]/50 transition-opacity duration-700"
         :class="backdropShade ? 'opacity-100' : 'opacity-0'"></div>

    {{-- Cinematic film-grain overlay (reuses the .lp-grain brand utility). --}}
    <div class="lp-grain pointer-events-none absolute inset-0 z-11"></div>

    {{-- ── LAYER 2: Three.js canvas (avatar) ───────────────────────────── --}}
    <canvas id="lesson-avatar-canvas" class="absolute inset-0 z-20 w-full h-full pointer-events-none"></canvas>
    {{-- The narrator's face belongs to the title screen, which already has a framed card for it
         (below). A 150px portrait pinned to the corner for the whole lesson sat on top of the map,
         the paintings and the route, and told the class nothing they did not already know from
         hearing the voice. Bart: "Remove the avatar image when a lesson is playing." --}}

    {{-- ── LAYER 3: UI overlay ──────────────────────────────────────────── --}}
    <div class="absolute inset-0 z-30 pointer-events-none">

        @php $canEdit = (bool) auth()->user()?->canManage($lesson); @endphp

        {{-- Top chrome (logo / editor escape hatch) lives in the player overlay wrapper below,
             so it appears and hides with the rest of the controls. --}}

        {{-- Source attribution (A4) — centred under the deck, unobtrusive, always visible.
             Reactive rather than server-rendered because it now also names the artist of the scene
             on screen, and that changes as the lesson plays. --}}
        <p x-show="attributionLine && phase !== 'TITLE_SCREEN'" x-text="attributionLine" x-cloak
           class="absolute bottom-1 left-1/2 -translate-x-1/2 max-w-[92vw] truncate text-2xs text-white/35 pointer-events-none"
           style="z-index:40"></p>

        {{-- The chapter name + year moved into the overlay wrapper below as one quiet line. --}}

        {{-- ── Player overlay (Figma: VideoPlayer playing/paused) — less is more, icons only.
             Every piece of chrome lives in this wrapper and is shown ONLY while paused, while a
             menu is open, or while the pointer sits over the top/bottom edge of the screen
             (plus a short flash after any tap or keypress so touch users can summon it).
             While narration plays and the pointer is elsewhere, the stage is completely clean.
             The visibility expression is repeated on each block because an x-data getter cannot
             reach the parent player's state through `this` — inline expressions can. --}}
        <div class="contents"
             x-data="{
                 zoneHover: false,
                 zoneFlash: false,
                 _zoneFlashT: null,
                 probeZones(e) {
                     const z = e.clientY <= 88 || e.clientY >= window.innerHeight - 176
                     if (z !== this.zoneHover) this.zoneHover = z
                 },
                 flashUi() {
                     this.zoneFlash = true
                     clearTimeout(this._zoneFlashT)
                     this._zoneFlashT = setTimeout(() => { this.zoneFlash = false }, 2600)
                 },
             }"
             @pointermove.window="probeZones($event)"
             @pointerdown.window="flashUi()"
             @keydown.window="flashUi()">

            {{-- ── Subtitles — the narration written along the bottom while it is spoken ───────
                 Netflix's look (.lp-cc in app.css): white text, a 60% black backdrop hugging each
                 line, at most two lines. Bottom centre, lifted over the deck while the deck shows.
                 Inside this wrapper so it can see zoneHover. lang + dir follow the language of the
                 line on screen (a line not translated yet shows in the original). x-text (never
                 x-html): a script is teacher copy and must not inject markup into the player. No
                 x-transition: its leave never applied in a hidden tab and left the bubble up. --}}
            <div x-show="captionsOn && captionText && (phase === 'INTRO' || phase === 'GAME_ACTIVE')"
                 x-cloak
                 class="lp-cc pointer-events-none absolute left-1/2 -translate-x-1/2 text-center"
                 :class="!(readingOverlay || (isPlaying && !zoneHover && !zoneFlash && !chaptersOpen && !ccOpen)) && 'lp-cc--lifted'"
                 {{-- Above the deck's scrim, under the deck itself while the panel is open over it. --}}
                 :style="`z-index:${ccOpen || chaptersOpen ? 45 : 47}`"
                 aria-live="polite">
                <p class="lp-cc__text" :lang="captionShownLang" :dir="ccDir(captionShownLang)"><span x-text="captionText"></span></p>
            </div>

            {{-- Top edge: scrim + the only text chrome that exists (teacher escape hatch or logo).
                 No phase gate — on the title screen nothing is playing, so it is simply visible. --}}
            {{-- pointer-events-none on the row itself: it is a full-width scrim, most of which has
                 nothing to click, and at z-index:48 it was sitting over the top-left language
                 switch (z-index:10) during TITLE_SCREEN and eating its clicks. Only the actual
                 controls (the "Edit scene" button below) opt back in with pointer-events-auto. --}}
            <div class="pointer-events-none absolute inset-x-0 top-0 transition-opacity duration-300"
                 :class="(readingOverlay || (isPlaying && !zoneHover && !zoneFlash && !chaptersOpen && !ccOpen)) ? 'opacity-0' : 'opacity-100'"
                 style="z-index:48">
                {{-- Side padding = the title screen bar's gutter (px-8/12), so Edit scene lines up with Start. --}}
                {{-- A line-art scene (backdropShade off) keeps its paper white to the edge: no
                     full-width scrim. Its controls carry their own local plate instead (the Edit
                     button already has one; the logo gets one below). --}}
                <div x-show="backdropShade && !(phase === 'TITLE_SCREEN' && lesson.title_poster)" class="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-black/70 to-transparent"></div>
                {{-- data-player-chrome: overlays (the power-meter card) keep clear of this row and the deck. --}}
                <div class="relative flex items-center gap-2.5 px-8 py-3.5 sm:px-12" data-player-chrome="top"
                     :style="phase === 'TITLE_SCREEN' ? (titleLogoH ? 'padding: 6px var(--title-gutter)' : 'padding: var(--title-gutter)') : ''">
                    {{-- title_preview: the editor's title-screen frame shows what students see. --}}
                    @if ($canEdit && ! request()->boolean('title_preview'))
                        {{-- No back arrow here on purpose. The wizard already draws one in this exact
                             corner, so the two stacked into a confusing double control. "Edit scene"
                             below is the way into the editing view. --}}
                        <button type="button" data-title-avoid
                                @click="openEditor('{{ route('teacher.lessons.wizard', $lesson) }}')"
                                class="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 py-1.5 pl-3 pr-4 text-sm font-medium text-slate-300 backdrop-blur transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/></svg>
                            {{ __('Edit scene') }}
                        </button>
                    @endif
                </div>
            </div>

            {{-- Center play/pause — a bare solid white glyph, exactly as in the design (no disc,
                 no chrome). The button box is bigger than the glyph for a comfortable hit target.
                 Hidden on quiz scenes, where the centre belongs to the quiz card.

                 It answers a PRESS. It used to show whenever nothing happened to be playing, which
                 on an interactive scene — a voyage landfall waiting for the class to move on — left
                 a 96px triangle parked over the map the whole time. Now it flashes when the student
                 presses play or pause (deck button, K, Space, a click on the stage) and stays up
                 while the lesson is genuinely paused. See _flashPlaybackGlyph. --}}
            <div x-show="(phase === 'INTRO' || phase === 'GAME_ACTIVE' || phase === 'GAME_BRIEF') && !currentIsGame"
                 x-cloak
                 class="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300"
                 :class="(!readingOverlay && (playbackPaused || playbackGlyph)) ? 'opacity-100' : 'opacity-0'"
                 style="z-index:45">
                {{-- No data-tooltip here on purpose: a 96px glyph in the middle of the stage says
                     what it is, and a hover hint floating over the scene is noise. The deck's small
                     play/pause carries the label and the K shortcut. On a line-art scene a white
                     glyph on white paper vanishes, so there (only) it sits on the deck's plate. --}}
                <button type="button" @click="togglePlayback()"
                        :aria-label="playbackPaused ? @js(__('Play')) : @js(__('Pause'))"
                        class="group flex h-24 w-24 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        :class="[(!readingOverlay && (playbackPaused || playbackGlyph)) ? 'pointer-events-auto' : 'pointer-events-none',
                                 !backdropShade && 'border border-white/10 bg-black/70 backdrop-blur-md']">

                    <svg x-show="playbackPaused" class="h-14 w-14 text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.8)] transition-transform duration-150 ease-out group-hover:scale-110 group-active:scale-95" viewBox="0 0 21 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M0 2.52873C0 0.608107 2.05916 -0.609418 3.74205 0.316169L19.2842 8.86436C21.0285 9.82373 21.0285 12.3301 19.2842 13.2895L3.74205 21.8377C2.05916 22.7633 0 21.5457 0 19.6251V2.52873Z" fill="white"/>
                    </svg>

                    {{-- Pause: two bars, drawn to the same weight and corner radius as the play
                         triangle above so the two states feel like one control. --}}
                    <svg x-show="!playbackPaused" x-cloak class="h-14 w-14 text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.8)] transition-transform duration-150 ease-out group-hover:scale-110 group-active:scale-95"
                         viewBox="0 0 21 23" fill="currentColor" aria-hidden="true">
                        <rect x="0" y="0" width="6.5" height="23" rx="2.5"/>
                        <rect x="14.5" y="0" width="6.5" height="23" rx="2.5"/>
                    </svg>
                </button>
            </div>

            {{-- Bottom scrim keeps the white icons and captions readable over bright scenes. A
                 line-art scene drops it (the paper stays white to the edge) and the deck and the
                 chapter line carry a local plate instead, below. --}}
            <div x-show="backdropShade && (phase === 'INTRO' || phase === 'GAME_ACTIVE' || phase === 'GAME_BRIEF')"
                 x-cloak
                 class="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300"
                 :class="(readingOverlay || (isPlaying && !zoneHover && !zoneFlash && !chaptersOpen && !ccOpen)) && 'opacity-0'"
                 style="z-index:44"></div>

            <div x-show="phase === 'INTRO' || phase === 'GAME_ACTIVE' || phase === 'GAME_BRIEF'"
                 x-cloak
                 class="absolute inset-x-0 bottom-0 transition-all duration-300 ease-out"
                 :class="(readingOverlay || (isPlaying && !zoneHover && !zoneFlash && !chaptersOpen && !ccOpen)) ? 'pointer-events-none translate-y-2 opacity-0' : 'opacity-100'"
                 style="z-index:46">
                <div class="pointer-events-auto mx-auto w-[min(720px,92vw)] pb-3" data-player-chrome="bottom">

                    {{-- Audio & Subtitles (Netflix's panel): narration languages left, subtitles right.
                         One click selects and the panel stays open; it closes on an outside click,
                         Esc, C or the CC button. Keys: ↑/↓ in a column, ←/→ between, Enter picks
                         (ccKeydown). Fixed column widths, so a "Translating…" hint or a long name
                         never resizes it. On a phone the two columns stack. --}}
                    <div x-show="ccOpen" x-cloak data-cc-panel
                         x-transition:enter="transition duration-[160ms] ease-out"
                         x-transition:enter-start="opacity-0 motion-safe:translate-y-2"
                         x-transition:enter-end="opacity-100 translate-y-0"
                         x-transition:leave="transition duration-[120ms] ease-in"
                         x-transition:leave-start="opacity-100"
                         x-transition:leave-end="opacity-0"
                         @click.outside="if (!$event.target.closest('[data-cc-button]')) ccOpen = false"
                         role="dialog" aria-label="{{ __('Audio and subtitles') }}"
                         class="mb-3 ml-auto flex max-h-[60vh] w-full flex-col overflow-y-auto rounded-xl border border-white/10 bg-black/70 p-2 backdrop-blur-md sm:w-fit sm:flex-row sm:gap-2">
                        <div class="sm:w-44" role="group" aria-labelledby="cc-audio-heading">
                            <p id="cc-audio-heading" class="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-widest text-white/50">{{ __('Audio') }}</p>
                            <template x-for="(row, i) in ccAudioRows" :key="row.code">
                                <button type="button" @click="selectAudio(row)" :data-cc-col="0" :data-cc-row="i"
                                        :aria-pressed="row.current" @focus="ccFocus = { col: 0, row: i }"
                                        class="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-base transition-colors hover:bg-white/10 focus:outline-none focus-visible:bg-white/15"
                                        :class="row.current ? 'font-bold text-white' : 'text-white/80'">
                                    <svg x-show="row.current" class="h-5 w-5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                                    <span x-show="!row.current" class="w-5 shrink-0"></span>
                                    <span class="truncate" :lang="row.code" x-text="row.name"></span>
                                </button>
                            </template>
                        </div>
                        <div class="mt-2 border-t border-white/10 pt-1 sm:mt-0 sm:w-64 sm:border-l sm:border-t-0 sm:pl-2 sm:pt-0" role="group" aria-labelledby="cc-subs-heading">
                            <p id="cc-subs-heading" class="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-widest text-white/50">{{ __('Subtitles') }}</p>
                            <template x-for="(row, i) in ccSubtitleRows" :key="row.code || 'off'">
                                <button type="button" @click="selectSubtitle(row.code)" :data-cc-col="1" :data-cc-row="i"
                                        :aria-pressed="ccSelectedSubtitle() === row.code" @focus="ccFocus = { col: 1, row: i }"
                                        class="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-base transition-colors hover:bg-white/10 focus:outline-none focus-visible:bg-white/15"
                                        :class="ccSelectedSubtitle() === row.code ? 'font-bold text-white' : 'text-white/80'">
                                    <svg x-show="ccSelectedSubtitle() === row.code" class="h-5 w-5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                                    <span x-show="ccSelectedSubtitle() !== row.code" class="w-5 shrink-0"></span>
                                    <span class="shrink-0" :lang="row.code || null" x-text="row.name"></span>
                                    <span class="lp-cc-hint ml-auto min-w-0 truncate text-right text-sm font-normal text-white/40"
                                          :lang="ccSets[row.code]?.translating ? null : (row.code || null)"
                                          :dir="ccSets[row.code]?.translating ? null : ccDir(row.code)"
                                          x-text="ccRowHint(row.code)"></span>
                                </button>
                            </template>
                        </div>
                    </div>

                    {{-- Chapter list (opens above the deck) — numbered names, active highlighted. --}}
                    <div x-show="chaptersOpen" x-transition
                         @click.outside="chaptersOpen = false"
                         class="mb-3 max-h-[46vh] overflow-y-auto rounded-xl border border-white/10 bg-black/70 p-1.5 backdrop-blur-md">
                        <template x-for="(c, i) in chapters" :key="c.index">
                            <button type="button" @click="goToChapter(c.index)" :disabled="!mayEnter(c.index)"
                                    class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition enabled:hover:bg-white/10 disabled:cursor-not-allowed"
                                    :class="c.index === _sceneIndex ? 'text-primary' : (mayEnter(c.index) ? 'text-white/70' : 'text-white/35')">
                                <span class="w-6 shrink-0 font-mono text-xs tabular-nums opacity-70" x-text="String(i + 1).padStart(2, '0')"></span>
                                <span class="min-w-0 flex-1 truncate text-sm" :class="c.index === _sceneIndex ? 'font-bold' : 'font-medium'" x-text="c.name"></span>
                                <span class="shrink-0 text-xs tabular-nums opacity-60" x-text="chapterMeta(c)"></span>
                            </button>
                        </template>
                    </div>

                    {{-- Chapter line (Figma: "Bottom Info Chapter title") — one quiet line: location
                         pin, place in white, a dot, then the date in muted slate.

                         It lives INSIDE the deck so it has somewhere to go when the stage is narrow.
                         The design puts it in the bottom-left corner, but the deck grows to 92vw on a
                         small screen, and its play/pause button then lands on top of the title. So it
                         only floats down to the corner (.lp-chapter-line in app.css) when the stage is
                         wide enough for the two never to meet; below that it sits here, in flow, just
                         above the chapter bar.

                         This is the ONLY place the line is drawn. A voyage leg used to paint its own
                         copy inside the map HUD, which both doubled up with this one and stayed on
                         screen while the lesson played; the tour now reports its place + date
                         (lesson:chapter-info) and this renders them. Everything else falls back to
                         nothing: outside a voyage leg the line only shows for a scene whose caption the
                         teacher switched on (captionVisible). Hidden entirely when the teacher chose the
                         top date chip instead. --}}
                    <div x-show="(phase === 'INTRO' || phase === 'GAME_ACTIVE') && !infoAtTop && (infoPlace || sceneCaption)"
                         x-cloak
                         class="lp-chapter-line flex h-9 items-center gap-2"
                         :class="!backdropShade && 'rounded-xl border border-white/10 bg-black/70 px-3 backdrop-blur-md'">
                        <svg class="h-4 w-auto shrink-0 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                             viewBox="0 0 21 26" fill="currentColor" aria-hidden="true">
                            <path d="M10.3329 0C4.63543 0 0 4.63543 0 10.3329C0 19.3812 9.58334 25.4792 9.9913 25.735L10.334 25.9493L10.6767 25.735C11.0848 25.4795 20.668 19.3812 20.668 10.3329C20.668 4.63543 16.0326 0 10.3351 0H10.3329ZM10.3329 15.5C7.47996 15.5 5.16584 13.1871 5.16584 10.3329C5.16584 7.47996 7.47872 5.16584 10.3329 5.16584C13.1859 5.16584 15.5 7.47872 15.5 10.3329C15.5 13.1859 13.1871 15.5 10.3329 15.5Z"/>
                        </svg>
                        <span lang="{{ $contentLang }}" class="truncate text-sm font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                              x-text="infoPlace || sceneCaption?.place"></span>
                        <span x-show="infoPlace ? infoDate : sceneCaption?.year" class="h-1 w-1 shrink-0 rounded-full bg-slate-400"></span>
                        <span x-show="infoPlace ? infoDate : sceneCaption?.year"
                              class="shrink-0 text-sm font-medium text-slate-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                              x-text="infoPlace ? infoDate : sceneCaption?.year"></span>
                    </div>

                    {{-- A line-art scene has no bottom scrim, so the progress bar and the transport row
                         sit on a local plate (the chapter list's surface). Not around the chapter line
                         or the list: backdrop-filter would become the containing block of the line's
                         corner float, and the list has its own plate. --}}
                    <div data-tooltip-clear :class="!backdropShade && 'rounded-xl border border-white/10 bg-black/70 px-2 backdrop-blur-md'">
                    {{-- Segmented progress (Spotify-style) — one segment per scene, width ∝ its time.
                         Played fills white, reached-but-not-played a lighter grey, the rest is to come:
                         dimmed and not clickable (a student never jumps past the furthest point).
                         A block the student paces (quiz, map, film) is an estimate, drawn hatched.
                         The tooltip follows the pointer and names the time, type and chapter. --}}
                    <div x-show="chapters.length > 1 && !currentIsGame && phase !== 'GAME_BRIEF'"
                         class="flex items-center gap-1">
                        <template x-for="c in chapters" :key="c.index">
                            <button type="button" @click="clickSegment(c, $event)" @pointermove="hoverSegment(c, $event)"
                                    :data-tooltip="segmentTooltip(c)" data-tooltip-follow
                                    :aria-label="segmentTooltip(c)" :aria-disabled="!mayEnter(c.index)"
                                    class="group relative flex items-center py-2"
                                    :class="mayEnter(c.index) ? 'cursor-pointer' : 'cursor-not-allowed'"
                                    :style="`flex: ${c.seconds || 1} 1 0`">
                                <span class="relative block h-1 w-full overflow-hidden rounded-full transition-all duration-150 group-hover:h-1.5"
                                      :class="[c.estimated ? 'lp-seg-estimate' : 'bg-white/25', mayEnter(c.index) ? 'group-hover:bg-white/40' : 'opacity-50']">
                                    <span class="absolute inset-y-0 left-0 rounded-full bg-white/45" :style="`width:${segmentFill(c).reached}%`"></span>
                                    {{-- White fill, not amber (Figma): the progress reads as light on the dark stage. --}}
                                    <span class="absolute inset-y-0 left-0 rounded-full bg-white/90 transition-all duration-150"
                                          :style="`width:${segmentFill(c).played}%`"></span>
                                </span>
                            </button>
                        </template>
                        <span x-show="estimatedMinutes" x-text="estimatedMinutes"
                              class="ml-2 shrink-0 text-xs tabular-nums text-white/70"></span>
                    </div>

                    {{-- Transport row — plain white Heroicons (outline, 1.5), no chrome: previous /
                         play / next on the left, subtitles + chapters on the right. Icons grow a touch on hover. --}}
                    <div class="mt-0.5 flex items-center justify-between">
                        <div class="flex items-center gap-1 sm:gap-2">
                            {{-- Previous / Next — skip glyphs drawn to the Heroicons grid (24, round joins) since
                                 Heroicons has no skip icon; filled like the play glyph beside them. --}}
                            <button type="button" x-show="_hasSlides" @click="previousSlide()" :disabled="!canSkip || _sceneIndex <= 0"
                                    data-tooltip="{{ __('Previous') }}" data-tooltip-key="←" aria-label="{{ __('Previous') }}"
                                    class="group flex h-10 w-10 items-center justify-center rounded-lg text-white/85 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-35">
                                <svg class="h-6 w-6 shadow-sm transition-transform duration-150 ease-out group-hover:scale-110 group-active:scale-95"
                                     viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <g transform="matrix(-1 0 0 1 24 0)">
                                        <path stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M4.5 6.6c0-.87.95-1.4 1.7-.96l8.9 5.4a1.12 1.12 0 0 1 0 1.92l-8.9 5.4c-.75.45-1.7-.09-1.7-.96V6.6Z"/>
                                        <rect x="17.25" y="5.25" width="2.25" height="13.5" rx="1.125"/>
                                    </g>
                                </svg>
                            </button>
                            {{-- Play / pause — the same control as the centre glyph and Space. --}}
                            <button type="button" @click="togglePlayback()"
                                    :data-tooltip="playbackPaused ? @js(__('Play')) : @js(__('Pause'))" data-tooltip-key="K"
                                    :aria-label="playbackPaused ? @js(__('Play')) : @js(__('Pause'))"
                                    class="group flex h-11 w-11 items-center justify-center rounded-lg text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                                <svg x-show="playbackPaused" class="h-8 w-8 shadow-sm transition-transform duration-150 ease-out group-hover:scale-110 group-active:scale-95"
                                     viewBox="0 0 24 24" fill="currentColor" stroke-width="1.5" aria-hidden="true">
                                    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"/>
                                </svg>
                                <svg x-show="!playbackPaused" x-cloak class="h-8 w-8 shadow-sm transition-transform duration-150 ease-out group-hover:scale-110 group-active:scale-95"
                                     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5"/>
                                </svg>
                            </button>
                            <button type="button" x-show="_hasSlides" @click="nextSlide()" :disabled="!canSkip || !hasNextSlide"
                                    :data-stage-waiting="showMapContinue"
                                    data-tooltip="{{ __('Next') }}" data-tooltip-key="→" aria-label="{{ __('Next') }}"
                                    class="group flex h-10 w-10 items-center justify-center rounded-lg text-white/85 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-35">
                                <svg class="h-6 w-6 shadow-sm transition-transform duration-150 ease-out group-hover:scale-110 group-active:scale-95"
                                     viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <g>
                                        <path stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M4.5 6.6c0-.87.95-1.4 1.7-.96l8.9 5.4a1.12 1.12 0 0 1 0 1.92l-8.9 5.4c-.75.45-1.7-.09-1.7-.96V6.6Z"/>
                                        <rect x="17.25" y="5.25" width="2.25" height="13.5" rx="1.125"/>
                                    </g>
                                </svg>
                            </button>

                        </div>

                        <div class="flex items-center gap-1 sm:gap-2">
                            {{-- Volume — speaker toggles mute, the thin slider sets the level
                                 (Figma: mute + line with a dot handle). Dragging to 0 mutes. --}}
                            <div class="mr-1 flex items-center gap-2">
                                <button type="button" @click="toggleMute()"
                                        :data-tooltip="audioMuted ? @js(__('Unmute')) : @js(__('Mute'))" data-tooltip-key="M"
                                        :aria-label="audioMuted ? @js(__('Unmute')) : @js(__('Mute'))"
                                        class="group flex h-10 w-10 items-center justify-center rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                        :class="audioMuted ? 'text-white/60 hover:text-white' : 'text-white/85 hover:text-white'">
                                    <svg x-show="!audioMuted" class="h-6 w-6 shadow-sm transition-transform duration-150 ease-out group-hover:scale-110 group-active:scale-95"
                                         viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/>
                                    </svg>
                                    <svg x-show="audioMuted" x-cloak class="h-6 w-6 shadow-sm transition-transform duration-150 ease-out group-hover:scale-110 group-active:scale-95"
                                         viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/>
                                    </svg>
                                </button>
                                <input type="range" min="0" max="1" step="0.05"
                                       :value="audioMuted ? 0 : volumeLevel"
                                       @input="setVolume($event.target.value)"
                                       aria-label="{{ __('Volume') }}"
                                       class="lp-volume w-14"
                                       :style="`--lp-vol:${(audioMuted ? 0 : volumeLevel) * 100}%`">
                            </div>

                            {{-- Subtitles — opens the Audio & Subtitles panel above (C does too). The
                                 plate + amber underline mark captions on. No tooltip while the panel
                                 is open: it would sit on the panel. --}}
                            <button type="button" x-ref="ccButton" data-cc-button
                                    @click="toggleCaptionPanel()"
                                    :data-tooltip="ccOpen ? '' : @js(__('Audio and subtitles'))" data-tooltip-key="C"
                                    :aria-expanded="ccOpen" aria-haspopup="dialog"
                                    aria-label="{{ __('Audio and subtitles') }}"
                                    class="group relative flex h-10 w-10 items-center justify-center rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                    :class="captionsOn ? 'bg-white/10 text-white' : 'text-white/85 hover:text-white'">
                                <svg class="h-6 w-6 shadow-sm transition-transform duration-150 ease-out group-hover:scale-110 group-active:scale-95"
                                     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                    <rect x="2.75" y="5.25" width="18.5" height="13.5" rx="2.25"/>
                                    <path stroke-linecap="round" d="M10 10.4a2.4 2.4 0 1 0 0 3.2M18 10.4a2.4 2.4 0 1 0 0 3.2"/>
                                </svg>
                                <span x-show="captionsOn" class="absolute bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary"></span>
                            </button>

                            {{-- Chapter-list toggle. Hidden on game scenes like the old chapter bar:
                                 the quiz card paints in a sibling layer above this deck, so the list
                                 would open underneath it. --}}
                            <button type="button" x-show="chapters.length > 1 && !currentIsGame" @click="chaptersOpen = !chaptersOpen; ccOpen = false"
                                    data-tooltip="{{ __('Chapters') }}" aria-label="{{ __('Chapters') }}"
                                    :aria-expanded="chaptersOpen"
                                    class="group flex h-10 w-10 items-center justify-center rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                    :class="chaptersOpen ? 'text-white' : 'text-white/85 hover:text-white'">
                                <svg class="h-6 w-6 shadow-sm transition-transform duration-150 ease-out group-hover:scale-110 group-active:scale-95"
                                     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>

        {{-- ── TITLE SCREEN ─────────────────────────────────────────────── --}}
        {{-- One full-viewport hero (the artwork with the series and the episode, and one bottom rail:
             Start, the language, the join QR) and, below the fold, "About this lesson" with
             everything else. One gutter on every side (--title-gutter, app.css). The screen scrolls;
             its absolute layers belong to the first viewport and scroll away with it.
             Background Ken Burns runs on the z-0 layer behind this.
             Deliberately NO leave transition: Alpine transitions advance on animation frames,
             and a hidden document (embedded preview in a background tab) never produces one —
             the title screen then never reached display:none and sat painted over the whole
             lesson. A plain x-show hides it synchronously on the phase flip, visible tab or not. --}}
        <div
            x-show="phase === 'TITLE_SCREEN'"
            class="title-screen absolute inset-0 pointer-events-auto overflow-y-auto overscroll-contain" data-title-screen
        >
            {{-- A comic title candidate (TitlePoster: the poster with a scene masked into its letters, the
                 painted cover, the banner), drawn from poster.json by resources/js/title-poster.js over
                 the poster's own flat colour. The episode line is live text from the lesson title, so a
                 teacher's edit changes it, and stays small under the series (episodeSize). --}}
            <template x-if="lesson.title_poster">
                <div class="absolute inset-0 overflow-hidden" :style="`background-color: ${lesson.title_poster.background}`"
                     x-init="$nextTick(() => mountTitlePoster($el))">
                    <h1 class="sr-only" lang="{{ $contentLang }}" x-text="lesson.title"></h1>
                    <div data-poster-stage class="title-poster absolute" aria-hidden="true">
                        <template x-if="lesson.title_poster.subtitle">
                            <p lang="{{ $contentLang }}" x-text="lesson.title.replace(/^.*?:\s*/, '')" data-title-avoid
                               class="absolute flex items-center justify-center whitespace-nowrap text-center leading-none"
                               :style="(({ box, color, font }) => `left:${box.x}%;top:${box.y}%;width:${box.w}%;height:${box.h}%;font-size:${episodeSize(lesson.title_poster)}cqw;color:${color};${font === 'lettering' ? `font-family:'ComicRoma Lettering',var(--font-comic);font-weight:700;text-transform:uppercase` : `font-family:${font === 'comicroma' ? 'ComicRoma' : `'Coming Soon'`},var(--font-comic)`}`)(lesson.title_poster.subtitle)"></p>
                        </template>
                    </div>
                </div>
            </template>

            {{-- The banner's white "what you can expect" strip (Figma 2321:1315), laid out by
                 resources/js/title-expect.js. Off (titleStrip): its lines are in "About this lesson".
                 Kept so the one flag brings it back. --}}
            <template x-if="titleStrip && lesson.title_poster?.expect && lesson.expect.length">
                <ul data-title-expect="strip" data-title-avoid lang="{{ $contentLang }}" aria-label="{{ __('What to expect') }}"
                    class="title-expect-strip absolute inset-x-0 flex flex-col gap-1 bg-white pb-3 pr-4 text-sm text-brand-ink sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-16 sm:gap-y-1 sm:py-2"
                    style="z-index: 15; font-family: 'Coming Soon', var(--font-comic)">
                    <template x-for="line in lesson.expect"><li x-text="line"></li></template>
                </ul>
            </template>

            {{-- Cinematic gradients for a plain or logo title over its picture --}}
            <div x-show="!lesson.title_poster" class="absolute inset-0 pointer-events-none"
                 style="background:
                     linear-gradient(to top,  rgba(2,6,23,1) 0%, rgba(2,6,23,0.7) 30%, transparent 60%),
                     linear-gradient(to right, rgba(2,6,23,0.7) 0%, transparent 40%),
                     linear-gradient(to bottom, rgba(2,6,23,0.4) 0%, transparent 25%)">
            </div>
            <div x-show="!lesson.title_poster" class="skybox-grain-overlay" style="opacity: 0.22; z-index: 2;"></div>

            {{-- Over a painting: ONE flat scrim behind the rail only, so its white chrome reads. --}}
            <div x-show="lesson.title_poster?.fit === 'cover'" class="title-rail-scrim pointer-events-none absolute inset-x-0 bottom-0" style="z-index: 5"></div>

            {{-- Series wordmark (logo style): the logo carries the series, the episode small under it. --}}
            <template x-if="lesson.title_logo_url">
                <h1 lang="{{ $contentLang }}" class="title-logo absolute pointer-events-none" data-title-avoid data-title-piece="logo" style="z-index:10">
                    <img x-bind:src="lesson.title_logo_url" x-bind:alt="lesson.title" x-on:load="relayoutTitle()"
                         class="block h-auto w-full -rotate-2 origin-bottom-left"
                         style="filter: drop-shadow(0.6rem 0.8rem 0 rgba(0,0,0,0.85));">
                    <span aria-hidden="true" x-show="lesson.title.includes(': ')" x-text="lesson.title.split(': ').slice(1).join(': ')"
                          class="title-episode mt-4 block font-comic text-white/85"></span>
                </h1>
            </template>

            {{-- A plain title, where the teacher put it (TitlePosition presets; bottom left by default):
                 the series big on the first line, the episode small on the second. --}}
            @php
                $titlePos = $lesson->title_position ?? \App\Enums\TitlePosition::BottomLeft;
                $titleBar = match ($titlePos) {
                    \App\Enums\TitlePosition::TopLeft => 'inset-x-0 top-0 items-start justify-start title-pad-top',
                    \App\Enums\TitlePosition::TopCenter => 'inset-x-0 top-0 items-start justify-center title-pad-top text-center',
                    \App\Enums\TitlePosition::TopRight => 'inset-x-0 top-0 items-start justify-end title-pad-top text-right',
                    \App\Enums\TitlePosition::Center => 'inset-0 items-center justify-center text-center',
                    \App\Enums\TitlePosition::BottomLeft => 'inset-x-0 bottom-0 items-end justify-start title-pad-bottom',
                    \App\Enums\TitlePosition::BottomCenter => 'inset-x-0 bottom-0 items-end justify-center title-pad-bottom text-center',
                };
            @endphp
            <div x-show="!lesson.title_logo_url && !lesson.title_poster" @class(['title-gutter-x pointer-events-none absolute flex', $titleBar])
                 data-title-position="{{ $titlePos->value }}" style="z-index: 10;">
                <h1 lang="{{ $contentLang }}" class="min-w-0 max-w-5xl" data-title-avoid data-title-bar>
                    <span class="block font-history font-bold leading-history tracking-tight text-white" style="font-size: clamp(2.2rem, 6vw, 6.5rem);"
                          x-text="lesson.title.split(': ')[0]"></span>
                    <span x-show="lesson.title.includes(': ')" x-text="lesson.title.split(': ').slice(1).join(': ')"
                          class="title-episode mt-3 block font-light text-white/80"></span>
                </h1>
            </div>

            {{-- The bottom rail: one row on the bottom gutter, every piece's bottom on one baseline.
                 Start and the language left, the way down to "About this lesson" in the middle, the
                 join QR right (static: title-qr.js only sizes or hides it). --}}
            <div class="title-rail flex items-end gap-2 sm:gap-4" style="z-index:20" data-title-rail>
                <div class="flex items-end gap-3" data-title-avoid="children" data-title-piece="cta">
                    <template x-if="canStart">
                        <button type="button" @click="startLesson()" data-title-rail-item
                                class="title-pill flex items-center gap-2.5 rounded-full bg-white px-5 text-sm font-bold text-brand-ink transition-[filter] duration-150 ease-out hover:brightness-95 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:gap-3 sm:px-8 sm:text-base">
                            <svg class="h-4 w-4 fill-none stroke-current" viewBox="0 0 16 17" aria-hidden="true">
                                <path d="M0.75 1.87758C0.75 1.0219 1.6674 0.479469 2.41716 0.891836L13.9577 7.23916C14.7349 7.66657 14.7349 8.78322 13.9577 9.21064L2.41716 15.558C1.6674 15.9703 0.75 15.4279 0.75 14.5722V1.87758Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span>{{ __('Start lesson') }}</span>
                        </button>
                    </template>
                    {{-- Solo (the join QR): carry on where this device stopped; Start lesson starts over. --}}
                    <template x-if="canStart && resumable">
                        <button type="button" @click="resumeLesson()" data-title-rail-item
                                class="title-pill rounded-full border border-white/60 px-5 text-sm font-semibold text-white transition-colors hover:border-white focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                            {{ __('Continue where you stopped') }}
                        </button>
                    </template>
                    <template x-if="!canStart">
                        <div class="title-pill flex items-center gap-2 rounded-full border border-white/30 px-5 text-sm text-white/70" data-title-rail-item>
                            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                            <span>{{ __('Audio generating…') }}</span>
                        </div>
                    </template>
                </div>

                <x-lesson.language-switch :lesson="$lesson" :translations="$translations" data-title-avoid data-title-piece="language" data-title-rail-item />

                <button type="button" @click="scrollToAbout()" aria-label="{{ __('About this lesson') }}" data-tooltip="{{ __('About this lesson') }}"
                        data-title-avoid data-title-piece="chevron" data-title-rail-item
                        class="title-pill title-chevron flex w-12 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white focus:outline-none focus-visible:outline-2 focus-visible:outline-white">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
                </button>

                {{-- The join code: the QR on its white plate with the lesson code under it (a camera reads
                     it on any picture), or the code alone when the QR made way. --}}
                @if ($lesson->show_qr ?? true)
                    <button type="button" onclick="document.getElementById('qr-modal').showModal()" data-title-qr data-title-rail-item
                            aria-label="{{ __('Scan to join') }}"
                            class="lp-qr-plate hidden shrink-0 cursor-pointer flex-col items-center pb-1 sm:flex">
                        <canvas id="title-qr-canvas" class="block" style="image-rendering: pixelated; width: 96px; height: 96px;"></canvas>
                        <span class="-mt-0.5 font-mono text-2xs font-bold uppercase tracking-[0.25em]" x-text="lesson.lesson_code"></span>
                    </button>
                @endif
                <p x-show="titleCodeInMeta" x-cloak data-title-code data-title-avoid data-title-piece="code" data-title-rail-item
                   class="title-pill hidden items-center font-mono text-sm font-bold uppercase tracking-[0.2em] text-white/80 sm:flex"
                   x-text="lesson.lesson_code"></p>
            </div>

            {{-- QR modal --}}
            <dialog id="qr-modal" class="modal">
                <div class="modal-box hp-modals border border-white/10 flex flex-col items-center gap-6 py-10 px-12 max-w-sm">
                    <canvas id="qr-modal-canvas"
                            class="rounded-2xl bg-white"
                            style="image-rendering: pixelated;"></canvas>
                    <p class="font-mono font-black tracking-[0.35em] text-white uppercase"
                       style="font-size: 2.5rem;"
                       x-text="lesson.lesson_code"></p>
                    <p class="text-xs text-white/40 tracking-widest uppercase">{{ __('Scan to join the lesson') }}</p>
                </div>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            {{-- Below the fold: the hero is exactly one viewport tall, this follows it. --}}
            <div class="pointer-events-none h-full" aria-hidden="true"></div>
            @php $lessonTypes = $lessonData['lesson_types']; @endphp
            <section data-title-about aria-labelledby="title-about-heading" class="relative bg-base-100 text-base-content" style="z-index: 21">
                <div class="title-gutter-x mx-auto max-w-5xl py-16 sm:py-24">
                    <p x-show="lesson.era || lesson.region" x-text="[lesson.era, lesson.region].filter(Boolean).join(' · ')"
                       class="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-base-content/50"></p>
                    <h2 id="title-about-heading" class="text-2xl font-semibold sm:text-3xl">{{ __('About this lesson') }}</h2>
                    <p x-show="lesson.intro_text" lang="{{ $contentLang }}" x-text="lesson.intro_text" class="mt-4 max-w-2xl text-lg leading-relaxed text-base-content/80"></p>

                    <div class="mt-12 grid gap-12 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-16">
                        <div class="space-y-12">
                            <div x-show="lesson.expect.length">
                                <h3 class="text-xs font-semibold uppercase tracking-widest text-base-content/50">{{ __('What to expect') }}</h3>
                                <ul class="mt-4 space-y-3 text-base" lang="{{ $contentLang }}">
                                    <template x-for="line in lesson.expect"><li x-text="line"></li></template>
                                </ul>
                            </div>
                            <div x-show="chapters.length > 1">
                                <h3 class="text-xs font-semibold uppercase tracking-widest text-base-content/50">{{ __('Chapters') }}</h3>
                                <ol class="mt-4 space-y-2 text-sm text-base-content/70" lang="{{ $contentLang }}">
                                    <template x-for="(c, i) in chapters" :key="c.index">
                                        <li class="flex gap-4"><span class="w-6 shrink-0 font-mono text-xs tabular-nums text-base-content/40" x-text="String(i + 1).padStart(2, '0')"></span><span x-text="c.name"></span></li>
                                    </template>
                                </ol>
                            </div>
                        </div>
                        <div class="space-y-12">
                            <dl class="space-y-3 text-sm">
                                <div x-show="estimatedMinutes" class="grid grid-cols-[8rem_1fr] gap-4"><dt class="text-base-content/50">{{ __('Duration') }}</dt><dd x-text="estimatedMinutes"></dd></div>
                                <div x-show="lesson.grade_level" class="grid grid-cols-[8rem_1fr] gap-4"><dt class="text-base-content/50">{{ __('Grade') }}</dt><dd x-text="lesson.grade_level"></dd></div>
                                <div x-show="lesson.subject" class="grid grid-cols-[8rem_1fr] gap-4"><dt class="text-base-content/50">{{ __('Subject') }}</dt><dd class="capitalize" x-text="lesson.subject"></dd></div>
                                <div class="grid grid-cols-[8rem_1fr] gap-4"><dt class="text-base-content/50">{{ __('Lesson code') }}</dt><dd class="font-mono font-bold uppercase tracking-[0.2em]" x-text="lesson.lesson_code"></dd></div>
                            </dl>
                            <x-lesson.type-badges :types="$lessonTypes" :dark="($titlePoster['badge_style'] ?? 'colour') === 'dark'" />
                        </div>
                    </div>

                    <template x-if="canStart">
                        <button type="button" @click="startLesson()"
                                class="title-pill mt-16 flex items-center gap-3 rounded-full bg-primary px-8 text-base font-bold text-primary-content transition-[filter] duration-150 ease-out hover:brightness-95 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                            <svg class="h-4 w-4 fill-none stroke-current" viewBox="0 0 16 17" aria-hidden="true"><path d="M0.75 1.87758C0.75 1.0219 1.6674 0.479469 2.41716 0.891836L13.9577 7.23916C14.7349 7.66657 14.7349 8.78322 13.9577 9.21064L2.41716 15.558C1.6674 15.9703 0.75 15.4279 0.75 14.5722V1.87758Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <span>{{ __('Start lesson') }}</span>
                        </button>
                    </template>

                    <p x-show="attributionLine" x-text="attributionLine" class="mt-16 text-2xs text-base-content/40"></p>
                </div>
            </section>
        </div>

        {{-- ── GAME BRIEF: the story-aligned challenge ─────────────────── --}}
        <div
            x-show="phase === 'GAME_BRIEF'"
            x-transition:enter="transition ease-out duration-500"
            x-transition:enter-start="opacity-0 scale-95"
            x-transition:enter-end="opacity-100 scale-100"
            class="absolute inset-0 flex items-center justify-center bg-slate-950/92 backdrop-blur-md pointer-events-auto px-5 py-8 overflow-y-auto"
        >
            <div class="w-full max-w-2xl rounded-3xl border border-primary/40 bg-slate-950/95 p-7 sm:p-9 shadow-2xl">
                <p class="text-primary text-2xs font-semibold uppercase tracking-[0.3em] mb-3">{{ __('Your Challenge') }}</p>
                <h2 x-text="lesson.game_title || 'Strategy Challenge'"
                    class="font-history text-2xl sm:text-4xl font-bold text-[#E1EEF4] leading-tight mb-5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"></h2>
                <div x-text="lesson.game_instructions || 'Work in your teams to decide your strategy, then present it to the class.'"
                     class="whitespace-pre-line text-slate-300 text-sm sm:text-base leading-relaxed max-h-[42vh] overflow-y-auto pr-1"></div>
                <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                    <span x-show="lesson.team_count" class="flex items-center gap-1.5">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z"/></svg>
                        <span x-text="lesson.team_count + ' teams'"></span>
                    </span>
                    <span class="flex items-center gap-1.5">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span x-text="Math.round((lesson.game_duration_seconds || 600) / 60) + ' minutes'"></span>
                    </span>
                </div>
                <button @click="beginGame()"
                    class="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-primary px-8 py-3.5 text-base font-bold text-slate-950 shadow-[0_0_48px_rgba(252,211,77,0.35)] transition hover:brightness-110 active:scale-95 sm:w-auto">
                    <svg class="h-5 w-5 fill-slate-950" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <span>{{ __('Begin the challenge') }}</span>
                </button>
            </div>
        </div>

        {{-- ── GAME ACTIVE: sidebar team list + timer HUD ──────────────── --}}
        <div x-show="phase === 'GAME_ACTIVE' || phase === 'TIME_UP'" class="absolute inset-0 pointer-events-none">

            {{-- Timer HUD — bottom-right: the top-right corner belongs to the audio
                 controls (they overlapped there; founder annotation 2026-07-14). --}}
            <div class="absolute bottom-6 right-6 flex items-center gap-2">
                <span
                    x-text="timerDisplay"
                    :class="timerSeconds <= 120 ? 'text-red-400' : timerSeconds <= 300 ? 'text-primary' : 'text-[#E1EEF4]'"
                    class="font-history text-5xl font-bold drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] tabular-nums"
                ></span>
            </div>

            {{-- Big timer (centre, first 5s of GAME_ACTIVE). Only the host lives here: the number,
                 its tick and its scale-down exit come from resources/js/big-countdown.js, which is
                 the same countdown the quiz read-gate uses. --}}
            <div x-ref="bigTimer" class="absolute inset-0"></div>
        </div>

        {{-- ── TIME'S UP overlay ───────────────────────────────────────── --}}
        <div
            x-show="phase === 'TIME_UP'"
            x-transition:enter="transition ease-out duration-300"
            x-transition:enter-start="opacity-0 scale-110"
            x-transition:enter-end="opacity-100 scale-100"
            class="absolute inset-0 flex items-center justify-center bg-slate-950/70 pointer-events-auto"
        >
            <div class="text-center">
                <p class="font-history text-8xl font-bold text-primary drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)] animate-pulse">
                    TIME'S UP
                </p>
                <p class="text-slate-300 text-xl mt-4">{{ __('Present your strategy to the class.') }}</p>
                <button @click="resumeAfterGame()" x-show="canResumeAfterGame"
                    class="mt-8 inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20 active:scale-95">
                    <span>{{ __('Continue the lesson') }}</span>
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                </button>
            </div>
        </div>

        {{-- ── INTEL DROP notification ─────────────────────────────────── --}}
        <div
            x-show="phase === 'INTEL_DROP'"
            x-transition:enter="transition ease-out duration-500"
            x-transition:enter-start="opacity-0 translate-y-8"
            x-transition:enter-end="opacity-100 translate-y-0"
            class="absolute bottom-16 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 pointer-events-none"
        >
            <div class="rounded-2xl border border-primary/40 bg-slate-900/90 backdrop-blur-sm px-6 py-4 shadow-2xl">
                <p class="text-primary text-sm font-semibold uppercase tracking-widest mb-1">{{ __('New Intelligence') }}</p>
                <p x-text="intelDropMessage" class="text-[#E1EEF4] text-base leading-relaxed"></p>
            </div>
        </div>

    </div>{{-- /z-30 UI overlay --}}

</div>{{-- /lesson-stage --}}

</body>
</html>
