<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePlaytestNoteRequest;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

/**
 * Appends one spoken playtest note to playtests/{date}.jsonl on the local disk
 * (storage/app/private/…, which the deploy never touches). One JSON object per line,
 * so Claude can read a whole session with one file fetch.
 */
class PlaytestNoteController extends Controller
{
    public function store(StorePlaytestNoteRequest $request): Response
    {
        $note = [...$request->validated(), 'user_id' => $request->user()->id];

        Storage::disk('local')->append(
            'playtests/'.now()->toDateString().'.jsonl',
            json_encode($note, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        );

        return response()->noContent();
    }
}
