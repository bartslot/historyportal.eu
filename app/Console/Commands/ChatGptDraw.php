<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Art\HistoryLineStyle;
use App\Services\Editor\Cutouts;
use App\Services\Local\FitEditedPicture;
use App\Services\Local\LocalChatGpt;
use App\Services\Local\SparkJobs;
use App\Services\Support\WebpEncoder;
use Illuminate\Console\Command;
use RuntimeException;
use Throwable;

/**
 * One Draw (DrawsWithChatGpt): a new History Lines cut-out from the teacher's words, made by ChatGPT on this machine
 * and saved as their cut-out, so it is in My cut-outs and in the 3D library whether or not the page is still open.
 * Runs detached, because a local server has no queue worker.
 */
class ChatGptDraw extends Command
{
    protected $signature = 'chatgpt:draw {job}';

    protected $description = 'Draw a new History Lines cut-out with ChatGPT on this machine (Draw in the studio)';

    public function handle(LocalChatGpt $chatgpt): int
    {
        $id = (string) $this->argument('job');
        $job = SparkJobs::read($id);
        $user = $job === null ? null : User::find($job['user'] ?? 0);
        if ($job === null || $user === null || ($job['draw'] ?? false) !== true) {
            return self::FAILURE;
        }
        try {
            $raw = SparkJobs::dir($id).'/raw.png';
            $chatgpt->draw((string) $job['prompt'], array_map(HistoryLineStyle::anchorPath(...), HistoryLineStyle::drawAnchors()), $raw);
            $bytes = WebpEncoder::encode(FitEditedPicture::cutOut($raw), WebpEncoder::UPLOAD_QUALITY, WebpEncoder::MAX_SIDE);
            $mime = getimagesizefromstring($bytes)['mime'] ?? 'image/png';
            $asset = Cutouts::save($user, "data:{$mime};base64,".base64_encode($bytes), (string) $job['title']);
            if ($asset === null) {
                throw new RuntimeException('The drawn picture could not be saved as a cut-out.');
            }
            SparkJobs::write($id, ['status' => SparkJobs::DONE, 'asset' => $asset->id]);
        } catch (Throwable $e) {
            report($e);
            SparkJobs::write($id, ['status' => SparkJobs::FAILED]);

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
