<?php

/**
 * BlobController represents API that manages arbitrary binary data
 * wit its SHA-1 hash, similar to the object storage of Git.
 */
class BlobController extends ApiBaseController
{

	private function join_paths()
	{
		$paths = array();
		foreach (func_get_args() as $arg) {
			if ($arg !== '') {
				$paths[] = $arg;
			}
		}
		return preg_replace('#(\\\\|/)+#', '/', join('/', $paths));
	}

	protected function getObjectDir($storage, $hash)
	{
		return $this->join_paths(
			$storage->path .
			substr($hash, 0, 2),
			substr($hash, 2, 2)
		);
	}

	public function put($id)
	{
		// Gets the raw HTTP request body (contains file data itself)
		$content = Request::getContent();

		if (strlen($content) === 0) {
			throw new Exception('Invalid data length.');
		}
		$hash = sha1($content);
		if ($hash !== $id) {
			throw new Exception('Hash mismatch detected.');
		}

		$storage = Storage::getCurrentStorage('label');
		$dir = $this->getObjectDir($storage, $hash);


		File::makeDirectory($dir, 0755, true);
		file_put_contents("$dir/$hash.gz", gzencode($content));
		return $this->succeedResponse();
	}

	public function get($id)
	{
		// TODO: This obviously does not support data stored in currently inactive label storage.
		$storage = Storage::getCurrentStorage('label');
		$dir = $this->getObjectDir($storage, $id);
		$file = "$dir/$id.gz";

		if (!file_exists($file)) {
			return $this->errorResponse('Not found', 404);
		}

		if (Request::getRealMethod() == 'HEAD') {
			return Response::make();
		} else {
			$content = file_get_contents("$dir/$id.gz");
			if ($content === false) {
				return $this->errorResponse('Could not load the object', 500);
			}
			return Response::make($content)
                ->header('Content-encoding', 'gzip')
                ->header('Content-type', 'application/octet-stream');
		}

	}

}