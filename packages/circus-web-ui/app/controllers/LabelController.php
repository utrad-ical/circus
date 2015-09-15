<?php
class LabelController extends ApiBaseController {
	/**
	 * Revisionの該当シリーズに紐づくラベル一覧取得(Ajax)
	 */
	function get_label_list() {
		$inputs = Input::all();
		$label_list = ClinicalCase::getLabelList($inputs);
		return Response::json(["label_list" => $label_list]);
	}
}