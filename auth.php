<?php 
//Start session
session_start();

//init errmsg array
$errmsg_arr = array();
//init err flag
$errflag = false;

function clean($str){
	$str = @trim($str);
	if(get_magic_quotes_gpc()){
		$str = stripslashes($str);
	}

	return mysql_real_escape_string($str);
}
//Sanitize POST values
//$table = filter_input(INPUT_POST,"person");
$username = clean($_POST['reg']);
$pass = clean($_POST['pass']);

if($username == ''){
	$errmsg_arr[] = 'Username Missing';
	$errflag = true;
}
if($pass == ''){
	//add err to session for collection and re-init session if im sure
	$_SESSION['ERRMSG_ARR'] = $errmsg_arr;
	$errflag = true;
}
if($errflag){
	session_write_close();
	header("location:login.php");
	exit();
}

//all went well now to query the database and populate environ session
try{
	$conn = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
	$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
	$auth_det_query = $conn->query("SELECT password_sha1 FROM users WHERE registration = '$username' ");
	//$auth_det_query->bindParam(':signup',$signup);
	$hash = $auth_det_query->fetchColumn();
	$sha1pass = sha1($pass);
	if(sha1($pass) == $hash){
		print "\nSucces Login Succesful Welcome";
		session_regenerate_id();
		$_SESSION['SESS_USERNAME'] = $username;
		session_write_close();
		header("location:home.php");
		exit();
	}else{
		$errmsg_arr[] = 'False Credentials for ' . $username . ' or Nonexistent ';
		$errflag = true;
		if($errflag){
			$_SESSION['ERRMSG_ARR'] = $errmsg_arr;
			session_write_close();
			header("location:login.php");
		}
	}
	}catch(PDOException $e){
		print "<br>";
		echo "Error: " . $e->getMessage();
	}
?>

