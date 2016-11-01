
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
		<h2>Appointments</h2>
		<p> This section Provides Relevant Appointments For you today</p>
	</div>

	<div id="content_information">
		<br>
		<!--use ajax instead for better interactivity-->
			<?php
				session_start();
				$user = $_SESSION['SESS_USERNAME'];
				try{
					$datacon = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
					$datacon->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
					$res = $datacon->query("SELECT name FROM users WHERE  registration = '$user'");
					$resul =  $res->fetchColumn();
					print "Showing Todays Appointments for <strong><em>Dr.".$resul."</strong></em><br><br>";
					$newd = date("Y-m-d",strtotime("today"));
					print "<br><table border=2px width=70%><tr><td>Patient Name</td><td>date</td><td>patientID</td>";
					$reas = $datacon->query("SELECT patientID,apptDate FROM appointment WHERE doctorName = '$resul' AND apptDate= '$newd'");
					while($arr = $reas->fetch(PDO::FETCH_ASSOC)){
						$itr = $arr['patientID'];
						//print $itr;
						//print $arr['patientID'];
						$patNam = $datacon->query("SELECT name FROM PatientView WHERE patientID = '$itr'");
						$nam = $patNam->fetchColumn();
						//print $nam;
						print "<tr><td>".$nam."</td><td>".$arr['apptDate']."</td><td>".$arr['patientID']."</td></tr>";
					}
				}catch(PDOException $e){
					print $e->getMessage();
				
				}
			?>
	</div>
</body>
</html>
