$(document).ready(function() {

	$('#startdate, #enddate').datepicker({
		dateFormat: 'yy-mm-dd',
		maxDate: 0
	});
	// Debug only..
	$('#startdate').val('2014-11-05');
	$('#enddate').val('2014-11-10');
	$('#type_debug').prop('checked', true);
	$('#level_info').prop('checked', true);
	$('#label').val('WeatherInformation');
	// Set default time range from 00:00:00 to 23:59:59
	$('#starttime').val('00:00:00');
	$('#endtime').val('23:59:59');
	$('#query_btn').button().click(startQuery);
	$('#export_btn').button().click(exportAsExcel);
	$('#type, #level').buttonset();
	$('#project').selectmenu();
	$('#starttime, #endtime').timepicker({'timeFormat': 'H:i:s'});
	//alert('finished!');

	// force the type checkbox as single select
	$('#type input:checkbox').on('change', function() {
		if($(this).is(':checked'))
		{
			//console.log($('#type input:checkbox').not($(this)).prop('checked'));
			$('#type input:checkbox').not($(this)).prop('checked', false).button("refresh");
			if($(this).attr('id').indexOf('exceptions') > 0 )
			{
				$('#level input:checkbox').prop('checked', true).button('refresh');
			}
			else
			{
				$('#level input:checkbox').prop('checked', false).button('refresh');
				$('#level_info').prop('checked', true).button('refresh');
			}
		}
	});
});

function exportAsExcel() {
	var contentString = '';
	var dataLength = $('div[id^="q_data"]').length;
	console.log(dataLength);
	if(dataLength <= 0)
	{
		$('#message').html('<span style="color:red">No data can be exported!</span>');
		return;
	}

	// making new tables on the page to do the export.
	contentString += (
		'<table id="datatable">' +
			'<tr>' + 
				'<td>No.</td>' +
				'<td>Level</td>' +
				'<td>Label</td>' +
				'<td>Date</td>' +
				'<td>Time</td>' +
				'<td>Message</td>' +
			'</tr>'
	);
	
	$('div[id^="q_data"]').each(function(i) {

		contentString += (
			'<tr>' +
				'<td>' + $('#q_num_' + i).text().split('.').pop() + '</td>' +
				'<td>' + $('#q_level_' + i).text().split(':').pop() + '</td>' +
				'<td>' + $('#q_label_' + i).text().split(':').pop() + '</td>' +
				'<td>' + $('#q_date_' + i).text().split(':').pop() + '</td>' +
				'<td>' + $('#q_time_' + i).text().split('Time:').pop() + '</td>' +
				'<td>' + $('#q_msg_' + i).text() + '</td>' +
			'</tr>'
		);		
	});
	
	contentString += '</table>';
	// temporarily put it to the tmp div block to make it exportable
	$('#tmp').html(contentString);
	// save as BlackloudLog.xls file
	$('#export_btn').prop('download','BlackloudLog.xls');
	ExcellentExport.excel(this, 'datatable', 'hello');
	$('#tmp').html('');
}

