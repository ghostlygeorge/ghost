<!DOCTYPE html>
<html>
<head>
	<title>Make Appointment</title>
	<script type="text/javascript"
		src="jquery.js">
	</script>
	<script type="text/javascript"
		src="./jquery-ui-master/themes/base/core.css">
	</script>
	<script type="text/javascript"
src="./jquery-ui-master/themes/base/datepicker.css">
	</script>
	<script type="text/javascript"
		src="./jquery-ui-master/themes/base/all.css">
	</script>
	<script type="text/javascript"
src="./jquery-ui-master/ui/widgets/datepicker.js">
	</script>
	<script type="text/javascript">
		$(document).ready(function(){
				$('#datePicker').datepicker()
				$('input[type="text"]').css({'border':'none','border-radius':'.6em'});
		});
	</script>
</head>
<body>
	<div id="content_title">
		<h2>Create Appointment</h2>
		<p> Insert date you would wish for your appointment</p>
	</div>

	<div id="content_information">
		<p>Enter the Date you wish for the appointment</p>
		<p>Please Ensure The Date is  valid </p>
		<br>
	<form method="GET" action="app_auth.php">
		<!--use ajax instead for better interactivity-->
		<input type="text" name="appt_date" id="datePicker" />
		<select name="Doctors">
			<?php
				try{
					$datacon = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
					$datacon->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
					$res = $datacon->query("SELECT names FROM DoctView");
					$res->setFetchMode(PDO::FETCH_ASSOC);
					foreach($res as $row){
						foreach($row as $name=>$value){
							if($value != "" || $value!= NULL){
							print "<option value=$value>Dr. $value<option>\n";
							}
						}
					}
				}catch(PDOException $e){
				
				}
			?>
		</select>
		<input type="submit" />
	</form>
	</div>
</body>
</html>
