
<?php
require_once("finance.php");
	session_start();
	$date = $_GET['procedure'];
	$doc = $_GET['paid_amount'];
	$pat_reg = $_GET['patientIDitem'];
	$userfin = new Finance($date,$doc);
	$userfin->serialize($pat_reg);
	print "The following Payment Details have been added to the Database";
	$userfin->toHtml();
	print "<a href='home.php'>Go back </a>";
	//header("location:home.php");
?>
