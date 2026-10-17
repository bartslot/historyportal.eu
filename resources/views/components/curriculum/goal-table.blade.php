{{-- One table for curriculum goals, used on the lesson page (with each link's fit) and on the
     curriculum pages (with each goal's lesson count). Every row links to the goal's own page. --}}
@props(['goals', 'counts' => false, 'fit' => false])

<div {{ $attributes->merge(['class' => 'overflow-x-auto']) }} data-curriculum-table>
    <table class="table table-sm">
        <thead>
            <tr class="border-white/10 text-slate-300">
                <th>Onderdeel</th>
                <th>Omschrijving</th>
                @if ($fit)<th>Aansluiting</th>@endif
                @if ($counts)<th class="text-right">Lessen</th>@endif
            </tr>
        </thead>
        <tbody>
            @foreach ($goals as $goal)
                <tr class="border-white/10 align-top text-slate-300">
                    <td class="whitespace-nowrap font-semibold {{ $goal->type === 'kenmerkend_aspect' ? 'pl-6' : '' }}">
                        <a href="{{ route('public.curriculum.goal', $goal->slug) }}" class="hover:text-primary">{{ $goal->label() }}</a>
                    </td>
                    <td>
                        {{ $goal->title }}
                        @if ($goal->period && $goal->type !== 'kenmerkend_aspect')
                            <span class="whitespace-nowrap">({{ $goal->period }})</span>
                        @endif
                    </td>
                    @if ($fit)
                        <td class="whitespace-nowrap">{{ $goal->pivot->fit === 'partial' ? 'Gedeeltelijk' : 'Direct' }}</td>
                    @endif
                    @if ($counts)
                        <td class="text-right tabular-nums">{{ $goal->lessons_count ?: '–' }}</td>
                    @endif
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
