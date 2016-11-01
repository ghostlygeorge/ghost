<?php



?>


<!DOCTYPE html>
<html>
<head>
	<title>Make Payment</title>
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
		
		function dbfetch(){
			var patId = $("#patID").val();
			$("#patin").empty();
			$.get("particulatHist.php",{"patientID" :patId},processResultdb);
		}

		function processResultdb(data,textStatus){
			$("#patin").html("<br >"+ data );
		}
	</script>
</head>
<body>
	<div id="content_title">
		<h2>Treatment History</h2>
		<p> Pick patient to view Patient History</p>
	</div>

	<div id="content_information">
		<p>Enter the Amount</p>
		<br>
		<select name="patientIDitem" id="patID">
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
		<button onclick="dbfetch()">Get History</button>
		<div id="patin">
		</div>
	</form>
	</div>
</body>
</html>
