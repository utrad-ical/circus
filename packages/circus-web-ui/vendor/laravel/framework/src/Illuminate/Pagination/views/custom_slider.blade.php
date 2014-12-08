<?php
	$presenter = new Illuminate\Pagination\BootstrapPresenter($paginator);
?>

@if ($paginator->getLastPage() >= 1)
	<ul class="common_pager clearfix">
		<?php echo $presenter->render(); ?>
		<li class="pager_sort_order">
			{{Form::select('sort', array('' => 'Sort Order', 'lastUpdate' => 'Last Update', 'caseID' => 'ID'), '', array('class' => 'w_max'))}}
		</li>
		<li class="pager_disp_num">
			{{Form::select('disp', array('' => 'display num', 10 => 10, 50 => 50, 100 => 100, 'all' => 'all'), '', array('class' => 'w_max'))}}
		</li>
	</ul>
@endif
