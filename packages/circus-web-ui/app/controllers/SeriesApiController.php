<?php

class SeriesApiController extends ApiBaseController {
	public function show($series_uid) {
		$series = Series::findOrFail($series_uid);
		$user = Auth::user();

		// Check the user has access to the domain to which this series belongs.
		$domains = $user->listAccessibleDomains();
		if (array_search($series->domain, $domains) === false) {
			return $this->errorResponse(
				'You do not have the privilege to access to this series.',
				401
			);
		}

		$series = $series->toArray();
		$series['seriesDate'] = Util::mongoToISO($series['seriesDate']);

		// Checks the user can access the personal information of this series.
		$personalInfoVisible =
			$user->hasPrivilege(GROUP::PERSONAL_INFO_VIEW) &&
			$user->preferences['personalInfoView'];
		if (!$personalInfoVisible) {
			$series = array_except($series, ['patientInfo']);
		}

		return Response::json($series);
	}
}
