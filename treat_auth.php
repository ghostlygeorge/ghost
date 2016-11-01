<?php
$treat = $_GET['procedure'];
$patid = $_GET['patientIDitem'];
$dat = date("Y-m-d",strtotime('today'));
try{
	$patcon = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
	$patcon->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
	$pats = $patcon->prepare("INSERT INTO treatment VALUES (null,'$patid','$treat','$dat')");

	$pats->execute();
}catch(PDOException $E){
	print $E->getMessage();
}
header("location:home.php");
?>
