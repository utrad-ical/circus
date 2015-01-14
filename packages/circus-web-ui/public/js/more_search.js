//Advanced Search of switching

function more_search(){
	//Various elements object available
	var search_mode = document.getElementById('search_mode');
	var more_inputs = $('#easy_search').find('input');
	var s_mode = $('#search_mode').val();

	//切替
	s_mode = s_mode == 1 ? 0 : 1;
	$('#search_detail').text(s_mode == 1 ? 'Hide More Options' : 'Show More Options');

	$('#search_condition').toggleClass('hidden');
	$('#easy_search').toggleClass('hidden');
	$('#search_mode').val(s_mode);

}