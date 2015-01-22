<?php

/**
 * Creates other database indices.
 */
class OtherSeeder extends Seeder
{
	public function run()
	{
		DB::table(Label::COLLECTION)->delete();
		Schema::create(Label::COLLECTION, function ($collection) {
			$collection->unique('labelID');
			$collection->index('createTime');
		});

		DB::table(ClinicalCase::COLLECTION)->delete();
		Schema::create(ClinicalCase::COLLECTION, function ($collection) {
			$collection->unique('caseID');
			$collection->unique('inclimentalID');
			$collection->index('createTime');
		});

		DB::table(Series::COLLECTION)->delete();
		Schema::create(Series::COLLECTION, function ($collection) {
			$collection->unique('seriesUID');
			$collection->index('studyUID');
			$collection->index('modality');
			$collection->index('bodyPart');
			$collection->index('domain');
		});
	}
}