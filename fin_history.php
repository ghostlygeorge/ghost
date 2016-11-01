
<?php
session_start();
$user = $_SESSION['SESS_USERNAME'];
?>


<!DOCTYPE html>
<html>
<head>
	<title>Payment Made</title>
<body>
	<div id="content_title">
		<h2>Payment History</h2>
		<p> All Made Payments will be displayed here</p>
	</div>
	<div id="content_information">
		<table width="80%" border="1px solid green" border-radius=".8em">
		<tr>
		<td><strong><em>Date of Pay</strong></em></td>
		<td><strong><em>Amount Paid</strong></em></td>
		<td></strong><em>Balance</strong></em></td>
		</tr>
<?php
	$total_bal = 0;
	try{
		$app_con = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
		$app_con->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
			$ex = $app_con->query("SELECT userID FROM users WHERE registration LIKE '$user'");
			$userID = $ex->fetchColumn();
			$ex = $app_con->query("SELECT patientID FROM patients WHERE userID = '$userID'");
			$userIDa = $ex->fetchColumn();
			$appts = $app_con->query("SELECT date,paid,balance FROM finance WHERE patientID LIKE '$userIDa' ORDER BY date DESC ");
			while($res = $appts->fetch(PDO::FETCH_ASSOC)){
				echo "<tr>";
				echo "<td>";
				echo $res["date"];
				echo"</td>";
				echo "<td>";
				echo $res["paid"];
				echo "</td>";
				echo "<td>";
				echo $res["balance"];
				echo "</td>";
				echo "</tr>";
				$total_bal += $res["balance"];
			}	
			print "The Total pending Balance is <strong><em>Ksh. $total_bal</em></strong>  <br> <br>";
	}catch(PDOException $e){
		print $e->getMessage();
	}	
			
?>
	</table>
	</div>
</body>
</html>
