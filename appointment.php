<?php

class Appointment
{
	//add Date Manipulation private methods here
	//make setDAte overloaded to accept different inputs
	//checking of working hourse
	protected $appt_date;

	public function __construct(){
		$this->setDate("today");	
	}

	public function getDate(){
		return $this->appt_date;
	}

	public function setDate($newDateCastableObject){
		$this->appt_date = date("Y-m-d",strtotime($newDateCastableObject));
	}

	public function toHtml(){
		print "Appointment created for ".$this->getDate() . "<br>";
	}

	public function serialize($patient_id,$doc){
		try{
			$conn = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
			$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
			$ex = $conn->prepare("INSERT INTO appointment VALUES (null,:patid,:date,:doc)");
			$ex->bindParam(':patid',$patient_id);
			$ex->bindParam(':date',$this->getDate());
			$ex->bindParam(':doc',$doc);
			$ex->execute();
		}catch(PDOException $e){
			print "<br>";
			echo "ERROR: ".$e->getMessage();
		}
}
}
?>
