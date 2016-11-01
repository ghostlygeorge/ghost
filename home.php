<?php
	require_once('watchdog.php');
?>
<!DOCTYPE  html>
<html>
<head>
<link rel="stylesheet"
	type="text/css"
	href="home.css"/>
<script type = "text/javascript"
	src = "jquery.js">
</script>	
<script type="text/javascript">
	document.cookie = "username=<?echo $_SESSION['SESS_USERNAME']?>";
	var allcoo = document.cookie.split(';');
	var it = allcoo[1].split('/');
	var fin = it[0].split('=');
	var fini = fin[1];
	$(document).ready(function(){
		if(fini=="PAT"){
			$("#docc").hide();
			$("#secc").hide();
			$("#docc2").hide();
			$("#docc3").hide();
			$("#secc9").hide();
		}

		if(fini=="DOC"){
			$("#patt").hide();
			$("#secc").hide();
			$("#patt1").hide();
			$("#patt3").hide();
			$("#secc9").hide();
		}

		if(fini=="SEC"){
			$("#patt").hide();
			$("#patt1").hide();
			$("#docc").hide();
			$("#patt3").hide();
			$("#docc2").hide();
			$("#docc3").hide();
		}

		$('#content').html("<div id='content_title'><h2>Welcome </h2><p>Select an Item From The Action Center</p></div>");
		$('#content').append("<div id='content_information'><p>Welcome Home! Please Use the Action Bar to the left to access any availbale service.You may contact any nearby Administrator for help,<br> Hints are displayed when you hover over an item</p></div>");
	$('#content').css({ 'background': 'rgba(255,255,255,.1)',
  		'border-radius' : '.9em',
  		'width': '65%',
  		'padding': '14px',
  		'margin-top': '94px'})
	});

	function getAJAX(){
		$.get("home_info.html", null,processResult);
}

		

	
	function getAppoinCreator(){
		$.get("make_appoin.php",null,processAppts);	
	}

	function getApptHistory(){
		$.get("appt_history.php",null,processHistResult);
	}

	function backupDb(){
		$.get("backup.php",null,procDb);
	}

	function procDb(data,textStatus){
		$("#content").html(data);
		$("#header_info").html("Backing Up The Database");
	}

	function getFinance(){
		$.get("make_payment.php",null,processFinance);
	}

	function getPayHistory(){
		$.get("fin_history.php",null,processFinRes);
	}

	function getTreatmentsHist(){
		$.get("treatment_hist.php",null,processTreats);
	}

	function addTreatHist(){
		$.get("Createhist.php",null,processHistResultadd);
	}

	function processHistResultadd(data,textStatus){
		$("#content").html(data);
		$("#header_info").html("Create Patient History");
	}

	function processTreats(data,textStatus){
		$("#content").html(data);
		$("#header_info").html("Patient Treatment History");
	}

	function processFinRes(data,textStatus){
		$("#content").html(data);
		$("#header_info").html("Total Paid");	
	}
	
	function processAppts(data,textStatus){
		$("#content").html(data);
		$("#header_info").html("Create Appointment");
	}	

	function getAppoins(){
		$.get("appoins.php",null,processAppos);
	}
	function processAppos(data,textStatus){
		$("#content").html(data);
		$("#header_info").html("Appointments for You");
	}	

	function processFinance(data,textStatus){
		$("#content").html(data);
		$("#header_info").html("Finance data");
	}

	function processHistResult(data,textStatus){
		$("#content").html(data);
		$("#header_info").html("Appointment History");
	}

	function getTreatments(){
		$.getJSON("treatment.json",null,processJsonResult);
	}

	function processJsonResult(data,textStatus){
		$("#content").html("<div id='content_title'><h2>Treatment Prices</h2><br><p>Prices for procedures Available</p></div>");
		$("#content").append("<div id='content_information'><br>");
		for (name in data){
			var pet = data[name];
			for (detail in pet){
				$("#content_information").append("<tr><td><strong></em>"+ detail + "</strong></em></td><td> " + pet[detail] + "</td></tr>");
			} // end for
			$("#content_information").append("</table>");
			} // end fo
		}

	function processResult(data, textStatus){
		$("#content").html(data);
		$("#header_info").html("About us");
	}

	function proc(data,textStatus){
		$(document).html(data);
	}

	$(window).scroll(function(){
		if($(this).scrollTop() > 1){
			$('div#header_info').addClass("sticky");
			$('div#header_items').addClass("sticky");
			$('nav').addClass("height_corr");
			$('header').addClass('sticky');
		}else{
			$('div#header_info').removeClass("sticky");
			$('div#header_items').removeClass("sticky");
			$('header').removeClass('sticky');
			$('nav').removeClass("height_corr");
		}
	});
</script>
<title>Home</title>
</head>
<body>
<header>
	<div id="header_info">
<h2>Athena</h2>
<h3>Understanding your needs</h3>
	</div>
	<div id="header_items">
		<label> signed in as <?php  echo $_SESSION['SESS_USERNAME']?></label>
		<br>
		<input type="button" ondblclick="alert('double clck')" onclick="getAJAX()" value="About Athena"/>
	</div>
</header>

<nav>
	<div class="navbar_header">
	<h2>Action Center</h2>
	</div>
	<div class="navbar_items" id="nav_item">
		<ul>
		<div id="navlist">
		<li>Appointment</li>
		<ul>
			<li id="patt"><button onclick="getAppoinCreator()">Make Appointment</button></li>
			<li id="patt1"><button onclick="getApptHistory()">Appointment History</button></li>
			<li id="docc"><button onclick="getAppoins()">View Appointments</button></li>
		</ul>
	</div>
	<div id="navlist">
		<li>Treatment</li>
		<ul>
			<li id="all"><button onclick="getTreatments()">Available Procedures</button></li>
			<li id="docc3"><button onclick="addTreatHist()">Add Patient History</button></li>
			<li id="docc2"><button onclick="getTreatmentsHist()">Treatment History</button></li> 
		</ul>
	</div>
	<div id="navlist">
		<li>Finances</li>
			<ul>
				<li id="secc"><button  onclick="getFinance()">Add Payment</button></li>
				<li id ="patt3"><button  onclick="getPayHistory()">Payment History</button></li>
				<li id = "secc9"><button onclick="backupDb()">Backup Database</button></li>
			</ul>
		</div>
	</ul>
	</div>
</nav>
<div id="content">
	<p><br>Response Text Here</p>
</div>
<footer>
<h2>Bug Report?</h2>
<address>
Harry K<br />
<a href = "mailto:kituyiharry@gmail.com">
kituyiharry@gmail.com</a>
</address>	
</footer>
</body>
</html>
