<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Local\FitEditedPicture;
use App\Services\Local\LocalChatGpt;
use App\Services\Local\SparkJobs;
use Illuminate\Console\Command;
use Throwable;

/** One spark edit (EditsWithSpark): runs detached on this machine, because a local server has no queue worker. */
class ChatGptEditImage extends Command
{
    protected $signature = 'chatgpt:edit-image {job}';

    protected $description = 'Edit a picture with ChatGPT on this machine (the spark in the studio)';

    public function handle(LocalChatGpt $chatgpt): int
    {
        $id = (string) $this->argument('job');
        $job = SparkJobs::read($id);
        if ($job === null) {
            return self::FAILURE;
        }
        try {
            $source = SparkJobs::dir($id).'/source.png';
            $old = FitEditedPicture::open($job['source']);
            imagepng($old, $source);
            $raw = SparkJobs::dir($id).'/raw.png';
            $chatgpt->editImage($source, $job['prompt'], $raw, FitEditedPicture::isCutOut($old));
            file_put_contents(SparkJobs::dir($id).'/result.png', FitEditedPicture::fit($source, $raw));
            SparkJobs::write($id, ['status' => SparkJobs::DONE]);
        } catch (Throwable $e) {
            report($e);
            SparkJobs::write($id, ['status' => SparkJobs::FAILED]);

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
