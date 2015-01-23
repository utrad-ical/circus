$(function() {
	//Confirmation button is pressed during processing
	$('.storage_confirm').click(function(){
		var post_data = $('.frm_storage_confirm').serializeArray();
		var target_elm = $('.frm_storage_input');

		$.ajax({
			url: "./confirm",
			type: 'POST',
			data: post_data,
			dataType: 'json',
			error: function(){
				alert('I failed to communicate.');
			},
			success: function(res){
				target_elm.empty();
				target_elm.append(res.response);
				target_elm.attr('style', 'display:inline;');
			}
		});
		return false;
	});

	$('.link_storage_input').click(function(){
		//Get the form ID to be sent
		var post_data = '{"btnBack":"btnBack"}';
		post_data = JSON.parse(post_data);

		var target_elm = $('.frm_storage_input');

		$.ajax({
			url: "./input",
			type: 'POST',
			data: post_data,
			dataType: 'json',
			error: function(){
				alert('I failed to communicate.');
			},
			success: function(res){
				target_elm.empty();
				target_elm.append(res.response);
				target_elm.attr('style', 'display:inline;');
			}
		});
		return false;
	});

	//Processing at the time of registration button is pressed
	$('.storage_complete').click(function(){
		var post_data = $('.frm_storage_complete').serializeArray();
		var target_elm = $('.frm_storage_input');

		$.ajax({
			url: "./complete",
			type: 'POST',
			data: post_data,
			dataType: 'json',
			error: function(){
				alert('I failed to communicate.');
			},
			success: function(res){
				target_elm.empty();
				target_elm.append(res.response);
				target_elm.attr('style', 'display:inline;');
			}
		});
		return false;
	});

	$('.link_storage_edit').click(function(){
		//Get the form ID to be sent
		var post_data = $(this).closest('td').find('.frm_storage_id').serializeArray();
		var target_elm = $('.frm_storage_input');

		$.ajax({
			url: "./input",
			type: 'POST',
			data: post_data,
			dataType: 'json',
			error: function(){
				alert('I failed to communicate.');
			},
			success: function(res){
				target_elm.empty();
				target_elm.append(res.response);
				target_elm.attr('style', 'display:inline;');
			}
		});
		return false;
	});

	//When new registration button is pressed
	$('.frm_storage_enable').click(function(){
		var post_data = '{"mode":"register"}';
		post_data = JSON.parse(post_data);
		var target_elm = $('.frm_user_input');

		$.ajax({
			url: "./input",
			type: 'POST',
			data: post_data,
			dataType: 'json',
			error: function(){
				alert('I failed to communicate.');
			},
			success: function(res){
				target_elm.empty();
				target_elm.append(res.response);
				target_elm.attr('style', 'display:inline;');
			}
		});
		return false;
	});
});