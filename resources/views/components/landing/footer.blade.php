@php
    $isTeacher = auth()->check() && auth()->user()->isTeacher();

    $socials = [
        ['label' => 'LinkedIn', 'href' => 'https://www.linkedin.com/in/bslot/'],
        ['label' => 'Instagram', 'href' => 'https://www.instagram.com/bart.travels/'],
    ];
@endphp

<footer id="contact" class="relative border-t border-white/10">
    {{-- This band had a background (footer-bg.svg over a gradient) until dde6356 replaced the
         declaration with the string "bg-blue-800" — a Tailwind class inside a style attribute,
         which sets nothing. It has rendered flat ever since, and bg-cover/bg-center had no image
         to size. public/footer-bg.svg is still there; what belongs here is a design decision. --}}
    <div class="relative -mt-px">
        <div class="section-container flex flex-col items-center justify-end py-12 text-center">
            <p class="text-sm uppercase tracking-[0.8em] text-sky-50/70">Contact</p>
            <h2 class="mt-3 font-history text-3xl text-white md:text-4xl">
                Tell me what you think of it.
            </h2>

            <div class="mt-8 flex flex-wrap justify-center gap-3">
                @foreach ($socials as $social)
                    <a
                        href="{{ $social['href'] }}"
                        target="_blank"
                        rel="noreferrer"
                        class="btn btn-sm btn-outline uppercase"
                    >
                        {{ $social['label'] }}
                    </a>
                @endforeach
            </div>

            <div class="mt-8 flex flex-wrap justify-center gap-4">
                
                <a
                    href="mailto:info@thelearningportal.us"
                    class="btn"
                >
                    Let&apos;s talk
                </a>
            </div>

            <p class="mt-8 max-w-2xl text-sm leading-7 text-sky-50/80">
                © 2026 History Portal, part of The Learning Portal. All rights reserved.
All lesson content, scripts, prompts, illustrations, images, animations, interface designs, games, downloadable materials, and platform content are owned by The Learning Portal or used under licence, unless stated otherwise. No part of this website or platform may be copied, reproduced, scraped, redistributed, sold, modified, or used to train AI systems without prior written permission.
            </p>
        </div>
    </div>
</footer>
