$(function() {
	//Confirmation button is pressed during processing
	$('.group_confirm').click(function(){
		var post_data = $('.frm_group_confirm').serializeArray();
		var target_elm = $('.frm_group_input');

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

	$('.link_group_input').click(function(){
		//Get the form ID to be sent
		var post_data = '{"btnBack":"btnBack"}';
		post_data = JSON.parse(post_data);

		var target_elm = $('.frm_group_input');

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
	$('.group_complete').click(function(){
		var post_data = $('.frm_group_complete').serializeArray();
		var target_elm = $('.frm_group_input');

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




});