function startQuery() {
	// Error or null handling ... 
	var valid = true;
	var type = $('input[id^="type_"]:checked').attr('id').substr(5);
	var startdate = $('#startdate').val();
	var enddate = $('#enddate').val();
	var levelString = '';
	var levelList = [];
	var starttime = $('#starttime').val();
	var endtime = $('#endtime').val();
	var project = $('#project').val();
	var label = $('#label').val();
	// get level values
	$('#level :checkbox:checked').each(function(str){
		levelString += ($(this).attr('id').substr(6) + '&');
		levelList.push($(this).attr('id').substr(6));
	});

	$('#content, #navbar').empty();
	$('#message').html('');
	// error input handling...
	if( type == null )
	{
		$('#message').html('<span style="color:red">Please specify query TYPE!</span>');
		return;
	}
	else if(levelString.length == 0)
	{
		$('#message').html('<span style="color:red">Please specify query LEVEL!</span>');
		return;
	}

	$('input:text').css('background-color','white').each(function() {
		console.log($(this).val());
		if($(this).val() == '')
		{
			if($(this).attr('id') == 'label')
			{
				$(this).val('All');
				label = $(this).val();
			}
			else
			{
				$('#message').html('<span style="color:red">Please fill in the corresponding VALUE!</span>');
				$(this).css('background-color','yellow');
				valid = false;
			}
			return valid;
		}
	});
	
	var now = new Date();
	var tmpStartDate = new Date(startdate);
	var tmpEndDate = new Date(enddate);
	console.log('dur: ' + (tmpEndDate-tmpStartDate));
	if(tmpEndDate - tmpStartDate > 1000 * 60 * 60 * 24 * 7)
	{
		$('#message').html('<span style="color:red">You can only query log with duration 7 days</span>');
		valid = false;
	}	
	else if(startdate > enddate || tmpStartDate.getTime() > now.getTime() || tmpEndDate.getTime() > now.getTime())
	{
		$('#message').html('<span style="color:red">Error on date specification.</span>');
		valid = false;
	}

	if(starttime > endtime)
	{
		$('#message').html('<span style="color:red">Error on time specification.</span>');
		valid = false;
	}
	if( !valid ) return valid;
	// end of empty input handling...
	//console.log('label = ' + $('#label').val());
	var debug = 'start date: ' + startdate + '&nbsp' +
				'end date: ' + enddate + '&nbsp' +
				'type: ' + type + '&nbsp' +
				'level: ' + levelString + '&nbsp' +
				'start time: ' + starttime + '&nbsp' +
				'end time: ' + endtime + '&nbsp';
	//$('#debug').html(debug);

	var params = {
		type:  type,
		sdate: startdate, 
		edate: enddate, 
		project: project,
		label: label,
		level: levelString,
		stime: starttime, 
		etime: endtime
	}
	//$('#debug').append(params['tlist']);
	$.ajax({
		data: JSON.stringify(params), 
		url: '/StartLogQuery', 
		type: 'post',
		contentType: 'application/json',
		//dataType: 'json',
		//timeout: 3000, 
		beforeSend: function(xhr) {
			$('#mask').show();
		},
		success: function(data) {
			console.log('data length = ' + data.length);
			//console.log(data);
			if( data.length == 0 )
			{
				$('#message').html('Project <span style="color:black; background-color:yellow;">' + params.project + '</span> : ' + 
									' Total <span style="color:black">' + data.length + '</span> results from the query.');
				return;
			}

			// counter i was started from 1 in order to align the page amount
			var i=1, j=0, cnt=0;
			// data amount per page
			var dataAmount = 15;
			// total page amount
			// if data.length cannot be divided by dataAmount then we need another page for the remaining data
			var pageAmount = (data.length%dataAmount == 0) ? Math.floor(data.length/dataAmount) : Math.floor(data.length/dataAmount)+1 ;
			// making data div blocks and put it into the container
			var contentString = makeDataDiv(params.type, data, dataAmount, pageAmount);
			$('#content').html(contentString);
			
			// Check if the data overflows (50% of window width)
			// if overflow, then make it expandable.
			var bodyWidth = $('#body').width();
			$('div[id^="q_msg_"]').each(function(i) {
				//makeJSONIcon(i);				
				if($(this).hasClass('isJSON')) makeJSONIcon(i);				
				if($(this).prop('scrollWidth') >= (bodyWidth))
				{
					makeExpandIcon(i);
				}
			});
			// Set all pages as not displayed and the first page shows
			$('div[id^="q_page_"]').hide();
			$('#q_page_1').addClass('_current').show();
			
			// Setup pagination bar
			$("#navbar").paginate({
				count 		: pageAmount,
				start 		: 1,
				display     : (pageAmount > 10) ? 10 : pageAmount,
				border					: true,
				border_color			: '#fff',
				text_color  			: '#000',
				background_color    	: 'dddddd',	
				border_hover_color		: '#ccc',
				text_hover_color  		: '#000',
				background_hover_color	: '#fff', 
				images					: false,
				mouse					: 'press',
				onChange     			: function(page){
											$('._current').removeClass('_current').hide();
											$('#q_page_' + page).addClass('_current').show();
											console.log('change to page ' + page);
										  }
			});	
			$('#message').html('Project <span style="color:black; background-color:yellow;">' + params.project + '</span> : ' + 
								' Total <span style="color:black">' + data.length + '</span> results from the query.');
		}, 
		error: function(err) {
			$('#message').html('<span style="color:red">Error!!!!</span>');
		}, 
		complete: function() {
			$('#mask').fadeOut();
		}
	});
}

