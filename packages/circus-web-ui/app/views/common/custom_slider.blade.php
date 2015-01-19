<?php
	//$presenter = new Illuminate\Pagination\BootstrapPresenter($paginator);
	$presenter = new app\lib\CustomPaginatePresenter($paginator);
?>

@if ($paginator->getLastPage() >= 1)
	<?php echo $presenter->render(); ?>
@endif
