<?
	session_start();
	unset($_SESSION['SESS_USERNAME']);
	unset($_SESSION['SESS_PASS']);
?>
<!DOCTYPE html> 
<html>
<head profile="http://www.yoursite.com/profile">
<link rel="icon" 
  type="image/png" 
  href="data:image/jpeg;base64,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"/>
<link rel="stylesheet"
	type="text/css"
	href="signup.css" />
<script type = "text/javascript"
src = "jquery.js"></script>	
<script type="text/javascript"
	src="./jquery-ui-master/ui/widgets/datepicker.js">
</script>
<script type="text/javascript">
	$(document).ready(function(){
			$("#datePicker").datepicker();
	});
	$(window).scroll(function(){
			if($(this).scrollTop() > 1){
			$('div#header').addClass("sticky");
			}else{
			$('div#header').removeClass("sticky");
			}
			});

	function CheckSame(){
		$("#errmsg").empty();
		if($("#pass1").val() != $("#pass2").val()){
			$("#errmsg").append("<strong><em><font color=red>Non-Matching passwords</font></strong></em>");
			$("#submitt").prop('disabled',true);
		}else{
			$("#errmsg").empty();
			$("#submitt").prop('disabled',false);
		}
	}

	function checkValid(){
		if($("uitem").val()== "patient"){
			$("select#docc").prop('disabled',true);
		}
	}
</script>
<title> Sign UP! </title>
</head>
<body>
	<!--update the type and methods to be used-->
	<!--add javascript methods making some items unavailable to other users-->
	<div id="container">
	<div id="header">
		<h2>Athena</h2>
	</div>
	<div class="formsection" id="formsec">
	<fieldset>
		<legend>Personal Information</legend>
		<form method="POST" action="signup.php" autocomplete="on" nonvalidate="true">
		<p>
		<fieldset>
			<legend>User Type</legend>
			<div id="subdiv">
			<span id="component1">
			<select name="user_type" id=uitem onchange="checkValid()">
				<option value="patient">Patient</option>
				<option value="doctor">Doctor</option>
				<option value="Secretary">Secretary</option>
			</select>
		</span>
			<br>
			<span id="component1">
			<input name="hostident" type="text" placeholder="Hospital identification for staff"/>
		</span>
			</div>
		</fieldset>
		<fieldset>
			<legend>Full Name</legend>
			<div id="subdiv">
		<input name="name" type="text" required="required" placeholder="Your Full Name" maxlength="80">
	</div>
	</fieldset>
	<fieldset>
		<legend>Date Of Birth</legend>
		<div id="subdiv">
		<input type="text" required="required" placeholder="Date Of Birth" id="datePicker" name="birthday">
	</div>
	</fieldset>
		<p>
		<fieldset>
			<legend>Gender</legend>
			<div id="subdiv">
			<span id="component1">
		<input name="gender" value="male" type="radio" checked > Male</input>
	</span>
	<span id="component2">
		<input name="gender" value="female" type="radio"> Female</input>
	</span>
	</div>
		</fieldset>
		</p>
		<p>
		<fieldset>
			<legend>National Identity Number</legend>
			<div id="subdiv">
		<input name="idnumber" type="text" required="required" maxlength="8"/>
	</div>
		</fieldset>
		</p>
		<p>
		<fieldset>
			<legend>Field of Specialization</legend>
			<div id="subdiv">
		<!--- select from a given set-->
		<select name="specialty" id="docc">
			<option value="dentist" selected>Dentist</option>
			<option value="optician">Optician</option>
			<option value="physician">Physician</option>
		</select>
		</p>
	</div>
		</fieldset>
		<fieldset>
			<legend>Telephone Number</legend>
			<div id="subdiv">
		<input name="phonenumber" type="tel" required="required">
		</p>
	</div>
		</fieldset>
		<p>
		<fieldset>
			<legend>Email</legend>
			<div id="subdiv">
		<input name="email" type="email">
		</p>
	</div>
	</fieldset>
	<fieldset>
		<legend> Login Details</legend>
		<div id="subdiv">
		<span id="component1"><label>Password</legend></span>
		<span  id="component2"><input id="pass1"  onchange="CheckSame()" name="password" type="password" required="required"></span>
		<span id="component3"><input id="pass2" onchange="CheckSame()" name="" type="password" required="required"></span>
		<span id="errmsg"></span>
	</div>
	</fieldset>
		<p>
		<input onclick="CheckSame()" id="submitt" type="submit" value="Sign up">
		</p>
	</fieldset>
</div>
</div>
	<div class="background-wrap">
<video id="video-bg-elem" preload="auto" autoplay="true" loop="loop" muted="muted">
<source src="doctor.mp4" type="video/mp4">
video not supported
</video>
</div>
</body>
</html>
