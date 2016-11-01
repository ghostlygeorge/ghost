<?php
	
?>


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
		<h2>Add History</h2>
		<p>  Add New service done on a patient into the Database for Serialization</p>
	</div>

	<div id="content_information">
		<br>
	<form method="GET" action="treat_auth.php">
		<!--use ajax instead for better interactivity-->
		<select name="procedure" id="proclist">
			<script type="text/javascript">
				$.getJSON("treatment.json",null,processJsonResultselect);
				function processJsonResultselect(data,textStatus){
					for (name in data){
						var pet = data[name];
						for (detail in pet){
							$("#proclist").append($('<option/>',{value:detail,
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
	$pats = $patcon->query("SELECT * FROM PatientView");
	while($items = $pats->fetch(PDO::FETCH_ASSOC)){
		print "<option value={$items['patientID']}>".$items['name']."</option>";
	}

}catch(PDOException $e){
	print $e->getMessage();
}
			
		?>
		</select>
		<input type="submit" />
	</form>
	</div>
</body>
</html>
