//詳細検索の切替

function more_search(){
	//諸々の要素オブジェクト用意
	var search_mode = document.getElementById('search_mode');
	var more_inputs = $('#easy_search').find('input');
	var s_mode = $('#search_mode').val();

	//切替
	s_mode = s_mode == 1 ? 0 : 1;
	$('#search_detail').text(s_mode == 1 ? 'Hidden More Options' : 'Show More Options');

	$('#search_condition').toggleClass('hidden');
	$('#easy_search').toggleClass('hidden');
	$('#search_mode').val(s_mode);

}