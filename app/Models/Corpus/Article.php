<?php

declare(strict_types=1);

namespace App\Models\Corpus;

use Illuminate\Database\Eloquent\Model;

/**
 * Read-only view over the existing corpus table public.history_articles.
 * Never written by the app.
 */
class Article extends Model
{
    protected $connection = 'pgsql_corpus';

    protected $table = 'history_articles';

    public $timestamps = false;

    protected $guarded = [];
}
