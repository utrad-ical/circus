<?php
	$presenter = new Illuminate\Pagination\BootstrapPresenter($paginator);
?>

@if ($paginator->getLastPage() >= 1)
	<?php echo $presenter->render(); ?>
@endif
