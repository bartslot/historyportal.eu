<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogManifestController;
use App\Http\Controllers\Api\ImageRelayController;
use App\Http\Controllers\Api\LessonTeamController;
use App\Http\Controllers\Api\StudentLessonController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ── Authentication ────────────────────────────────────────────────────────────

Route::prefix('v1')->name('api.v1.')->group(function () {

    Route::post('/auth/login', [AuthController::class, 'login'])->name('auth.login');

    // ── Catalogue manifest (Flutter sync + environment migration) ─────────
    // Public, like the lessons it lists. Throttled and ETagged: a client that polls for changes
    // and finds none pays for a 304, not the catalogue.
    Route::get('/catalog/manifest', CatalogManifestController::class)
        ->middleware('throttle:catalog')
        ->name('catalog.manifest');

    Route::middleware('auth:sanctum')->group(function () {

        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

        Route::get('/user', fn (Request $request) => $request->user())->name('user');

        // ── Student endpoints (Flutter app) ───────────────────────────────
        Route::middleware('role:student')->prefix('student')->name('student.')->group(function () {
            Route::get('/lessons', [StudentLessonController::class, 'index'])->name('lessons.index');
            Route::get('/lessons/{lesson}', [StudentLessonController::class, 'show'])->name('lessons.show');
            Route::post('/lessons/{lesson}/progress', [StudentLessonController::class, 'saveProgress'])->name('lessons.progress');
        });

    });

});

// ── Public lesson endpoints (no auth) ─────────────────────────────────────────
Route::prefix('lesson')->name('api.lesson.')->group(function () {
    Route::get('/{lessonCode}/teams', [LessonTeamController::class, 'index'])->middleware('throttle:class-join')->name('teams.index');
    Route::post('/{lessonCode}/teams', [LessonTeamController::class, 'store'])->middleware('throttle:class-join')->name('teams.store');

    // Anonymous player telemetry (Phase 0 experiment) — batch ingest, addressed by the same
    // public lesson code students watch with. No auth by design; see LessonTelemetryController.
    Route::post('/{lessonCode}/telemetry', [\App\Http\Controllers\Api\LessonTelemetryController::class, 'store'])
        ->middleware('throttle:telemetry')
        ->name('telemetry.store');
});

// ── ChatGPT relay: Bart's Mac makes the AI pictures the server asks for (App\Services\Imaging\ImageRelay) ──
Route::prefix('image-relay')->name('api.image-relay.')
    ->middleware([\App\Http\Middleware\ImageRelayToken::class, 'throttle:120,1'])->group(function () {
        Route::post('/next', [ImageRelayController::class, 'next'])->name('next');
        Route::get('/{imageRelayRequest}/input/{index}', [ImageRelayController::class, 'input'])->whereNumber('index')->name('input');
        Route::post('/{imageRelayRequest}/finish', [ImageRelayController::class, 'finish'])->name('finish');
    });

// ── Render PC: the render PC fetches the clips it has to make and sends them back (App\Services\StoryVideo\RenderPcQueue) ──
Route::prefix('render-pc')->name('api.render-pc.')
    ->middleware([\App\Http\Middleware\RenderPcToken::class, 'throttle:120,1'])->group(function () {
        Route::get('/ping', [\App\Http\Controllers\Api\RenderPcController::class, 'ping'])->name('ping');
        Route::post('/next', [\App\Http\Controllers\Api\RenderPcController::class, 'next'])->name('next');
        Route::get('/clips/{clip}/input/{index}', [\App\Http\Controllers\Api\RenderPcController::class, 'input'])->whereNumber('index')->name('input');
        Route::post('/clips/{clip}/finish', [\App\Http\Controllers\Api\RenderPcController::class, 'finish'])->name('finish');
        Route::post('/scenes/{scene}/film', [\App\Http\Controllers\Api\RenderPcController::class, 'film'])->name('film');
    });

// ── ElevenLabs studio: bart's Mac pulls batches for the web studio and sends the results back (App\Services\StoryVideo\StudioQueue) ──
Route::prefix('studio')->name('api.studio.')
    ->middleware([\App\Http\Middleware\StudioToken::class, 'throttle:120,1'])->group(function () {
        Route::get('/status', [\App\Http\Controllers\Api\StudioController::class, 'status'])->name('status');
        Route::post('/next', [\App\Http\Controllers\Api\StudioController::class, 'next'])->name('next');
        Route::get('/items/{item}/input/{index}', [\App\Http\Controllers\Api\StudioController::class, 'input'])->whereNumber('index')->name('input');
        Route::post('/items/{item}/finish', [\App\Http\Controllers\Api\StudioController::class, 'finish'])->name('finish');
        Route::post('/release', [\App\Http\Controllers\Api\StudioController::class, 'release'])->name('release');
    });
