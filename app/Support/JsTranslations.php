<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The strings the player's JavaScript renders, handed to the browser already translated.
 *
 * `php artisan lang:audit` finds `__()` in PHP and Blade only, so anything a JS module built by
 * hand was invisible to it: five languages reported 100% while a French class answered a quiz that
 * praised them in English. Listing the strings HERE puts them back inside the audit, and inside
 * the test that fails the build when a language falls behind.
 *
 * Keyed by the English source, matching Laravel's JSON translations, so `t()` in the browser reads
 * the same way `__()` does on the server and an untranslated language degrades to English.
 *
 * WRITE EVERY ENTRY OUT IN FULL: the English as the array key, and the same English again inside
 * the translation call. Never build either side from a variable, a loop or a constant.
 *
 * The repetition is the point. The audit extracts strings by matching the translation helper
 * against a literal, the way every gettext-style extractor has to — it cannot run the code, so it
 * cannot see a string that arrives in a variable. An earlier version of this file looped over an
 * array and translated each entry in turn, which read better and quietly undid the whole exercise:
 * not one of these strings reached the catalogue, all of them were reported as UNUSED keys, and
 * `lang:audit --prune` would have deleted the lot. A loop here is not a refactor, it is the bug.
 *
 * (Nor may an example of the right shape be written out in this comment. The extractor reads the
 * whole file, comments included, and would add the example itself to the catalogue — leaving every
 * language permanently one string short of complete. It did.)
 *
 * @see resources/js/i18n.js
 */
final class JsTranslations
{
    /** @return array<string, string> */
    public static function forBrowser(): array
    {
        return array_merge(self::quiz(), self::player(), self::editor(), self::teamGame(), self::powerMeter(), self::testSession());
    }

    /**
     * The opt-in test-session recorder (resources/js/test-session/recorder.js).
     *
     * @return array<string, string>
     */
    private static function testSession(): array
    {
        return [
            'Test session' => __('Test session'),
            'This test is recorded: clicks and screen, no typing. Stop at any time.' => __('This test is recorded: clicks and screen, no typing. Stop at any time.'),
            'Start recording' => __('Start recording'),
            'Not now' => __('Not now'),
            'Close' => __('Close'),
            'Recording' => __('Recording'),
            'Stop recording' => __('Stop recording'),
            'This test session has ended or does not exist.' => __('This test session has ended or does not exist.'),
        ];
    }

    /**
     * The power-meter moment on a story panel (resources/js/scene/PowerMeter.js).
     *
     * @return array<string, string>
     */
    private static function powerMeter(): array
    {
        return [
            'Power meter' => __('Power meter'),
            'Turn' => __('Turn'),
            'Listening to the room' => __('Listening to the room'),
            'No microphone. Tap instead.' => __('No microphone. Tap instead.'),
            'Louder!' => __('Louder!'),
            'Blow!' => __('Blow!'),
            'Quiet now' => __('Quiet now'),
            'Sound level' => __('Sound level'),
            'The microphone only listens to loud and soft. Nothing is recorded.' => __('The microphone only listens to loud and soft. Nothing is recorded.'),
            'Tap to fill' => __('Tap to fill'),
            'Clap in time!' => __('Clap in time!'),
            'Shake!' => __('Shake!'),
            'Tilt!' => __('Tilt!'),
            'Move the phone' => __('Move the phone'),
            'Move the phone to fill the meter' => __('Move the phone to fill the meter'),
            'No motion sensor. Tap instead.' => __('No motion sensor. Tap instead.'),
            "Shaking works on a pupil's own phone. Tap instead." => __("Shaking works on a pupil's own phone. Tap instead."),
            'Use the motion sensor' => __('Use the motion sensor'),
            'The 1642 fleet' => __('The 1642 fleet'),
            'End the race' => __('End the race'),
            'you' => __('you'),
            'the crew' => __('the crew'),
            'Your best: :seconds s' => __('Your best: :seconds s'),
            'Which team are you in?' => __('Which team are you in?'),
            'That did not work. Try again.' => __('That did not work. Try again.'),
            'This race has ended. Look at the class screen.' => __('This race has ended. Look at the class screen.'),
            'Wait for your teacher to start the race.' => __('Wait for your teacher to start the race.'),
            'Your team crews the Heemskerck!' => __('Your team crews the Heemskerck!'),
            'Your team crews the Zeehaen!' => __('Your team crews the Zeehaen!'),
            'The race is over. Look at the class screen.' => __('The race is over. Look at the class screen.'),
            'Play on phones' => __('Play on phones'),
            'The race could not be opened. Play it on this screen.' => __('The race could not be opened. Play it on this screen.'),
            'Race QR code' => __('Race QR code'),
            'Teams join on their phones' => __('Teams join on their phones'),
            'Add team' => __('Add team'),
            'Remove team' => __('Remove team'),
            'Start the race' => __('Start the race'),
            'The teams are racing on their phones' => __('The teams are racing on their phones'),
            'Joined' => __('Joined'),
            'No signal' => __('No signal'),
            'Not joined yet' => __('Not joined yet'),
            'Your team is through! Wait for the others.' => __('Your team is through! Wait for the others.'),
            'Movement' => __('Movement'),
            // Audio & Subtitles panel (scene/caption-panel.js)
            'Off' => __('Off'),
            'Translating…' => __('Translating…'),
        ];
    }

