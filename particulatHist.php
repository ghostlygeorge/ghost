<?php
$patID = $_GET['patientID'];
try{
	$data = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
	$getInfus = $data->query("SELECT userID from patients WHERE patientID = '$patID'");
	$uid = $getInfus->fetchColumn();
	$painf = $data->query("SELECT name,dobirth,gender,telephone,email FROM users WHERE userID = '$uid' ");
	print "<table border=2px width=60%><tr><td><strong><font color=red>Personal Data</font></strong></td><td></td></tr>";
	while($att = $painf->fetch(PDO::FETCH_ASSOC)){
		print "<tr><td><em>Name</em></td><td>".$att["name"]."</td></tr>";
		print "<tr><td><em>Date of Birth</em></td><td>".$att["dobirth"]."</td></tr>";
		print "<tr><td><em>gender</td><td></em>".$att["gender"]."</td></tr>";
		print "<tr><td><em>Telephone</em></td><td>".$att["telephone"]."</td></tr>";
		print "<tr><td><em>Email</td><td></em>".$att["email"]."</td></tr>";
	}
	print "</table><br><br>";
	$dataq = $data->query("SELECT treatmentName,date FROM treatment where patientID = '$patID' ORDER BY date DESC");
	print "These results are presorted by Date from the latest ";
	print "<table border=2px width=60%><tr><td><font color=red>Date of Treatment</font></td><td>Service Provided</td></tr>";
	while($arr = $dataq->fetch(PDO::FETCH_ASSOC)){
		print "<tr><td>".$arr['date']."</td><td>".$arr['treatmentName']."</td></tr>";
	}

}catch(PDOException $e){
	print $e->getMessage();
}
?>
