{{-- Every meta tag a public page needs, in one place.

     Pass the page's route suffix (see App\Support\Seo::PAGES) so canonical and hreflang are built
     from the same source; without `page` the component still renders title/description/OG, it just
     cannot claim a canonical.

     Usage:
       <x-seo page="lessons" :title="__('History lessons')" :description="..." />
       <x-seo page="lesson" :params="['slug' => $slug]" :title="$lesson->title" :graph="$graph" /> --}}
@props([
    'title',
    'description',
    'page' => null,
    'params' => [],
    'image' => null,
    'type' => 'website',
    'graph' => null,
    'noindex' => false,
    // A page that exists in ONE language (a lesson): every prefix names that URL as canonical,
    // and there are no alternates to claim.
    'locale' => null,
])

@php
    use App\Support\Seo;

    $canonical = $page ? Seo::url($page, $params, $locale) : url()->current();
    $alternates = $page && ! $locale ? Seo::alternates($page, $params) : [];
    // Google cuts descriptions past ~160 characters; cut at a word instead.
    $description = Seo::clip($description, 160);
    // Facebook only shows an image on the very first scrape when it knows the size, so the
    // default card declares its own; a page-specific image is left for the crawler to measure.
    $isDefaultImage = ! $image;
    $image = $image ?: asset('images/og-default.png');
    $siteName = 'History Portal';
    // The title tag carries the brand once; the OG title does not repeat it. Past ~60 characters
    // Google cuts the title, so a long one drops the brand rather than lose its own words.
    $fullTitle = $title === $siteName ? $siteName : $title.' · '.$siteName;
    if (mb_strlen($fullTitle) > 60) {
        $fullTitle = $title;
    }
@endphp

<title>{{ $fullTitle }}</title>
<meta name="description" content="{{ $description }}">
<link rel="canonical" href="{{ $canonical }}">

@if ($noindex)
    <meta name="robots" content="noindex, follow">
@else
    <meta name="robots" content="index, follow, max-image-preview:large">
@endif

{{-- One URL per language, so a German search result points at the German page. --}}
@foreach ($alternates as $hreflang => $href)
    <link rel="alternate" hreflang="{{ $hreflang }}" href="{{ $href }}">
@endforeach

<meta property="og:type" content="{{ $type }}">
<meta property="og:site_name" content="{{ $siteName }}">
<meta property="og:title" content="{{ $title }}">
<meta property="og:description" content="{{ $description }}">
<meta property="og:url" content="{{ $canonical }}">
<meta property="og:image" content="{{ $image }}">
@if ($isDefaultImage)
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="History Portal">
@endif
<meta property="og:locale" content="{{ str_replace('-', '_', \App\Support\Locales::region(app()->getLocale())) }}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ $title }}">
<meta name="twitter:description" content="{{ $description }}">
<meta name="twitter:image" content="{{ $image }}">

@if ($graph)
    <script type="application/ld+json">{!! json_encode($graph, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) !!}</script>
@endif
