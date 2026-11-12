<div data-scene-rail>
    <x-lesson.timeline :scenes="$scenes" :selected-scene-id="$titleSelected ? null : $selectedSceneId" editable call="$parent."
                       :problems="$problems" :title-screen="$titleScreen" />
</div>
