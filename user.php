<?php
class SysUser
{
	protected $name;
	protected $date_of_birth;
	protected $telno;
	protected $email;
	protected $idnumber;
	protected $gender;
	protected $dateofbirth;
	protected $REG_HEADER = "ROOT";
	protected $REG_KEY = 0;

	public function __construct($name,$idnum,$telno,$email,$gender,$dob)
	{
		$this->setName($name);
		$this->setIdNumber($idnum);
		$this->setTelno($telno);
		$this->setEmail($email);
		$this->setGender($gender);
		$this->setDateOfBirth($dob);
		$this->setRegK(1);
	}
	public function setDateOfBirth($the_date){
		$this->dateofbirth = date("Y-m-d",strtotime($the_date));
	}

	public function getDateOfBirth(){
		return $this->dateofbirth;
	}

	public function getRegK(){
		return $this->REG_KEY;
	}

	public function setRegK($rr){
		$this->REG_KEY = $rr;
	}

	public function getSqlCompatDate(){
		$sql_date = $this->getDateOfBirth();
		//$sql_date = $sql_date->format('Y-m-d');
		return $sql_date;	
	}

	public  function buildRegString($idnum){
		return $this->REG_HEADER.'/'.$idnum.'/'.date('y');
	}

	public function getGender(){
		return $this->gender;
	}

	public function setGender($the_gender){
		$this->gender = $the_gender;
	}

	public function getIdNumber(){
		return $this->idnumber;
	}

	public function setIdNumber($the_id){
		$this->idnumber = $the_id;
	}
	public function getname(){
		return $this->name;
	}

	public function setName($new_name){
		$this->name = $new_name;
	}

	public function getEmail(){
		return $this->email;
	}

	public function setEmail($new_email)
	{
		$this->email = $new_email;
	}

	public function getTelno(){
		return $this->telno;
	}

	public function setTelno($new_tel){
		$this->telno = $new_tel;
	}

	
	public function serialize($password_hash){
		//open a connection to the database
		//insert the relevant values into the database and relate them
		//note userID should be rekated to one in the Doctor 
		//Date of Birth serialization causing issues
		try{
			$conn =new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
			$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
			$get_last_id = $conn->query("SELECT userID FROM users ORDER BY userID DESC LIMIT 1");
			//$get_last_id->setFetchMode(PDO::FETCH_ASSOC);
			while($arr = $get_last_id->fetch(PDO::FETCH_ASSOC)){
				$this->setRegK($arr['userID']+1);
			}
			//$this->setRegK($get_last_id->fetchColumn() + 1);
			$stat = $conn->prepare("INSERT INTO users VALUES (null,:name,:dob,:pass,:gender,:tel,:email,:reg,:natId)");
			$stat->bindParam(':name',$this->getname());
			$stat->bindParam(':dob',$this->getSqlCompatDate());
			$stat->bindParam(':pass',$password_hash);
			$stat->bindParam(':gender',$this->getGender());
			$stat->bindParam('tel',$this->getTelno());
			$stat->bindParam('email',$this->getEmail());
			$stat->bindParam(':reg',$this->buildRegString($this->REG_KEY));
			$stat->bindParam(':natId',$this->getIdNumber());
			$stat->execute();
		}catch(PDOException $e){
			print "<br>";
		echo "ERROR ".$e->getMessage();
		}
	}
	//$Geff = new Doctor("Geoffrey",32811923,722401413,"ggwaks@yahoo.com","Male","Dentist");
	//$ree = $Geff->buildRegString(088);
	//print $ree;
	//print "\n";
	//$Geff->	
	public function toHtml(){
		print<<<__EOPATIENT__
			<h1>User Details</h1>
	<table border="2 solid aqua" style="width:80%">
		<tr>
		<td>Name</td>
		<td>{$this->getname()}</td>
		</tr>
		<tr>
		<td>ID Number</td>
		<td>{$this->getIdNumber()}
		<tr>
		<td>Telephone</td>
		<td>{$this->getTelno()}</td>
		</tr>
		<tr>
		<td>E-mail</td>	
		<td>{$this->getEmail()}</td>
		</tr>
		<tr>
		<td>Gender</td>
		<td>{$this->getGender()}</td>
		</tr>
		<tr>
		<td>Date Of Birth</td>
		<td>{$this->getSqlCompatDate()}</td>
		</tr>
	</table>
__EOPATIENT__;
	}
}
?>
