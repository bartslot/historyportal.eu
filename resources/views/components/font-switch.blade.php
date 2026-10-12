{{-- Display-font trial: ?font=history loads the rebuilt History font (draft 9, public/fonts/history),
     ?font=matter goes back to the previous one. The choice is remembered per browser.
     A later @font-face with the same family and weight wins, so every 'History' use switches. --}}
<script>
    (function () {
        var key = 'hp-font', pick = new URLSearchParams(location.search).get('font');
        try {
            if (pick === 'history' || pick === 'matter') localStorage.setItem(key, pick);
            else pick = localStorage.getItem(key);
        } catch (e) {}
        if (pick !== 'history') return;
        var css = [[300, 'Light'], [600, 'SemiBold'], [700, 'Bold']].map(function (w) {
            return "@font-face{font-family:'History';src:url('/fonts/history/History-" + w[1] + ".woff2') format('woff2');font-weight:" + w[0] + ";font-style:normal;font-display:swap}";
        }).join('');
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    })();
</script>