    /**
     * The team game on the class screen (TeamGame.js): setup, loading, votes, reveal.
     *
     * @return array<string, string>
     */
    private static function teamGame(): array
    {
        return [
            'Team :number' => __('Team :number'),
            'You' => __('You'),
            'Choose' => __('Choose'),
            'Your choice' => __('Your choice'),
            'Your answer' => __('Your answer'),
            'Only you see this answer. It is not sent anywhere.' => __('Only you see this answer. It is not sent anywhere.'),
            'Too heavy: that would be :load of :capacity points. Leave something behind first.' => __('Too heavy: that would be :load of :capacity points. Leave something behind first.'),
            'Time is up' => __('Time is up'),
            'Pause' => __('Pause'),
            'Resume' => __('Resume'),
            '+1 minute' => __('+1 minute'),
            'Team game' => __('Team game'),
            'Roles in each team' => __('Roles in each team'),
            'Teams' => __('Teams'),
            'Fewer teams' => __('Fewer teams'),
            'More teams' => __('More teams'),
            'Start' => __('Start'),
            ':load of :capacity points loaded' => __(':load of :capacity points loaded'),
            'Always on board' => __('Always on board'),
            'Back' => __('Back'),
            'Reveal' => __('Reveal'),
            'Too heavy: :team would carry :load of :capacity points. Leave something behind first.' => __('Too heavy: :team would carry :load of :capacity points. Leave something behind first.'),
            'What later scenes need' => __('What later scenes need'),
            'Cargo' => __('Cargo'),
            'On board' => __('On board'),
            'Loaded' => __('Loaded'),
            'Points' => __('Points'),
            'Take out: :item' => __('Take out: :item'),
            'Results' => __('Results'),
            'Not loaded' => __('Not loaded'),
            'Are you ready?' => __('Are you ready?'),
            'Does it still fit?' => __('Does it still fit?'),
            'Why did you choose this?' => __('Why did you choose this?'),
            'Swap or keep as it is?' => __('Swap or keep as it is?'),
            'What could go wrong?' => __('What could go wrong?'),
            'Number :n, :role: are you ready?' => __('Number :n, :role: are you ready?'),
            'Number :n, :role: does it still fit?' => __('Number :n, :role: does it still fit?'),
            'Number :n, :role: why did you choose this?' => __('Number :n, :role: why did you choose this?'),
            'Number :n, :role: swap or keep as it is?' => __('Number :n, :role: swap or keep as it is?'),
            'Number :n, :role: what could go wrong?' => __('Number :n, :role: what could go wrong?'),
            'Choose within your team who is 1, 2, 3 and 4.' => __('Choose within your team who is 1, 2, 3 and 4.'),
            'Next turn' => __('Next turn'),
            'Next: :name' => __('Next: :name'),
            'Team size' => __('Team size'),
            'Ready' => __('Ready'),
            'Not yet confirmed' => __('Not yet confirmed'),
            ':count of :total ready' => __(':count of :total ready'),
            'Reopen' => __('Reopen'),
            'You still have points left. Ready anyway?' => __('You still have points left. Ready anyway?'),
            'Ready anyway' => __('Ready anyway'),
            'Not enough points. Take something out first.' => __('Not enough points. Take something out first.'),
            ':load of :capacity places full' => __(':load of :capacity places full'),
            ':count place free|:count places free' => __(':count place free|:count places free'),
            ':item, costs :count point|:item, costs :count points' => __(':item, costs :count point|:item, costs :count points'),
            'Only this ship' => __('Only this ship'),
            'This swap does not fit: first free up :count place|This swap does not fit: first free up :count places' => __('This swap does not fit: first free up :count place|This swap does not fit: first free up :count places'),
            'after the swap: :count place free|after the swap: :count places free' => __('after the swap: :count place free|after the swap: :count places free'),
            'Children per team' => __('Children per team'),
            'Load the ship' => __('Load the ship'),
            'To the results' => __('To the results'),
            'All ships' => __('All ships'),
            'Ships :from to :to' => __('Ships :from to :to'),
            'What would you still take?' => __('What would you still take?'),
            'Which choice stands out to you?' => __('Which choice stands out to you?'),
            'Last chance' => __('Last chance'),
            'What would you still change?' => __('What would you still change?'),
            'Swap out: :item' => __('Swap out: :item'),
            'Undo the swap' => __('Undo the swap'),
            'Keep as it is' => __('Keep as it is'),
            'Swap' => __('Swap'),
            'Ready to set sail?' => __('Ready to set sail?'),
            'Swapped' => __('Swapped'),
            'Kept as it is' => __('Kept as it is'),
            'Can still swap one thing' => __('Can still swap one thing'),
            'Your choices come back later in the story.' => __('Your choices come back later in the story.'),
            'Set sail' => __('Set sail'),
            'Continue the lesson' => __('Continue the lesson'),
            'But' => __('But'),
            'Teams choose' => __('Teams choose'),
            'Map of the options' => __('Map of the options'),
            'Real decision' => __('Real decision'),
            'Teams still to choose: :count' => __('Teams still to choose: :count'),
            'Close the discussion' => __('Close the discussion'),
        ];
    }

