<?php

require_once("user.php");

class Doctor extends SysUser{
	protected $REG_HEADER = "DOC";
	protected $specialty;

	public function __construct($name,$idnum,$telno,$email,$gender,$dob,$specialty){
		parent::__construct($name,$idnum,$telno,$email,$gender,$dob);
		$this->setSpecialty($specialty);
	}

	protected function setSpecialty($proffession){
		$this->specialty = $proffession;
	}

	public function getSpecialty(){
		return $this->specialty;
	}
	public function toHtml(){
		parent::toHtml();
		print "Your login Identification is {$this->buildRegString(rand(0,100))}";
	}

	public function serialize($password_hash){
		parent::serialize($password_hash);
		try{
			$conn =new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
			$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
			$pat = $conn->prepare("INSERT INTO doctors VALUES (null,:userid,:specialty)");
			$pat->bindParam(':userid',$this->REG_KEY);
			$pat->bindParam(':specialty',$this->getSpecialty());
			$pat->execute();
			//$conn->close();
		}catch(PDOException $e){
			print "<br>";
		echo "ERROR ".$e->getMessage();
		}
	}
}
	//$Geff = new Doctor("Geoffrey",32811923,722401413,"ggwaks@yahoo.com","Male","Dentist");
	//$ree = $Geff->buildRegString(088);
	//print $ree;
	//print "\n";
	//$Geff->
