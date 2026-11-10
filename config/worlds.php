<?php

declare(strict_types=1);

/*
 * The splat worlds a teacher can put under a stage25d scene (config.stage25d.world). A world is a .spz file and a
 * 320x180 thumbnail in public/worlds/; add one here and it shows in the scene panel's World picker. The picker only
 * ever saves a key from this list, so a scene can never point its world anywhere else. `place` is where it starts
 * when picked (metres, a size factor, degrees: the World sliders), lined up so it rises behind a set.
 */
return [
    'valley' => ['label' => 'Valley', 'file' => 'worlds/valley.spz', 'thumb' => 'worlds/valley.webp', 'place' => ['y' => -1, 'z' => 8, 'scale' => 4]],
];
