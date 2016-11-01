
<!DOCTYPE html>
<html>
<head>
	<title>Finance Editor</title>
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
		<h2>Add Payment</h2>
		<p>Select a patient to Add Payment information</p>
	</div>

	<div id="content_information">
		<p>Enter the Amount</p>
		<br>
	<form method="GET" action="fin_auth.php">
		<!--use ajax instead for better interactivity-->
		<select name="procedure" id="proclist">
			<script type="text/javascript">
				$.getJSON("treatment.json",null,processJsonResultselect);
				function processJsonResultselect(data,textStatus){
					for (name in data){
						var pet = data[name];
						for (detail in pet){
							$("#proclist").append($('<option/>',{value:pet[detail],
												text:detail}));
						}
					}
				}
			</script>
		</select>
		<select name="patientIDitem">
<?php
try{
	$patcon = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
	$patcon->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
	$pats = $patcon->query("SELECT name,patientID FROM users,patients WHERE patients.userID = users.userID");
	while($items = $pats->fetch(PDO::FETCH_ASSOC)){
		print "<option value={$items['patientID']}>".$items['name']."</option>";
	}

}catch(PDOException $e){
	print $e->getMessage();
}
			
		?>
		</select>
		<input type="number" name="paid_amount" min="100"/>
		<input type="submit" />
	</form>
	</div>
</body>
</html>
