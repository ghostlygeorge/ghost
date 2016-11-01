<?php
	require_once("user.php");
	require_once("appointment.php");
class Patient extends SysUser
{
	//makeAppointMents
	//perhaps reschedule
	//payments
	//balances
	protected $type;
	protected $appointments = array();
	protected $patient_type = array();
	protected $REG_HEADER = "PAT";
	public function __construct($name,$idnum,$telno,$email,$gender,$dob,$type="OUT"){
		parent::__construct($name,$idnum,$telno,$email,$gender,$dob);
		$this->patient_type["IN"] = "IN_PATIENT";
		$this->patient_type["OUT"] = "OUT_PATIENT";
		$this->setType($type);
	}

	public function setType($new_Type){
		$this->type = $this->patient_type[$new_Type];
	}

	public function getType(){
		return $this->type;
	}

	public function makeAppointMent($doctor,$time){
		//TO BE IMPLEMENTED
		//adds to the global array of appointments
		//will be serialized in the serializer
		$appt = new Appointment();
		$appt->setDate($time);
		$this->appointments[$doctor] = $appt;
	}

	public function getAppointments(){
		return $this->appointments;
	}

	public function serialize($password_hash){
		parent::serialize($password_hash);
		try{
			$conn =new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
			$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
			$pat = $conn->prepare("INSERT INTO patients VALUES (null,:userid,:specialty)");
			$pat->bindParam(':userid',$this->getRegK());
			$pat->bindParam(':specialty',$this->getType());
			$pat->execute();
		}catch(PDOException $e){
			print "<br>";
			echo "ERROR ".$e->getMessage();
		}
	}
}
	//$preto = new Patient("Pretorius",242141433,72322142442,"pret@gmail.com","Male");
	//$re = $preto->buildRegString(141);
	//$preto->makeAppointMent("Harry","tomorrow");
	//$preto->makeAppointMent("George","next week");
	//$preto->getAppointments();
	//print $re;
	//print "\n";
	//$preto->toHtml();
	//print $preto->getType();
?>
