<?php
	require_once("patient.php");
	$name = filter_input(INPUT_POST,"name");
	$gender = filter_input(INPUT_POST,"gender");
	$identity = filter_input(INPUT_POST,"idnumber");
	$tel = filter_input(INPUT_POST,"phonenumber");
	$email = filter_input(INPUT_POST,"email");
	$user  = new Patient($name,$identity,$tel,$email,$gender);
	$user->toHtml();
?>

