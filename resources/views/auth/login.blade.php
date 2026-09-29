<x-layouts.guest :title="__('Sign In')">

    <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-sm">
        <h1 class="text-xl font-semibold text-slate-100 mb-6 text-center">{{ __('Welcome back') }}</h1>

        {{-- Carries the "your password has been changed" line back from the reset flow. --}}
        @if(session('status'))
            <div class="mb-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
                {{ session('status') }}
            </div>
        @endif

        {{-- Validation errors --}}
        @if($errors->any())
            <div class="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
                {{ $errors->first() }}
            </div>
        @endif

        <form method="POST" action="{{ route('login') }}" class="space-y-5">
            @csrf

            {{-- Email --}}
            <div>
                <label for="email" class="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    {{ __('Email address') }}
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autocomplete="email"
                    required
                    value="{{ old('email') }}"
                    class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500
                           focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="you@school.edu"
                >
            </div>

            {{-- Password --}}
            <div>
                <label for="password" class="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    {{ __('Password') }}
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    required
                    class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500
                           focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="••••••••"
                >
            </div>

            {{-- Remember + forgot. A reset route nobody can find is the same as no reset route. --}}
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <input id="remember" name="remember" type="checkbox"
                           class="rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary">
                    <label for="remember" class="text-sm text-slate-400">{{ __('Keep me signed in') }}</label>
                </div>
                <a href="{{ route('password.request') }}" class="text-sm text-primary hover:underline">
                    {{ __('Forgot password?') }}
                </a>
            </div>

            {{-- Submit --}}
            <button
                type="submit"
                class="btn btn-primary w-full"
            >
                {{ __('Sign in') }}
            </button>
        </form>

        <p class="mt-5 text-center text-xs text-slate-400">
            {{ __('Students: use the') }}
            <a href="#" class="text-primary hover:underline">History Portal app</a>
            {{ __('to access your lessons.') }}
        </p>
    </div>

</x-layouts.guest>
