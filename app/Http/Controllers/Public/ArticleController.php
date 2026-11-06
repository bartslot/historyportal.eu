<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\WordPressContent;
use App\Support\OwnArticles;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Articles written in WordPress, read on this subdomain.
 *
 * The marketing site is the editor; this is the reader. Nothing is stored here, so a post is live on
 * the subdomain as soon as WordPress publishes it and the 30-minute cache turns over.
 *
 * The index also lists the articles that are pages in this app (OwnArticles), so it is never empty,
 * whatever WordPress holds or however it is doing.
 */
class ArticleController extends Controller
{
    private const INDEX_LIMIT = 50;

    public function __construct(private readonly WordPressContent $wordpress) {}

    public function index(): View
    {
        return view('marketing.articles.index', [
            'articles' => $this->wordpress->posts(self::INDEX_LIMIT)
                ->concat(OwnArticles::all())
                ->sortByDesc('published_at')
                ->values(),
        ]);
    }

    public function show(Request $request): View
    {
        $article = $this->wordpress->post((string) $request->route('slug'));

        abort_if($article === null, 404);

        return view('marketing.articles.show', ['article' => $article]);
    }
}