    /**
     * The quiz as the teacher edits it on the stage (QuizEditorSlides.js).
     *
     * @return array<string, string>
     */
    private static function editor(): array
    {
        return [
            'Correct answer' => __('Correct answer'),
            'This is the correct answer. Editing it changes what counts as right.' => __('This is the correct answer. Editing it changes what counts as right.'),
            'Previous question' => __('Previous question'),
            'Next question' => __('Next question'),
        ];
    }

    /**
     * The quiz card: the classroom sign-in, the score card and the leaderboard behind it.
     *
     * The praise ("Nice!", "Almost!") and the read-gate sentence were here until the card was
     * reworked to say all of that with motion instead — see resources/js/scene/QuizOverlay.js.
     *
     * @return array<string, string>
     */
    private static function quiz(): array
    {
        return [
            'Continue' => __('Continue'),

            // Joining a classroom leaderboard.
            'Join the leaderboard' => __('Join the leaderboard'),
            'Class code…' => __('Class code…'),
            'Your name…' => __('Your name…'),
            'Submit' => __('Submit'),
            'Pick a name (at least 2 letters).' => __('Pick a name (at least 2 letters).'),
            'Check the class code, ask your teacher.' => __('Check the class code, ask your teacher.'),
            'Could not submit, try again.' => __('Could not submit, try again.'),

            // The score card.
            ':correct of :total correct' => __(':correct of :total correct'),
            'Skip' => __('Skip'),

            // …and the leaderboard behind it. `t()` is a lookup, not `trans_choice`, so a count of
            // one and a count of many are two separate keys.
            'Leaderboard' => __('Leaderboard'),
            ':count player' => __(':count player'),
            ':count players' => __(':count players'),
            'No scores yet. You could be first!' => __('No scores yet. You could be first!'),
            'You are #:rank of :players. Keep climbing!' => __('You are #:rank of :players. Keep climbing!'),
            // Marks the reader's own row in the list.
            'you' => __('you'),

            // Both end screens hand the lesson back on their own, and say so while they do.
            'Lesson starts in :count' => __('Lesson starts in :count'),
        ];
    }

    /**
     * Player chrome that JavaScript writes rather than Blade.
     *
     * @return array<string, string>
     */
    private static function player(): array
    {
        return [
            // Leaving the tab mid-quiz pauses it behind a veil.
            'Quiz paused' => __('Quiz paused'),
            'Stay with the story. Tap to continue.' => __('Stay with the story. Tap to continue.'),

            // The chapter list's fallback for a scene with no name of its own. On a Dutch lesson
            // this was the one English phrase on screen.
            'Chapter :number' => __('Chapter :number'),

            // The chapter bar's tooltip and list name each scene's type; a played game says so.
            'Story' => __('Story'),
            'Quiz' => __('Quiz'),
            'Game' => __('Game'),
            'Map' => __('Map'),
            'Gallery' => __('Gallery'),
            'Video' => __('Video'),
            'Voyage' => __('Voyage'),
            'Played' => __('Played'),

            // Going back to a finished quiz shows it read-only, paged with these.
            'Previous' => __('Previous'),
            'Next' => __('Next'),
        ];
    }
}