function makeDataDiv(type, data, dataAmount, pageAmount) {

	var i=0, j=0, cnt=0;
	var contentString = '', 
		levelString = '', 
		labelString = '', 
		dateString = '',
		timeString = '',
		msgString = '';
	//console.log('data.length: ' + data.length);
	//console.log('pageAmount: ' + pageAmount);
	// Add new divs to display the query data
	for(i=1 ; i<=pageAmount ; i++)
	{
		contentString += '<div id="q_page_' + i + '" class="blk_page">';
		//console.log('page_' + i);
		for(j, cnt=0 ; j<data.length ; j++, cnt++)
		{	
			if(cnt == dataAmount)
				break; 
			
			// Get prepared for the query data strings...	
			switch(data[j].level)
			{
				case 'error':
					levelString = '<span style="color:red">Error</span>';
					break;
				case 'warn':
					levelString = '<span style="color:orange">Warning</span>';
					break;
				case 'info':
					levelString = '<span style="color:green">Info</span>';
					break;
				default:
					levelString = '<span style="color:black">N/A</span>';						
			}
			
			if(data[j].label != '') labelString = '<span style="color:blue">' + data[j].label + '</span>';
			else labelString = '<span style="color:black">N/A</span>';
				
			timeString = data[j].timestamp;	
			if( type == 'debug' )
				msgString = data[j].message;	
			else
				msgString = JSON.stringify(data[j]);

			dateString = data[j].date;
	
			var msgClassString = '';
			if(isJSON(msgString)) msgClassString = 'blk_msg isJSON';
			else	msgClassString = 'blk_msg';

			contentString += 
				('<div id="q_data_' + j + '" class="blk_data">' +
					'<div class="blk_title">' +
						'<div id="q_num_' + j + '" class="blk_num">No.' + (j+1) + '</div>' +
						'<div id="q_level_' + j + '" class="blk_level">Level: ' + levelString + '</div>' +
						'<div id="q_label_' + j + '" class="blk_label">Label: ' + labelString + '</div>' +
						'<div id="q_date_' + j + '" class="blk_date">Date: <span style="color:blue">' + dateString + '</span></div>' +
						'<div id="q_time_' + j + '" class="blk_time">Time: <span style="color:blue">' + timeString + '</span></div>' +
					'</div>' + 
					'<div id="q_msg_' + j + '" class="' + msgClassString + '">' + msgString + '</div>' + 
				'</div>');
			
			//console.log('data: ' + data[j].level);
			
		}
		contentString += '</div>';
		//console.log(contentString);
	}
	return contentString;
}

function isJSON(data) {
    var isJson = false;
    try {
        // this works with JSON string and JSON object, not sure about others
       var json = $.parseJSON(data);
       isJson = typeof json === 'object' ;
    } catch (ex) {
        console.error('data is not JSON');
    }
    return isJson;
}


function toggleDiv(i) {
	var msgDiv = $('#q_msg_' + i);
	var iconDiv = $('#icon_' + i);
	if( msgDiv.attr('isExpanded') != 'true' )
	{
		msgDiv.css({
			'height'	   :	'auto',
			'overflow'	   :	'auto',
			'white-space'  :	'normal',
			'text-overflow':	'clip',
			'display'	   :	'none'
		}).slideDown(200, function() { 
			$(this).attr('isExpanded', 'true');
			iconDiv.css('background', 'url(../img/minus-icon.gif) no-repeat');
		});
		console.log('expand!');
	}
	else
	{
		msgDiv.animate({ 'height': '24px' }, 200, function() {
			$(this).css({
				'overflow'	   :	'hidden',
				'text-overflow':	'ellipsis', 
				'white-space'  :    'nowrap'
			});
			$(this).attr('isExpanded', 'false');
			iconDiv.css('background', 'url(../img/plus-icon.gif) no-repeat');
		});
		console.log('close');
	}
}

function toggleJSONDiv(i) {
	var jsonIcon = $('#jicon_' + i);
	
	if(jsonIcon.attr('isExpanded') != 'true')
	{
		var tmpDiv = '<div class="blk_msg tmp"></div>';
		$(tmpDiv).insertAfter($('#q_msg_' + i));
		$('#q_msg_' + i).siblings('.tmp').jsonFormat($('#q_msg_' + i)).css({
			'white-space': 'pre', 
			'background' : '#fffff0',
			'height'	   :	'auto',
			'overflow'	   :	'auto',
			'text-overflow':	'clip', 
		});
		jsonIcon.attr('isExpanded', 'true');
		jsonIcon.attr('title', 'Click to close formatted JSON');
	}
	else
	{
		$('#q_msg_' + i).siblings('.tmp').remove();
		jsonIcon.attr('isExpanded', 'false');
		jsonIcon.attr('title', 'Click to see formatted JSON');
	}
}

function makeJSONIcon(i)
{
	var jIconDiv = '<div id="jicon_' + i + '"class="blk_jicon" title="Click to see formatted JSON">[JSON]</div>';
	$(jIconDiv).insertAfter('#q_time_' + i);
	$('#jicon_' + i).tooltip({ track: true }).click(function() {
		toggleJSONDiv(i);
	});
}

function makeExpandIcon(i)
{
	var iconDiv = '<div id="icon_' + i + '"class="blk_icon" title="Click to expand more information"></div>';
	$(iconDiv).insertAfter('#q_time_' + i);
	$('#icon_' + i).tooltip({ track: true }).click(function() {
		toggleDiv(i); 
	});
}

