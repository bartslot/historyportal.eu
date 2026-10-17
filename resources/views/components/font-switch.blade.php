{{-- Display-font comparison: History (our own face, set in app.css) is the default; ?font=matter
     swaps back to the previous trial font, ?font=history returns. The choice lasts for this browser
     tab (sessionStorage), so a fresh visit always shows the default.
     A later @font-face with the same family and weight wins, so every 'History' use switches. --}}
<script>
    (function () {
        var key = 'hp-font', pick = new URLSearchParams(location.search).get('font');
        try {
            if (pick === 'history' || pick === 'matter') sessionStorage.setItem(key, pick);
            else pick = sessionStorage.getItem(key);
        } catch (e) {}
        if (pick !== 'matter') return;
        var css = [[300, 'Light'], [600, 'SemiBold'], [700, 'Bold']].map(function (w) {
            return "@font-face{font-family:'History';src:url('/fonts/History-" + w[1] + ".woff2') format('woff2');font-weight:" + w[0] + ";font-style:normal;font-display:swap}";
        }).join('');
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    })();
</script>
