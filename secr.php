<?php

require_once("user.php");

class Secretary extends SysUser{
	protected $REG_HEADER = "SEC";

	public function __construct($name,$idnum,$telno,$email,$gender,$dob){
		parent::__construct($name,$idnum,$telno,$email,$gender,$dob);
	}

	public function addPayment($treatment,$amount){
		//to be implemented
	}

	public function report(){
	
	}

	public function serialize($password_hash){
		parent::serialize($password_hash);
		try{
			$conn =new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
			$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
			$pat = $conn->prepare("INSERT INTO secretary VALUES (null,:userid)");
			$pat->bindParam(':userid',$this->REG_KEY);
			$pat->execute();
			//$conn->close();
		}catch(PDOException $e){
			print "<br>";
		echo "ERROR ".$e->getMessage();
	}
	}
}
?>
