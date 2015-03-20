<?php
	$presenter = new app\lib\CustomPaginatePresenter($paginator);
?>

@if ($paginator->getLastPage() >= 1)
	<?php echo $presenter->render(); ?>
@endif
