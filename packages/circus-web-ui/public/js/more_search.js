//詳細検索の切替


function more_search(s_mode){

	//諸々の要素オブジェクト用意
	var search_mode = document.getElementById('search_mode');
	var more_inputs = $('#easy_search').find('input');
	if(s_mode){
		//詳細検索するモード
		console.log($('#search_detail').style);
		$('#search_detail').css("display","none");
		$('#search_easy').css("display","block");
		for(i=0; i<more_inputs.length; i++){
			more_inputs[i].disabled = true;
		}
	}else{
		//詳細検索しないモード
		$('#search_detail').css("display","block");
		$('#search_easy').css("display","none");
		for(i=0; i<more_inputs.length; i++){
			more_inputs[i].disabled = false;
		}
	}
	$('#search_condition').toggleClass('hidden');
	$('#easy_search').toggleClass('hidden');
	$('#search_mode').val(s_mode);

}