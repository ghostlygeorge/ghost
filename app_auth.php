<?php
require_once("appointment.php");
	session_start();
	$date = $_GET['appt_date'];
	$doc = $_GET['Doctors'];
	$pat_reg = $_SESSION['SESS_USERNAME'];
	$appt = new appointment();
	$appt->setDate($date);
	try{
			$conn = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
			$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
			$ex = $conn->query("SELECT userID FROM users WHERE registration LIKE '$pat_reg'");
			$userID = $ex->fetchColumn();
			$patientID = $conn->query("SELECT patientID FROM patients WHERE patients.userID  = '$userID' ");
			$patientIDret = $patientID->fetchColumn();
			$appt->serialize($patientIDret,$doc);
		}catch(PDOException $e){
			print "<br>";
			echo "ERROR: ".$e->getMessage();
	}

	$appt->toHtml();
	header("location:home.php");
?>
