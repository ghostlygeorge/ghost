<!DOCTYPE html>
<html>
<head>
	<title>Your History</title>
<body>
	<div id="content_title">
		<h2>Appointment History</h2>
		<p> All Made Appointments will be displayed here</p>
	</div>
	<div id="content_information">
		<table width="80%" border="1px solid green" border-radius=".8em">
		<tr>
		<td><strong><em>Doctors name</strong></em></td>
		<td><strong><em>Date Assigned</strong></em></td>
		</tr>
<?php
session_start();
$user = $_SESSION['SESS_USERNAME'];
$count  = 0;
	try{
		$app_con = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
		$app_con->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
			$ex = $app_con->query("SELECT userID FROM users WHERE registration LIKE '$user'");
			//$userID = $ex->fetchColumn();
			while($arr = $ex->fetch(PDO::FETCH_ASSOC)){
				$userID = $arr['userID'];		
			}
			$ex = $app_con->query("SELECT patientID FROM patients WHERE userID = '$userID'");
			//$userID = $ex->fetchColumn();
			while($arr = $ex->fetch(PDO::FETCH_ASSOC)){
				$userIDa = $arr['patientID'];		
			}

			$appts = $app_con->query("SELECT doctorName,apptDate FROM appointment WHERE appointment.patientID = '$userIDa' ORDER BY apptDate DESC ");
			while($res = $appts->fetch(PDO::FETCH_ASSOC)){
				echo "<tr>";
				echo "<td>";
				echo "Dr. ".$res["doctorName"];
				echo"</td>";
				echo "<td>";
				echo $res["apptDate"];
				echo "</td>";
				echo "</tr>";
				$count++;
			}	
			print "You Have made <strong><em>$count</strong></em> Appointments Here <br><br>";
			print "These are Presorted from the Latest Appointment you have Made";
	}catch(PDOException $e){
		print $e->getMessage();
	}	
?>
	</table>
	</div>
</body>
</html>
