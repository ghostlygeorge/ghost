<?php
require_once("doctor.php");
require_once("patient.php");
require_once("secr.php");
	
	$type = filter_input(INPUT_POST,"user_type");
	$name = filter_input(INPUT_POST,"name");
	$gender = filter_input(INPUT_POST,"gender");
	$identity = filter_input(INPUT_POST,"idnumber");
	$expertees = filter_input(INPUT_POST,"specialty");
	$tel = filter_input(INPUT_POST,"phonenumber");
	$email = filter_input(INPUT_POST,"email");
	$dobirth = filter_input(INPUT_POST,"birthday");
	$pass = filter_input(INPUT_POST,"password");
	$user_name = "";
	if($type=="doctor"){
		$user  = new Doctor($name,$identity,$tel,$email,$gender,$dobirth,$expertees);
	}else if($type=="Secretary"){
		$user = new Secretary($name,$identity,$tel,$email,$gender,$dobirth);	
	}else{
		$user = new Patient($name,$identity,$tel,$email,$gender,$dobirth);
	}
	$user->serialize(sha1($pass));
	try{
		$userq = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
		$userq->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
		$username = $userq->query("SELECT registration FROM users WHERE name LIKE '$name' ORDER BY userID DESC LIMIT 1");
		$user_name = $username->fetchColumn();
	}catch(PDOException $e){
		print "ERROR: ".$e->getMessage();
	}
	session_start();
	session_regenerate_id();
	$_SESSION['SESS_USERNAME'] = $user_name;
	session_write_close();
	header("location:home.php");
?>
